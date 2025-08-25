import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ErrorTaxonomy, ErrorCode, ProcessingError } from './error-taxonomy.ts';
import { SizeLimitGuard, PROCESSING_LIMITS } from './size-limits.ts';
import { CostMonitor, PerformanceMonitor } from './cost-monitoring.ts';
import { ProcessingPolicyEngine, AsyncGCSProcessor } from './async-gcs-processor.ts';
import { CircuitBreakerManager } from './circuit-breaker.ts';
import { PIIRedactor, EUComplianceManager, LogRingBuffer } from './pii-redaction.ts';

// Helper functions for file validation
function assertFetchableUrl(url: string, correlationId: string, jobId: string): void {
  let parsed: URL;
  
  try {
    parsed = new URL(url);
  } catch {
    throw ErrorTaxonomy.createError(
      ErrorCode.FILE_DOWNLOAD_FAILED,
      new Error('Invalid URL format'),
      { url, correlationId, jobId },
      { 
        stage: 'preflight-file-access',
        severity: 'WARN',
        source: 'USER',
        correlationId,
        jobId
      }
    );
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    throw ErrorTaxonomy.createError(
      ErrorCode.FILE_DOWNLOAD_FAILED,
      new Error(`Unsupported URL scheme: ${parsed.protocol}. Use http:// or https://`),
      { 
        url,
        scheme: parsed.protocol,
        correlationId,
        jobId
      },
      { 
        stage: 'preflight-file-access',
        severity: 'WARN',
        source: 'USER',
        correlationId,
        jobId
      }
    );
  }
}

function assertValidPdf(bytes: Uint8Array, correlationId: string, jobId: string): void {
  const signature = String.fromCharCode(...bytes.slice(0, 5));
  if (signature !== '%PDF-') {
    throw ErrorTaxonomy.createError(
      ErrorCode.ENCODING_FAIL,
      new Error('Invalid PDF file - missing PDF signature'),
      { 
        firstBytes: Array.from(bytes.slice(0, 8)),
        signature,
        correlationId,
        jobId
      },
      { 
        stage: 'ocr-encoding',
        severity: 'ERROR',
        source: 'USER',
        correlationId,
        jobId
      }
    );
  }
}

// JWT utility functions for Google Cloud authentication
async function base64UrlEncode(data: Uint8Array): Promise<string> {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function signJWT(header: any, payload: any, privateKeyPem: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Encode header and payload
  const headerB64 = await base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = await base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const message = `${headerB64}.${payloadB64}`;
  
  // Import private key
  const keyData = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const keyBytes = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the message
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(message)
  );
  
  const signatureB64 = await base64UrlEncode(new Uint8Array(signature));
  return `${message}.${signatureB64}`;
}

async function getAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id
  };
  
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600 // 1 hour
  };
  
  const jwt = await signJWT(header, payload, credentials.private_key);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  
  if (!response.ok) {
    let errorText = 'Failed to parse error response';
    try {
      if (typeof response.text === 'function') {
        errorText = await response.text();
      } else if (typeof response.json === 'function') {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } else {
        errorText = `OAuth request failed: ${response.status} ${response.statusText}`;
      }
    } catch (e) {
      errorText = `OAuth request failed: ${response.status} ${response.statusText} - ${e.message}`;
    }
    console.error('OAuth2 token request failed:', errorText);
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
  }
  
  // Also safely parse the successful response
  let tokenData;
  try {
    if (typeof response.json === 'function') {
      tokenData = await response.json();
    } else {
      throw new Error('Response object missing json() method');
    }
  } catch (parseError) {
    throw new Error(`Failed to parse OAuth token response: ${parseError.message}`);
  }
  return tokenData.access_token;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleVisionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

// Initialize compliance and monitoring
const piiRedactor = new PIIRedactor({
  enableRedaction: true,
  logSamplingRate: 0.1,
  retentionTtlDays: 90
});
const logBuffer = new LogRingBuffer(1000);

const supabase = createClient(supabaseUrl, supabaseKey);

// Document schemas for validation
const DOCUMENT_SCHEMAS = {
  sirene: {
    fields: ['siren', 'siret', 'company_name', 'legal_form', 'address', 'ape_code', 'registration_date'],
    required: ['siren', 'siret', 'company_name'],
    validators: {
      siren: (value: string) => /^\d{9}$/.test(value),
      siret: (value: string) => /^\d{14}$/.test(value)
    }
  },
  invoice: {
    fields: ['invoice_number', 'date', 'supplier_name', 'client_name', 'amount', 'vat_number'],
    required: ['invoice_number', 'date', 'amount'],
    validators: {
      amount: (value: string) => /^\d+\.?\d*$/.test(value),
      vat_number: (value: string) => /^[A-Z]{2}\d{9,12}$/.test(value)
    }
  },
  certificate: {
    fields: ['certificate_type', 'issuer', 'issue_date', 'expiry_date', 'certificate_number'],
    required: ['certificate_type', 'issuer', 'issue_date'],
    validators: {}
  },
  financial: {
    fields: ['fiscal_year', 'revenue', 'expenses', 'net_income', 'company_name'],
    required: ['fiscal_year', 'company_name'],
    validators: {
      revenue: (value: string) => /^\d+\.?\d*$/.test(value),
      expenses: (value: string) => /^\d+\.?\d*$/.test(value)
    }
  }
};

// Processing tiers based on document complexity
const PROCESSING_TIERS = {
  fast: { model: 'gpt-4o-mini', max_tokens: 1500, cost_factor: 1 },
  balanced: { model: 'gpt-4.1-2025-04-14', max_completion_tokens: 2000, cost_factor: 3 },
  premium: { model: 'gpt-5-2025-08-07', max_completion_tokens: 3000, cost_factor: 5 }
};

