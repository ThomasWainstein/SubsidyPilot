import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ErrorTaxonomy, ErrorCode, ProcessingError } from './error-taxonomy.ts';
import { SizeLimitGuard, PROCESSING_LIMITS } from './size-limits.ts';
import { CostMonitor, PerformanceMonitor } from './cost-monitoring.ts';

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
    const errorText = await response.text();
    console.error('OAuth2 token request failed:', errorText);
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
  }
  
  const tokenData = await response.json();
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

        // Create or update extraction record
        const extractionId = await ensureExtractionRecord(job);
        console.log(`📊 Using extraction ${extractionId} for job ${job.id}`);

        // Process through real stages
        await processDocumentPipeline(job, extractionId);
        
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
            { jobId: job.id, documentId: job.document_id }
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

async function ensureExtractionRecord(job: any): Promise<string> {
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
        processing_method: 'enhanced-pipeline'
      }
    })
    .select('id')
    .single();

  if (error) throw error;
  return newExtraction.id;
}

async function processDocumentPipeline(job: any, extractionId: string) {
  const stages = [
    { name: 'downloading', progress: 10, handler: downloadDocument },
    { name: 'ocr-extraction', progress: 25, handler: performOCR },
    { name: 'classification', progress: 40, handler: classifyDocument },
    { name: 'structured-extraction', progress: 65, handler: extractStructuredData },
    { name: 'validation', progress: 85, handler: validateExtraction },
    { name: 'finalization', progress: 100, handler: finalizeExtraction }
  ];

  let processingContext = {
    job,
    extractionId,
    fileBuffer: null,
    extractedText: '',
    documentType: job.document_type || 'unknown',
    confidence: 0,
    structuredData: {},
    processingTier: 'fast',
    retryCount: 0
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
            { stage: stage.name, jobId: job.id }
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
                { stage: stage.name, jobId: job.id, retryAttempt: processingContext.retryCount }
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
  console.log(`📥 Downloading document: ${context.job.file_url}`);
  
  try {
    const response = await fetch(context.job.file_url);
    if (!response.ok) {
      const error = ErrorTaxonomy.createError(
        ErrorCode.FILE_DOWNLOAD_FAILED,
        new Error(`HTTP ${response.status}: ${response.statusText}`),
        { url: context.job.file_url, status: response.status }
      );
      throw error;
    }
    
    const fileBuffer = await response.arrayBuffer();
    console.log(`✅ Downloaded ${fileBuffer.byteLength} bytes`);
    
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
        { sizeAnalysis }
      );
      throw error;
    }
    
    // Log warnings
    if (sizeAnalysis.warnings.length > 0) {
      console.log(`⚠️ Processing warnings:`, sizeAnalysis.warnings);
    }
    
    // For now, continue with sync processing but log if async would be better
    if (SizeLimitGuard.shouldUseAsyncProcessing(sizeAnalysis)) {
      console.log(`🚨 RECOMMENDATION: Document should use async processing for optimal performance`);
      console.log(`📝 ${SizeLimitGuard.getProcessingRecommendation(sizeAnalysis)}`);
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
        { quotaCheck, costBreakdown }
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
      { url: context.job.file_url }
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
      { required: 'GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY' }
    );
    throw error;
  }
  
  if (!projectId) {
    const error = ErrorTaxonomy.createError(
      ErrorCode.AUTH_SERVICE_ACCOUNT_INVALID,
      new Error('Google Cloud Project ID not configured'),
      { required: 'GOOGLE_CLOUD_PROJECT_ID' }
    );
    throw error;
  }

  try {
    const startTime = Date.now();
    const isPDF = context.job.file_name?.toLowerCase().endsWith('.pdf');
    
    // Parse service account credentials
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
      console.log(`🔑 Service account parsed: ${credentials.client_email}`);
    } catch (parseError) {
      const error = ErrorTaxonomy.createError(
        ErrorCode.AUTH_SERVICE_ACCOUNT_INVALID,
        parseError,
        { serviceAccountKeyLength: serviceAccountKey?.length }
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
    
    // Validate base64 is not empty
    if (!base64Data || base64Data.length === 0) {
      const error = ErrorTaxonomy.createError(
        ErrorCode.ENCODING_FAIL,
        new Error('Base64 conversion resulted in empty string'),
        { originalSize: uint8Array.length }
      );
      throw error;
    }
    
    // Get OAuth2 access token using service account
    const accessToken = await getAccessToken(credentials);
    console.log(`🔐 Access token obtained: ${accessToken ? 'YES' : 'NO'}`);
    
    let response;
    const requestPayload = {
      requests: [{
        inputConfig: {
          content: base64Data,
          mimeType: isPDF ? 'application/pdf' : 'image/jpeg'
        },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION' }
        ]
      }]
    };
    
    console.log(`📋 Request payload preview:`, {
      mimeType: requestPayload.requests[0].inputConfig.mimeType,
      contentLength: base64Data.length,
      features: requestPayload.requests[0].features
    });
    
    if (isPDF) {
      // Use files:annotate endpoint for PDFs
      console.log(`📄 Processing PDF with files:annotate endpoint using service account auth`);
      response = await fetch(`https://vision.googleapis.com/v1/files:annotate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestPayload)
      });
    } else {
      // Use images:annotate endpoint for image files
      console.log(`🖼️ Processing image with images:annotate endpoint using service account auth`);
      response = await fetch(`https://vision.googleapis.com/v1/images:annotate`, {
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
    }

    if (!response.ok) {
      let errorDetails = '';
      let errorCode = ErrorCode.VISION_API_ERROR;
      
      try {
        const errorResponse = await response.json();
        errorDetails = JSON.stringify(errorResponse, null, 2);
        console.error(`❌ Google Vision API error response:`, errorDetails);
      } catch (e) {
        errorDetails = await response.text();
        console.error(`❌ Google Vision API error text:`, errorDetails);
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
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          endpoint: isPDF ? 'files:annotate' : 'images:annotate'
        }
      );
      throw error;
    }

    const data = await response.json();
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

    // Try to extract text from fullTextAnnotation first
    if (data.responses?.[0]?.fullTextAnnotation?.text) {
      extractedText = data.responses[0].fullTextAnnotation.text;
      confidence = 0.9;
      console.log(`✅ Full text extraction successful: ${extractedText.length} characters`);
    } 
    // Fallback to textAnnotations
    else if (data.responses?.[0]?.textAnnotations?.[0]?.description) {
      extractedText = data.responses[0].textAnnotations[0].description;
      confidence = 0.8;
      console.log(`✅ Text annotations extraction: ${extractedText.length} characters`);
    }
    else {
      console.log(`⚠️ No text detected in document`);
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

async function extractStructuredData(context: any) {
  console.log(`🤖 Extracting structured data using ${context.processingTier} tier`);
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const schema = DOCUMENT_SCHEMAS[context.documentType] || DOCUMENT_SCHEMAS['certificate'];
  const tier = PROCESSING_TIERS[context.processingTier];
  
  const extractionPrompt = `Extract structured data from this ${context.documentType} document. Return only valid JSON matching this schema:

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
        { role: 'system', content: 'You are a precise data extractor. Output only valid JSON with confidence scores.' },
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

    const structuredData = JSON.parse(jsonMatch[0]);
    
    // Calculate overall confidence based on field confidences
    const fieldConfidences = Object.values(structuredData)
      .map((field: any) => field.confidence || 0)
      .filter(conf => conf > 0);
    
    const avgConfidence = fieldConfidences.length > 0 
      ? fieldConfidences.reduce((a, b) => a + b, 0) / fieldConfidences.length
      : 0.3;

    console.log(`✅ Structured data extracted with confidence: ${avgConfidence}`);
    
    return { 
      ...context, 
      structuredData,
      confidence: Math.max(context.confidence, avgConfidence)
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