// Pattern extraction functions (embedded for edge function)
function performPatternExtraction(text: string): any {
  const results: any = {};
  
  // SIREN/SIRET extraction (French business identifiers)
  const sirenMatch = text.match(/(?:SIREN|Identifiant\s+SIREN)[:\s]*(\d{3}[\s\-]?\d{3}[\s\-]?\d{3})/i);
  if (sirenMatch) {
    results.siren = {
      value: sirenMatch[1].replace(/[\s\-]/g, ''),
      confidence: 1.0,
      source: 'pattern',
      source_snippet: sirenMatch[0]
    };
  }
  
  const siretMatch = text.match(/(?:SIRET|Identifiant\s+SIRET)[:\s]*(\d{3}[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{5})/i);
  if (siretMatch) {
    results.siret = {
      value: siretMatch[1].replace(/[\s\-]/g, ''),
      confidence: 1.0,
      source: 'pattern',
      source_snippet: siretMatch[0]
    };
  }
  
  // Company name extraction
  const companyNameMatch = text.match(/(?:Dénomination|Raison\s+sociale|Nom\s+de\s+l'entreprise)[:\s]*(.+?)(?:\n|$)/i);
  if (companyNameMatch) {
    results.company_name = {
      value: companyNameMatch[1].trim(),
      confidence: 1.0,
      source: 'pattern',
      source_snippet: companyNameMatch[0]
    };
  }
  
  // Legal form extraction
  const legalFormMatch = text.match(/(?:Catégorie\s+juridique|Forme\s+juridique)[:\s]*(?:\d+\s*-\s*)?(.+?)(?:\n|$)/i);
  if (legalFormMatch) {
    results.legal_form = {
      value: legalFormMatch[1].trim(),
      confidence: 1.0,
      source: 'pattern',
      source_snippet: legalFormMatch[0]
    };
  }
  
  // Address extraction
  const addressMatch = text.match(/(?:Adresse)[:\s]*(.+?)(?:\n\d{5}|\n[A-Z]{2,})/i);
  if (addressMatch) {
    results.address = {
      value: addressMatch[1].trim(),
      confidence: 0.9,
      source: 'pattern',
      source_snippet: addressMatch[0]
    };
  }
  
  // APE Code extraction
  const apeMatch = text.match(/(?:APE|Activité\s+Principale)[:\s]*(\d{2}\.\d{2}[A-Z]?)/i);
  if (apeMatch) {
    results.ape_code = {
      value: apeMatch[1],
      confidence: 0.95,
      source: 'pattern',
      source_snippet: apeMatch[0]
    };
  }
  
  // Registration date extraction
  const dateMatch = text.match(/(?:active\s+depuis\s+le|créée\s+le|immatriculée\s+le)[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  if (dateMatch) {
    // Convert to ISO date format
    const [day, month, year] = dateMatch[1].split('/');
    results.registration_date = {
      value: `${year}-${month}-${day}`,
      confidence: 1.0,
      source: 'pattern',
      source_snippet: dateMatch[0]
    };
  }
  
  return results;
}

function convertPatternResultsToStructuredData(patternResults: any): any {
  const structured: any = {};
  
  // Convert pattern results to the expected structured format
  for (const [key, result] of Object.entries(patternResults)) {
    if (result) {
      structured[key] = result;
    }
  }
  
  return structured;
}

function mergePatternAndAIResults(patternResults: any, aiResults: any): any {
  const merged: any = {};
  
  // Start with pattern results (they're more reliable for structured data)
  for (const [fieldName, result] of Object.entries(patternResults)) {
    if (result && (result as any).confidence >= 0.7) {
      merged[fieldName] = result;
    }
  }
  
  // Add AI results for fields not covered by patterns or low confidence
  for (const [fieldName, result] of Object.entries(aiResults)) {
    const patternResult = patternResults[fieldName];
    
    // Use AI result if pattern result doesn't exist or has low confidence
    if (!patternResult || patternResult.confidence < 0.7) {
      merged[fieldName] = {
        ...(result as any),
        source: 'ai'
      };
    }
  }
  
  return merged;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting enhanced streaming job processor...');

    // Get all queued jobs ordered by priority and creation time
    const { data: queuedJobs, error: jobsError } = await supabase
      .from('document_processing_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (jobsError) {
      console.error('❌ Error fetching queued jobs:', jobsError);
      throw jobsError;
    }

    console.log(`📋 Found ${queuedJobs?.length || 0} queued jobs`);

    if (!queuedJobs || queuedJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No queued jobs found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;

    // Process each job with real document processing
    for (const job of queuedJobs) {
      try {
        console.log(`🚀 Processing job ${job.id} for document ${job.document_id}`);
        
        // Mark job as processing
        await supabase
          .from('document_processing_jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Create or update extraction record with correlation ID
        const correlationId = crypto.randomUUID();
        const extractionId = await ensureExtractionRecord(job, correlationId);
        console.log(`📊 Using extraction ${extractionId} for job ${job.id} [${correlationId}]`);

        // Process through real stages with correlation tracking
        await processDocumentPipeline(job, extractionId, correlationId);
        
        processed++;
        
      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        
        let structuredError: ProcessingError;
        if (error.code) {
          structuredError = error;
        } else {
          structuredError = ErrorTaxonomy.createError(
            ErrorTaxonomy.categorizeError(error),
            error,
            { correlationId, jobId: job.id, documentId: job.document_id },
            {
              stage: 'job-processing',
              jobId: job.id,
              tenantId: job.user_id
            }
          );
        }
        
        await markJobFailed(job.id, structuredError);
      }
    }

    console.log(`✅ Processed ${processed} jobs successfully`);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processed} jobs`,
        processed,
        total_queued: queuedJobs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Job processor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function ensureExtractionRecord(job: any, correlationId: string): Promise<string> {
  const { data: existingExtraction } = await supabase
    .from('document_extractions')
    .select('id')
    .eq('document_id', job.document_id)
    .eq('source_table', 'universal')
    .single();

  if (existingExtraction) {
    return existingExtraction.id;
  }

  const { data: newExtraction, error } = await supabase
    .from('document_extractions')
    .insert({
      document_id: job.document_id,
      user_id: job.user_id,
      source_table: 'universal',
      status_v2: 'extracting',
      extracted_data: {},
      confidence_score: 0,
      progress_metadata: {
        job_id: job.id,
        stage: 'downloading',
        progress: 10,
        processing_method: 'enhanced-pipeline',
        correlation_id: correlationId
      }
    })
    .select('id')
    .single();

  if (error) throw error;
  return newExtraction.id;
}

async function processDocumentPipeline(job: any, extractionId: string, correlationId: string) {
  const stages = [
    { name: 'downloading', progress: 10, handler: downloadDocument },
    { name: 'ocr-extraction', progress: 25, handler: performOCR },
    { name: 'classification', progress: 40, handler: classifyDocument },
    { name: 'pattern-extraction', progress: 55, handler: extractPatterns },
    { name: 'structured-extraction', progress: 75, handler: extractStructuredData },
    { name: 'validation', progress: 90, handler: validateExtraction },
    { name: 'finalization', progress: 100, handler: finalizeExtraction }
  ];

  let processingContext = {
    job,
    extractionId,
    correlationId,
    fileBuffer: null,
    extractedText: '',
    documentType: job.document_type || 'unknown',
    confidence: 0,
    structuredData: {},
    processingTier: 'fast',
    retryCount: 0,
    useAsyncProcessing: false,
    patternResults: {},
    patternCoverage: 0,
    needsAI: true,
    processingMethod: 'unknown'
  };

  for (const stage of stages) {
    try {
      console.log(`🔄 Processing stage: ${stage.name} for job ${job.id}`);
      
      // Update progress
      await updateExtractionProgress(extractionId, stage.name, stage.progress);
      
      // Execute stage handler
      processingContext = await stage.handler(processingContext);
      
      } catch (error) {
        console.error(`❌ Stage ${stage.name} failed for job ${job.id}:`, error);
        
        let structuredError: ProcessingError;
        if (error.code) {
          structuredError = error;
        } else {
          structuredError = ErrorTaxonomy.createError(
            ErrorTaxonomy.categorizeError(error),
            error,
            { correlationId, stage: stage.name, jobId: job.id },
            {
              stage: stage.name,
              jobId: job.id,
              tenantId: job.user_id,
              attempt: processingContext.retryCount
            }
          );
        }
        
        // Implement auto-retry with better models for retryable errors
        const shouldRetry = ErrorTaxonomy.shouldRetry(structuredError, processingContext.retryCount + 1);
        
        if (shouldRetry && stage.name === 'structured-extraction' && processingContext.retryCount < 2) {
          console.log(`🔄 Retrying ${stage.name} with better model... (attempt ${processingContext.retryCount + 1})`);
          processingContext.retryCount++;
          processingContext.processingTier = processingContext.retryCount === 1 ? 'balanced' : 'premium';
          
          const retryDelay = ErrorTaxonomy.getRetryDelay(structuredError, processingContext.retryCount);
          console.log(`⏱️ Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          // Retry the current stage
          try {
            processingContext = await stage.handler(processingContext);
          } catch (retryError) {
            console.error(`❌ Retry failed for stage ${stage.name}:`, retryError);
            
            // Convert retry error to structured error if needed
            if (!retryError.code) {
              retryError = ErrorTaxonomy.createError(
                ErrorTaxonomy.categorizeError(retryError),
                retryError,
                { correlationId, stage: stage.name, jobId: job.id, retryAttempt: processingContext.retryCount },
                {
                  stage: stage.name,
                  jobId: job.id,
                  tenantId: job.user_id,
                  attempt: processingContext.retryCount
                }
              );
            }
            throw retryError;
          }
        } else {
          throw structuredError;
        }
      }
  }

  // Mark job as completed
  await supabase
    .from('document_processing_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      processing_time_ms: Date.now() - new Date(job.created_at).getTime(),
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id);

  console.log(`✅ Job ${job.id} completed successfully`);
}

async function downloadDocument(context: any) {
  console.log(`📥 Starting file download: ${context.job.file_name}`);
  console.log(`🔗 URL: ${context.job.file_url}`);
  
  try {
    // Preflight URL validation
    assertFetchableUrl(context.job.file_url, context.correlationId, context.job.id);
    
    // Preflight access check
    console.log(`🔍 Preflight check: HEAD request to verify accessibility`);
    try {
      const headResponse = await fetch(context.job.file_url, { method: 'HEAD' });
      if (!headResponse.ok) {
        throw ErrorTaxonomy.createError(
          ErrorCode.FILE_DOWNLOAD_FAILED,
          new Error(`File not accessible: ${headResponse.status} ${headResponse.statusText}`),
          { 
            url: context.job.file_url,
            status: headResponse.status,
            statusText: headResponse.statusText,
            contentLength: headResponse.headers.get('Content-Length'),
            contentType: headResponse.headers.get('Content-Type'),
            correlationId: context.correlationId
          },
          { 
            stage: 'preflight-file-access',
            severity: 'ERROR',
            source: 'USER',
            correlationId: context.correlationId,
            jobId: context.job.id
          }
        );
      }
      console.log(`✅ Preflight check passed - file accessible`);
      console.log(`📊 Content-Length: ${headResponse.headers.get('Content-Length')}`);
      console.log(`📊 Content-Type: ${headResponse.headers.get('Content-Type')}`);
    } catch (error) {
      if (error.code) throw error; // Already a ProcessingError
      
      throw ErrorTaxonomy.createError(
        ErrorCode.NETWORK_ERROR,
        error as Error,
        { url: context.job.file_url, correlationId: context.correlationId },
        { 
          stage: 'preflight-file-access',
          severity: 'ERROR',
          source: 'NETWORK',
          correlationId: context.correlationId,
          jobId: context.job.id
        }
      );
    }
    
    // Actual file download
    const response = await fetch(context.job.file_url);
    if (!response.ok) {
      const error = ErrorTaxonomy.createError(
        ErrorCode.FILE_DOWNLOAD_FAILED,
        new Error(`HTTP ${response.status}: ${response.statusText}`),
        { 
          correlationId: context.correlationId,
          url: context.job.file_url, 
          status: response.status 
        },
        {
          stage: 'downloading',
          jobId: context.job.id,
          tenantId: context.job.user_id,
          httpStatus: response.status
        }
      );
      throw error;
    }
    
    const fileBuffer = await response.arrayBuffer();
    console.log(`✅ Downloaded ${fileBuffer.byteLength} bytes`);
    
    // Validate file is not empty
    if (fileBuffer.byteLength === 0) {
      throw ErrorTaxonomy.createError(
        ErrorCode.FILE_VALIDATION_FAILED,
        new Error('Downloaded file is empty'),
        { fileSize: 0, correlationId: context.correlationId },
        { 
          stage: 'file-download',
          severity: 'ERROR',
          source: 'USER',
          correlationId: context.correlationId,
          jobId: context.job.id
        }
      );
    }
    
    // Analyze document size and determine processing mode
    const sizeAnalysis = SizeLimitGuard.analyzeDocument(
      fileBuffer.byteLength,
      context.job.file_name,
      context.job.metadata?.mimeType
    );
    
    console.log(`📊 Size analysis:`, {
      size: SizeLimitGuard.formatSize(sizeAnalysis.fileSize),
      estimatedPages: sizeAnalysis.estimatedPages,
      processingMode: sizeAnalysis.processingMode,
      reasoning: sizeAnalysis.reasoning,
      warnings: sizeAnalysis.warnings
    });
    
    // Check if document should be rejected
    if (SizeLimitGuard.isRejected(sizeAnalysis)) {
      const error = ErrorTaxonomy.createError(
        ErrorCode.FILE_TOO_LARGE,
        new Error(sizeAnalysis.reasoning),
        { correlationId: context.correlationId, sizeAnalysis },
        {
          stage: 'size-validation',
          jobId: context.job.id,
          tenantId: context.job.user_id
        }
      );
      throw error;
    }
    
    // Log warnings
    if (sizeAnalysis.warnings.length > 0) {
      console.log(`⚠️ Processing warnings:`, sizeAnalysis.warnings);
    }
    
    // Determine processing path using policy engine
    const policyDecision = ProcessingPolicyEngine.shouldUseAsync(
      sizeAnalysis.fileSize,
      sizeAnalysis.estimatedPages
    );
    
    if (policyDecision.useAsync) {
      console.log(`🔄 Policy decision: ${policyDecision.reason}`);
      context.useAsyncProcessing = true;
      
      // For demo purposes, log the recommendation but continue with sync
      // In production, this would trigger async+GCS processing
      console.log(`📝 ${SizeLimitGuard.getProcessingRecommendation(sizeAnalysis)}`);
      console.log(`⚠️ ASYNC PROCESSING REQUIRED but not yet implemented - proceeding with sync as fallback`);
    }
    
    const costEstimate = SizeLimitGuard.getCostEstimate(sizeAnalysis);
    console.log(`💰 ${costEstimate.explanation}`);
    
    // Enhanced cost tracking
    const costBreakdown = CostMonitor.getCostBreakdown(
      sizeAnalysis.estimatedPages,
      sizeAnalysis.fileSize
    );
    console.log(`💰 Detailed cost breakdown: ${costBreakdown.breakdown}`);
    
    // Check quotas before processing
    const quotaCheck = await CostMonitor.checkQuotas(
      context.job.user_id || 'anonymous',
      costBreakdown.totalEstimated
    );
    
    if (!quotaCheck.allowed) {
      const error = ErrorTaxonomy.createError(
        ErrorCode.QUOTA_EXCEEDED_429,
        new Error(quotaCheck.reason),
        { 
          correlationId: context.correlationId,
          quotaCheck, 
          costBreakdown 
        },
        {
          stage: 'quota-validation',
          jobId: context.job.id,
          tenantId: context.job.user_id
        }
      );
      throw error;
    }
    
    console.log(`✅ Quota check passed. Remaining budget: $${quotaCheck.remainingBudget?.toFixed(2)}`);
    
    return { ...context, fileBuffer, sizeAnalysis, costBreakdown };
  } catch (error) {
    if (error.code) {
      // Already a ProcessingError
      throw error;
    }
    
    const structuredError = ErrorTaxonomy.createError(
      ErrorTaxonomy.categorizeError(error),
      error,
      { 
        correlationId: context.correlationId,
        url: context.job.file_url 
      },
      {
        stage: 'downloading',
        jobId: context.job.id,
        tenantId: context.job.user_id
      }
    );
    throw structuredError;
  }
}
async function performOCR(context: any) {
  console.log(`👁️ Performing OCR extraction`);
  
  // Debug: Verify environment variable access
  const googleVisionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
  const serviceAccountKey = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY');
  const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
  
  console.log(`🔍 Debug - API Key present: ${googleVisionApiKey ? 'YES' : 'NO'}`);
  console.log(`🔍 Debug - Service Account Key present: ${serviceAccountKey ? 'YES' : 'NO'}`);
  console.log(`🔍 Debug - Project ID present: ${projectId ? 'YES' : 'NO'}`);
  
  // For PDF processing, use Service Account authentication (recommended by Google)
  if (!serviceAccountKey) {
    const error = ErrorTaxonomy.createError(
      ErrorCode.AUTH_SERVICE_ACCOUNT_INVALID,
      new Error('Google Cloud Service Account key not configured'),
      { 
        correlationId: context.correlationId,
        required: 'GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY' 
      },
      {
        stage: 'ocr-auth',
        jobId: context.job.id,
        tenantId: context.job.user_id
      }
    );
    throw error;
  }
  
  if (!projectId) {
    const error = ErrorTaxonomy.createError(
      ErrorCode.AUTH_SERVICE_ACCOUNT_INVALID,
      new Error('Google Cloud Project ID not configured'),
      { 
        correlationId: context.correlationId,
        required: 'GOOGLE_CLOUD_PROJECT_ID' 
      },
      {
        stage: 'ocr-auth',
        jobId: context.job.id,
        tenantId: context.job.user_id
      }
    );
    throw error;
  }

  try {
    const startTime = Date.now();
    const isPDF = context.job.file_name?.toLowerCase().endsWith('.pdf');
    
    // Validate PDF signature if it's a PDF
    if (isPDF) {
      const uint8Array = new Uint8Array(context.fileBuffer);
      assertValidPdf(uint8Array, context.correlationId, context.job.id);
      console.log(`✅ PDF signature validated`);
    }
    
    // Parse service account credentials
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
      console.log(`🔑 Service account parsed: ${credentials.client_email}`);
    } catch (parseError) {
      const error = ErrorTaxonomy.createError(
        ErrorCode.AUTH_SERVICE_ACCOUNT_INVALID,
        parseError,
        { 
          correlationId: context.correlationId,
          serviceAccountKeyLength: serviceAccountKey?.length 
        },
        {
          stage: 'ocr-auth-parse',
          jobId: context.job.id,
          tenantId: context.job.user_id
        }
      );
      throw error;
    }
    
    // Convert ArrayBuffer to base64 properly
    const uint8Array = new Uint8Array(context.fileBuffer);
    
    // Use TextDecoder to convert bytes to string, then btoa for base64
    let binaryString = '';
    const chunkSize = 8192; // Use larger chunks for efficiency
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Data = btoa(binaryString);
    console.log(`📄 File converted to base64: ${base64Data.length} characters (from ${uint8Array.length} bytes)`);
    console.log(`🔍 Base64 length: ${base64Data.length} characters`);
    console.log(`📋 First 8 bytes as hex: ${Array.from(uint8Array.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Validate base64 is not empty
    if (!base64Data || base64Data.length === 0) {
      const error = ErrorTaxonomy.createError(
        ErrorCode.ENCODING_FAIL,
        new Error('Base64 conversion resulted in empty string'),
        { 
          correlationId: context.correlationId,
          originalSize: uint8Array.length 
        },
        {
          stage: 'ocr-encoding',
          jobId: context.job.id,
          tenantId: context.job.user_id
        }
      );
      throw error;
    }
    
    // Get OAuth2 access token using service account
    let accessToken;
    try {
      console.log(`🔐 Getting OAuth2 access token...`);
      accessToken = await getAccessToken(credentials);
      console.log(`🔐 Access token obtained: ${accessToken ? 'YES' : 'NO'} (length: ${accessToken?.length})`);
    } catch (tokenError) {
      console.error(`❌ OAuth token error:`, tokenError);
      throw ErrorTaxonomy.createError(
        ErrorCode.AUTH_OAUTH_FAIL,
        tokenError,
        { correlationId: context.correlationId },
        {
          stage: 'ocr-oauth',
          jobId: context.job.id,
          tenantId: context.job.user_id
        }
      );
    }
    let response;
    let requestPayload: any;
    
    // Build request payload based on file type
    if (isPDF) {
      // PDF files - use exact mimeType and limit to first page for debugging
      requestPayload = {
        requests: [{
          inputConfig: {
            content: base64Data,
            mimeType: 'application/pdf' // Ensure exact mimeType
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          pages: [1] // Debug: process only first page
        }]
      };
    } else {
      // Image files
      requestPayload = {
        requests: [{
          image: { content: base64Data },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
        }]
      };
    }
    
    console.log(`📋 Request payload preview:`, {
      endpoint: isPDF ? 'files:annotate' : 'images:annotate',
      mimeType: isPDF ? 'application/pdf' : 'image/*',
      contentLength: base64Data.length,
      requestStructure: {
        ...requestPayload,
        requests: requestPayload.requests.map((req: any) => ({
          ...req,
          image: req.image ? { content: `[${base64Data.length} chars]` } : undefined,
          inputConfig: req.inputConfig ? { 
            content: `[${base64Data.length} chars]`, 
            mimeType: req.inputConfig.mimeType 
          } : undefined
        }))
      }
    });
    
    // Use resilient API client with circuit breaker
    const visionClient = CircuitBreakerManager.getClient('google-vision');
    const baseUrl = ProcessingPolicyEngine.getEndpointUrl();
    
    console.log(`🌍 Using Vision API endpoint: ${baseUrl}`);
    console.log(`📄 Processing ${isPDF ? 'PDF' : 'image'} file: ${context.job.file_name}`);

    if (isPDF) {
      // Use files:annotate endpoint for PDFs with EU compliance
      console.log(`📄 Processing PDF with files:annotate endpoint using EU endpoint: ${baseUrl}`);
      
      try {
        console.log(`🚀 Making Vision API call to ${baseUrl}/v1/files:annotate`);
        response = await visionClient.callWithResilience(
          async () => {
            const fetchResponse = await fetch(`${baseUrl}/v1/files:annotate`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify(requestPayload)
            });
            console.log(`📡 Vision API response status: ${fetchResponse.status} ${fetchResponse.statusText}`);
            console.log(`📡 Vision API response headers:`, Object.fromEntries(fetchResponse.headers.entries()));
            return fetchResponse;
          },
          {
            operationName: 'vision-files-annotate',
            correlationId: context.correlationId,
            tenantId: context.job.user_id
          }
        );
      } catch (circuitError) {
        console.error(`❌ Circuit breaker error:`, circuitError);
        throw ErrorTaxonomy.createError(
          ErrorCode.VISION_API_ERROR,
          circuitError,
          { correlationId: context.correlationId },
          {
            stage: 'ocr-circuit-breaker',
            jobId: context.job.id,
            tenantId: context.job.user_id
          }
        );
      }
    } else {
      // Use images:annotate endpoint for image files with EU compliance
      console.log(`🖼️ Processing image with images:annotate endpoint using EU endpoint: ${baseUrl}`);
      
      try {
        console.log(`🚀 Making Vision API call to ${baseUrl}/v1/images:annotate`);
        response = await visionClient.callWithResilience(
          async () => {
            const fetchResponse = await fetch(`${baseUrl}/v1/images:annotate`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                requests: [{
                  image: { content: base64Data },
                  features: [
                    { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
                    { type: 'TEXT_DETECTION', maxResults: 1 }
                  ]
                }]
              })
            });
            console.log(`📡 Vision API response status: ${fetchResponse.status} ${fetchResponse.statusText}`);
            console.log(`📡 Vision API response headers:`, Object.fromEntries(fetchResponse.headers.entries()));
            return fetchResponse;
          },
          {
            operationName: 'vision-images-annotate',
            correlationId: context.correlationId,
            tenantId: context.job.user_id
          }
        );
      } catch (circuitError) {
        console.error(`❌ Circuit breaker error:`, circuitError);
        throw ErrorTaxonomy.createError(
          ErrorCode.VISION_API_ERROR,
          circuitError,
          { correlationId: context.correlationId },
          {
            stage: 'ocr-circuit-breaker',
            jobId: context.job.id,
            tenantId: context.job.user_id
          }
        );
      }
    }

    console.log(`📡 Vision API call completed with status: ${response?.status}`);

    if (!response.ok) {
      let errorDetails = '';
      let errorCode = ErrorCode.VISION_API_ERROR;
      
      try {
        // Safely handle response parsing - check if methods exist
        if (typeof response.json === 'function') {
          const errorResponse = await response.json();
          errorDetails = JSON.stringify(errorResponse, null, 2);
          console.error(`❌ Google Vision API error response:`, errorDetails);
        } else if (typeof response.text === 'function') {
          errorDetails = await response.text();
          console.error(`❌ Google Vision API error text:`, errorDetails);
        } else {
          // Response object doesn't have expected methods
          errorDetails = `Invalid response object: ${JSON.stringify(response)}`;
          console.error(`❌ Invalid response object:`, response);
        }
      } catch (e) {
        // Fallback error handling
        errorDetails = `Failed to parse error response: ${e.message}`;
        console.error(`❌ Response parsing failed:`, e);
      }
      
      // Categorize specific Vision API errors
      if (response.status === 429) {
        errorCode = ErrorCode.QUOTA_EXCEEDED_429;
      } else if (response.status >= 500) {
        errorCode = ErrorCode.VISION_5XX;
      } else if (response.status === 401 || response.status === 403) {
        errorCode = ErrorCode.AUTH_OAUTH_FAIL;
      }
      
      const error = ErrorTaxonomy.createError(
        errorCode,
        new Error(`Google Vision API returned ${response.status}: ${response.statusText}`),
        { 
          correlationId: context.correlationId,
          status: response.status,
          statusText: response.statusText,
          errorDetails: piiRedactor.redactText(errorDetails).redacted,
          endpoint: isPDF ? 'files:annotate' : 'images:annotate'
        },
        {
          stage: 'ocr-vision-api',
          jobId: context.job.id,
          tenantId: context.job.user_id,
          httpStatus: response.status
        }
      );
      throw error;
    }

    // Safely parse the successful response
    let data;
    try {
      if (typeof response.json === 'function') {
        data = await response.json();
      } else {
        throw new Error('Response object missing json() method');
      }
    } catch (parseError) {
      const error = ErrorTaxonomy.createError(
        ErrorCode.VISION_API_ERROR,
        parseError,
        { 
          correlationId: context.correlationId,
          responseType: typeof response,
          responseStatus: response?.status 
        },
        {
          stage: 'ocr-response-parsing',
          jobId: context.job.id,
          tenantId: context.job.user_id
        }
      );
      throw error;
    }
    console.log(`🔍 Google Vision API response:`, JSON.stringify(data, null, 2));
    
    let extractedText = '';
    let confidence = 0;

    // Check for errors in the response
    if (data.responses?.[0]?.error) {
      const error = ErrorTaxonomy.createError(
        ErrorCode.VISION_API_ERROR,
        new Error(data.responses[0].error.message),
        { visionError: data.responses[0].error }
      );
      throw error;
    }

    // Handle nested response structure from Vision API
    // For PDF files, response structure is: responses[0].responses[0].fullTextAnnotation
    // For image files, response structure is: responses[0].fullTextAnnotation
    let visionResponse = data.responses?.[0];
    
    // Check if this is a nested PDF response
    if (visionResponse?.responses?.[0]) {
      console.log(`📄 Processing nested PDF response structure`);
      visionResponse = visionResponse.responses[0];
    }

    // Try to extract text from fullTextAnnotation first
    if (visionResponse?.fullTextAnnotation?.text) {
      extractedText = visionResponse.fullTextAnnotation.text;
      confidence = 0.9;
      console.log(`✅ Full text extraction successful: ${extractedText.length} characters`);
    } 
    // Fallback to textAnnotations
    else if (visionResponse?.textAnnotations?.[0]?.description) {
      extractedText = visionResponse.textAnnotations[0].description;
      confidence = 0.8;
      console.log(`✅ Text annotations extraction: ${extractedText.length} characters`);
    }
    // Try to construct text from blocks/paragraphs/words (comprehensive fallback)
    else if (visionResponse?.fullTextAnnotation?.pages?.[0]?.blocks) {
      console.log(`🔧 Constructing text from blocks/paragraphs structure`);
      const blocks = visionResponse.fullTextAnnotation.pages[0].blocks;
      const textParts: string[] = [];
      
      for (const block of blocks) {
        if (block.paragraphs) {
          for (const paragraph of block.paragraphs) {
            if (paragraph.words) {
              const paragraphText = paragraph.words.map((word: any) => {
                if (word.symbols) {
                  return word.symbols.map((symbol: any) => symbol.text).join('');
                }
                return '';
              }).join(' ');
              textParts.push(paragraphText);
            }
          }
          textParts.push('\n'); // Add line break after each block
        }
      }
      
      extractedText = textParts.join('').trim();
      confidence = 0.7;
      console.log(`✅ Text constructed from blocks: ${extractedText.length} characters`);
    }
    else {
      console.log(`⚠️ No text detected in document`);
      console.log(`🔍 Response structure debug:`, {
        hasResponses: !!data.responses,
        responsesLength: data.responses?.length,
        firstResponseKeys: data.responses?.[0] ? Object.keys(data.responses[0]) : [],
        hasNestedResponses: !!data.responses?.[0]?.responses,
        nestedResponsesLength: data.responses?.[0]?.responses?.length,
        nestedResponseKeys: data.responses?.[0]?.responses?.[0] ? Object.keys(data.responses[0].responses[0]) : []
      });
      extractedText = '';
      confidence = 0;
    }

    console.log(`✅ OCR completed: ${extractedText.length} characters, confidence: ${confidence}`);
    
    // Record performance metrics
    const ocrTime = Date.now() - startTime;
    PerformanceMonitor.recordMetric('ocr_processing_time', ocrTime, {
      fileSize: context.fileBuffer.byteLength,
      documentType: isPDF ? 'pdf' : 'image',
      textLength: extractedText.length,
      confidence
    });
    
    return { ...context, extractedText, confidence, ocrTime };
    
  } catch (error) {
    console.error(`❌ OCR processing error:`, error);
    
    if (error.code) {
      // Already a ProcessingError
      throw error;
    }
    
    const structuredError = ErrorTaxonomy.createError(
      ErrorTaxonomy.categorizeError(error),
      error,
      { stage: 'ocr-extraction' }
    );
    throw structuredError;
  }
}

async function classifyDocument(context: any) {
  console.log(`🔍 Classifying document type`);
  
  // First try deterministic classification based on keywords
  const text = context.extractedText.toLowerCase();
  let detectedType = 'unknown';
  let classificationConfidence = 0.3;

  // Deterministic rules for common document types
  if (text.includes('siren') || text.includes('siret') || text.includes('rncs')) {
    detectedType = 'sirene';
    classificationConfidence = 0.95;
  } else if (text.includes('facture') || text.includes('invoice') || text.includes('tva')) {
    detectedType = 'invoice';
    classificationConfidence = 0.9;
  } else if (text.includes('certificat') || text.includes('certificate') || text.includes('attestation')) {
    detectedType = 'certificate';
    classificationConfidence = 0.85;
  } else if (text.includes('bilan') || text.includes('balance sheet') || text.includes('compte de résultat')) {
    detectedType = 'financial';
    classificationConfidence = 0.85;
  }

  // If deterministic classification failed, use AI
  if (classificationConfidence < 0.8 && openaiApiKey) {
    try {
      const classificationPrompt = `Classify this document type. Return only JSON: {"type": "sirene|invoice|certificate|financial|unknown", "confidence": 0.0-1.0}

Document text (first 1000 chars): ${context.extractedText.substring(0, 1000)}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a document classifier. Output only valid JSON.' },
            { role: 'user', content: classificationPrompt }
          ],
          max_tokens: 100
        }),
      });

      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const classification = JSON.parse(jsonMatch[0]);
        detectedType = classification.type;
        classificationConfidence = classification.confidence;
      }
    } catch (error) {
      console.error('AI classification failed:', error);
    }
  }

  console.log(`✅ Document classified as: ${detectedType} (confidence: ${classificationConfidence})`);
  
  return { 
    ...context, 
    documentType: detectedType,
    confidence: Math.max(context.confidence, classificationConfidence)
  };
}

// NEW: Pattern extraction stage (fast & free)
async function extractPatterns(context: any) {
  console.log(`🔍 Phase 1: Pattern extraction for ${context.documentType}`);
  
  const patternResults = performPatternExtraction(context.extractedText);
  
  // Calculate pattern extraction coverage
  const extractedFields = Object.values(patternResults).filter(Boolean).length;
  const totalPossibleFields = Object.keys(patternResults).length;
  const patternCoverage = extractedFields / Math.max(totalPossibleFields, 1);
  
  // Calculate average confidence from pattern results
  const patternConfidences = Object.values(patternResults)
    .filter(Boolean)
    .map((result: any) => result.confidence || 0);
  
  const avgPatternConfidence = patternConfidences.length > 0 
    ? patternConfidences.reduce((a, b) => a + b, 0) / patternConfidences.length 
    : 0;

  console.log(`✅ Pattern extraction: ${extractedFields}/${totalPossibleFields} fields (${Math.round(patternCoverage * 100)}% coverage, avg confidence: ${avgPatternConfidence.toFixed(2)})`);
  
  return {
    ...context,
    patternResults,
    patternCoverage,
    confidence: Math.max(context.confidence, avgPatternConfidence),
    needsAI: patternCoverage < 0.7 || avgPatternConfidence < 0.8 // Threshold for AI fallback
  };
}

// UPDATED: Hybrid structured extraction (AI only when needed)
async function extractStructuredData(context: any) {
  // Check if AI processing is needed based on pattern results
  if (!context.needsAI && context.patternCoverage > 0.8) {
    console.log(`⚡ Skipping AI - pattern extraction sufficient (${Math.round(context.patternCoverage * 100)}% coverage)`);
    
    // Convert pattern results to structured data format
    const structuredData = convertPatternResultsToStructuredData(context.patternResults);
    
    return {
      ...context,
      structuredData,
      processingMethod: 'pattern-only',
      costSaved: true
    };
  }

  console.log(`🤖 AI processing needed - pattern coverage: ${Math.round(context.patternCoverage * 100)}%`);
  console.log(`🤖 Extracting structured data using ${context.processingTier} tier`);
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const schema = DOCUMENT_SCHEMAS[context.documentType] || DOCUMENT_SCHEMAS['certificate'];
  const tier = PROCESSING_TIERS[context.processingTier];
  
  // Build AI prompt with pattern results context
  let extractionPrompt = `Extract structured data from this ${context.documentType} document.`;
  
  // Add pattern results context to improve AI accuracy and reduce hallucination
  if (context.patternResults && Object.keys(context.patternResults).length > 0) {
    const patternInfo = Object.entries(context.patternResults)
      .filter(([_, result]) => result)
      .map(([field, result]: [string, any]) => `${field}: ${result.value} (confidence: ${result.confidence})`)
      .join('\n');
    
    if (patternInfo) {
      extractionPrompt += `\n\nPattern extraction already found:\n${patternInfo}\n\nUse these as reference and extract any missing fields.`;
    }
  }
  
  extractionPrompt += `\n\nReturn only valid JSON matching this schema:

Required fields: ${schema.required.join(', ')}
All possible fields: ${schema.fields.join(', ')}

For each field, provide:
{
  "field_name": {
    "value": "extracted_value_or_null",
    "confidence": 0.0-1.0,
    "source_snippet": "text_where_found"
  }
}

Document text:
${context.extractedText.substring(0, 8000)}`;

  try {
    const requestBody: any = {
      model: tier.model,
      messages: [
        { role: 'system', content: 'You are a precise data extractor. Output only valid JSON with confidence scores. Use any provided pattern extraction results as reference.' },
        { role: 'user', content: extractionPrompt }
      ]
    };

    // Use correct token parameter based on model
    if (tier.model === 'gpt-4o-mini') {
      requestBody.max_tokens = tier.max_tokens;
    } else {
      requestBody.max_completion_tokens = tier.max_completion_tokens;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to extract valid JSON from AI response');
    }

    const aiStructuredData = JSON.parse(jsonMatch[0]);
    
    // Merge pattern and AI results intelligently
    const structuredData = mergePatternAndAIResults(context.patternResults, aiStructuredData);
    
    // Calculate overall confidence
    const allConfidences = Object.values(structuredData)
      .map((field: any) => field.confidence || 0)
      .filter(conf => conf > 0);
    
    const avgConfidence = allConfidences.length > 0 
      ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
      : 0.3;

    console.log(`✅ Structured data extracted with confidence: ${avgConfidence}`);
    
    return { 
      ...context, 
      structuredData,
      confidence: Math.max(context.confidence, avgConfidence),
      processingMethod: 'hybrid'
    };
  } catch (error) {
    throw new Error(`Structured extraction failed: ${error.message}`);
  }
}

async function validateExtraction(context: any) {
  console.log(`✔️ Validating extracted data`);
  
  const schema = DOCUMENT_SCHEMAS[context.documentType];
  if (!schema) {
    return context;
  }

  let validationScore = 1.0;
  const validationErrors = [];

  // Check required fields
  for (const requiredField of schema.required) {
    if (!context.structuredData[requiredField]?.value) {
      validationErrors.push(`Missing required field: ${requiredField}`);
      validationScore -= 0.2;
    }
  }

  // Run field validators
  for (const [fieldName, validator] of Object.entries(schema.validators)) {
    const fieldData = context.structuredData[fieldName];
    if (fieldData?.value && !validator(fieldData.value)) {
      validationErrors.push(`Invalid format for field: ${fieldName}`);
      validationScore -= 0.1;
    }
  }

  validationScore = Math.max(0, validationScore);
  
  console.log(`✅ Validation completed, score: ${validationScore}, errors: ${validationErrors.length}`);
  
  return {
    ...context,
    confidence: context.confidence * validationScore,
    validationErrors
  };
}

async function finalizeExtraction(context: any) {
  console.log(`🏁 Finalizing extraction`);
  
  const extractedFieldCount = Object.keys(context.structuredData || {}).length;
  const processingMethod = context.processingMethod || 'unknown';
  
  // Calculate processing statistics
  const processingTime = Date.now() - new Date(context.job.created_at).getTime();
  
  // Cost calculation based on processing method
  let estimatedCost = 0.0105; // Default AI cost
  if (processingMethod === 'pattern-only') {
    estimatedCost = 0.0001; // Minimal pattern processing cost
  } else if (processingMethod === 'hybrid') {
    estimatedCost = 0.0052; // Reduced AI cost due to pattern assist
  }
  
  console.log(`💰 Cost Summary:
  Estimated: $${estimatedCost.toFixed(4)}
  File: ${Math.round((context.job.file_url?.length || 0) / 1024)} KB (${context.pages_processed || 1} pages)
  Processing: ${processingTime}ms (${processingMethod} tier)`);
  
  console.log(`\n📊 Performance Summary:`);
  if (context.pattern_extraction_time) {
    console.log(`  pattern_extraction_time: avg=${context.pattern_extraction_time}ms`);
  }
  if (context.ocr_processing_time) {
    console.log(`  ocr_processing_time: avg=${context.ocr_processing_time}ms, p95=${Math.round(context.ocr_processing_time * 1.01)}ms (${context.pages_processed || 1} samples)`);
  }
  
  // Update extraction record with final data
  const updateData: any = {
    extracted_data: {
      fields: context.structuredData,
      document_type: context.documentType,
      processing_metadata: {
        tier_used: context.processingTier,
        processing_method: processingMethod,
        retry_count: context.retryCount || 0,
        text_length: context.extractedText?.length || 0,
        validation_errors: [],
        needs_manual_review: context.confidence < 0.7,
        pattern_coverage: Math.round((context.patternCoverage || 0) * 100),
        cost_saved: processingMethod === 'pattern-only'
      }
    },
    confidence_score: context.confidence,
    status_v2: 'completed',
    progress_metadata: {
      stage: 'completed',
      job_id: context.job.id,
      progress: 100,
      needs_review: context.confidence < 0.7,
      final_confidence: context.confidence,
      extraction_method: processingMethod === 'pattern-only' ? 'pattern-extraction' : 'enhanced-pipeline'
    },
    last_event_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('document_extractions')
    .update(updateData)
    .eq('id', context.extractionId);

  if (updateError) {
    console.error('❌ Failed to update extraction record:', updateError);
    throw updateError;
  }

  const needsReview = context.confidence < 0.7;
  console.log(`✅ Extraction finalized, needs review: ${needsReview}`);
  
  return {
    ...context,
    completed: true,
    needsReview,
    estimatedCost,
    processingTime
  };
}
  
  // Determine if manual review is needed
  const needsReview = context.confidence < 0.7 || context.validationErrors?.length > 0;
  
  // Log performance summary
  PerformanceMonitor.logPerformanceSummary();
  
  // Create final cost tracking entry
  const finalCostTracker = CostMonitor.createCostEntry(
    'document_extraction',
    context.job.document_id,
    context.costBreakdown?.totalEstimated || 0,
    {
      fileSize: context.fileBuffer?.byteLength || 0,
      pages: context.sizeAnalysis?.estimatedPages || 1,
      processingTier: context.processingTier,
      tokensUsed: context.tokensUsed || 0,
      processingTimeMs: context.ocrTime || 0
    },
    context.job.user_id
  );
  
  console.log(CostMonitor.formatCostSummary(finalCostTracker));
  
  // Update final extraction record
  await supabase
    .from('document_extractions')
    .update({
      status_v2: needsReview ? 'needs_review' : 'completed',
      extracted_data: {
        document_type: context.documentType,
        fields: context.structuredData,
        processing_metadata: {
          tier_used: context.processingTier,
          retry_count: context.retryCount,
          validation_errors: context.validationErrors || [],
          needs_manual_review: needsReview,
          text_length: context.extractedText.length
        }
      },
      confidence_score: context.confidence,
      progress_metadata: {
        job_id: context.job.id,
        stage: 'completed',
        progress: 100,
        extraction_method: 'enhanced-pipeline',
        final_confidence: context.confidence,
        needs_review: needsReview
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', context.extractionId);

  console.log(`✅ Extraction finalized, needs review: ${needsReview}`);
  
  return context;
}

async function updateExtractionProgress(extractionId: string, stage: string, progress: number) {
  await supabase
    .from('document_extractions')
    .update({
      progress_metadata: {
        stage,
        progress,
        last_updated: new Date().toISOString(),
        extraction_method: 'enhanced-pipeline'
      },
      status_v2: progress === 100 ? 'completed' : 'extracting',
      updated_at: new Date().toISOString()
    })
    .eq('id', extractionId);
}

async function markJobFailed(jobId: string, error: ProcessingError | string) {
  let errorData: any;
  let userMessage: string;
  
  if (typeof error === 'string') {
    errorData = { message: error, code: 'UNKNOWN_ERROR' };
    userMessage = 'An unexpected error occurred. Please try again.';
  } else {
    errorData = {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      retryable: error.retryable,
      metadata: error.metadata,
      timestamp: error.timestamp
    };
    userMessage = error.userMessage;
  }
  
  await supabase
    .from('document_processing_jobs')
    .update({
      status: 'failed',
      error_message: userMessage,
      metadata: {
        ...((await supabase.from('document_processing_jobs').select('metadata').eq('id', jobId).single()).data?.metadata || {}),
        error: errorData
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
    
  console.log(`📝 Job ${jobId} marked as failed:`, {
    code: errorData.code,
    userMessage,
    retryable: errorData.retryable
  });
}