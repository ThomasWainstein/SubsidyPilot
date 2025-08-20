import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Processing configuration for different document types
const PROCESSING_CONFIG = {
  'eu-policy': {
    maxFileSize: 50 * 1024 * 1024, // 50MB for policy docs
    timeoutMs: 300000, // 5 minutes
    chunkSize: 2048, // Smaller chunks for complex docs
    processors: ['LAYOUT_PARSER_PROCESSOR', 'DOCUMENT_OCR_PROCESSOR'], // Skip form parser
    priority: 'high'
  },
  'farm-application': {
    maxFileSize: 20 * 1024 * 1024, // 20MB for applications
    timeoutMs: 180000, // 3 minutes
    chunkSize: 4096,
    processors: ['FORM_PARSER_PROCESSOR', 'LAYOUT_PARSER_PROCESSOR', 'DOCUMENT_OCR_PROCESSOR'],
    priority: 'medium'
  },
  'financial': {
    maxFileSize: 15 * 1024 * 1024,
    timeoutMs: 120000,
    chunkSize: 3072,
    processors: ['FORM_PARSER_PROCESSOR', 'DOCUMENT_OCR_PROCESSOR'],
    priority: 'high'
  },
  'default': {
    maxFileSize: 15 * 1024 * 1024,
    timeoutMs: 120000,
    chunkSize: 3072,
    processors: ['FORM_PARSER_PROCESSOR', 'LAYOUT_PARSER_PROCESSOR', 'DOCUMENT_OCR_PROCESSOR'],
    priority: 'medium'
  }
};

interface AsyncProcessingRequest {
  documentId: string;
  fileUrl: string;
  fileName: string;
  clientType: 'individual' | 'business' | 'municipality' | 'ngo' | 'farm';
  documentType?: string;
  userId?: string;
  priority?: 'low' | 'medium' | 'high';
  retryAttempt?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const requestData = await req.json() as AsyncProcessingRequest;
    console.log(`🚀 Starting async processing for ${requestData.fileName}`);

    // Determine processing configuration
    const docConfig = getProcessingConfig(requestData.fileName, requestData.documentType);
    console.log(`📋 Using config: ${docConfig.priority} priority, ${docConfig.processors.length} processors`);

    // Create processing job record
    const jobId = crypto.randomUUID();
    const { error: jobError } = await supabase
      .from('document_processing_jobs')
      .insert({
        id: jobId,
        document_id: requestData.documentId,
        file_url: requestData.fileUrl,
        file_name: requestData.fileName,
        client_type: requestData.clientType,
        document_type: requestData.documentType || 'unknown',
        user_id: requestData.userId,
        status: 'queued',
        priority: docConfig.priority,
        config: docConfig,
        retry_attempt: requestData.retryAttempt || 0,
        created_at: new Date().toISOString(),
        scheduled_for: new Date().toISOString()
      });

    if (jobError) {
      console.error('❌ Failed to create processing job:', jobError);
      throw new Error(`Failed to queue document processing: ${jobError.message}`);
    }

    // Start background processing (don't await)
    EdgeRuntime.waitUntil(processDocumentInBackground(jobId, requestData, docConfig, supabase));

    // Return immediate response
    return new Response(JSON.stringify({
      success: true,
      jobId,
      message: 'Document queued for async processing',
      estimatedCompletionTime: new Date(Date.now() + docConfig.timeoutMs).toISOString(),
      config: {
        priority: docConfig.priority,
        maxFileSize: `${Math.round(docConfig.maxFileSize / 1024 / 1024)}MB`,
        timeout: `${docConfig.timeoutMs / 1000}s`,
        processors: docConfig.processors.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Async processor initialization failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getProcessingConfig(fileName: string, documentType?: string) {
  const lowerFileName = fileName.toLowerCase();
  const lowerDocType = documentType?.toLowerCase() || '';

  // EU Policy documents
  if (lowerFileName.includes('eu') || lowerFileName.includes('policy') || 
      lowerFileName.includes('agricultural') || lowerDocType.includes('policy')) {
    return PROCESSING_CONFIG['eu-policy'];
  }

  // Farm applications
  if (lowerDocType === 'farm-application' || lowerFileName.includes('application')) {
    return PROCESSING_CONFIG['farm-application'];
  }

  // Financial documents
  if (lowerDocType === 'financial' || lowerFileName.includes('financial') || 
      lowerFileName.includes('invoice') || lowerFileName.includes('receipt')) {
    return PROCESSING_CONFIG['financial'];
  }

  return PROCESSING_CONFIG['default'];
}

async function processDocumentInBackground(
  jobId: string,
  requestData: AsyncProcessingRequest,
  config: any,
  supabase: any
) {
  const startTime = Date.now();
  let processingLog: string[] = [];
  
  try {
    console.log(`🔄 Background processing started for job ${jobId}`);
    processingLog.push(`Background processing started: ${new Date().toISOString()}`);

    // Update job status to processing
    await updateJobStatus(supabase, jobId, 'processing', { 
      started_at: new Date().toISOString(),
      processing_log: processingLog 
    });

    // Memory monitoring
    const initialMemory = Deno.memoryUsage();
    console.log(`💾 Initial memory: ${Math.round(initialMemory.heapUsed/1024/1024)}MB`);
    processingLog.push(`Initial memory: ${Math.round(initialMemory.heapUsed/1024/1024)}MB`);

    // File size and type validation
    await validateDocument(requestData.fileUrl, config, processingLog);

    // Process with timeout protection
    const processResult = await Promise.race([
      executeDocumentProcessing(requestData, config, processingLog, supabase),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Processing timeout after ${config.timeoutMs}ms`)), config.timeoutMs)
      )
    ]) as any;

    const totalTime = Date.now() - startTime;
    console.log(`✅ Background processing completed in ${totalTime}ms`);
    processingLog.push(`Processing completed in ${totalTime}ms`);

    // Update job with success
    await updateJobStatus(supabase, jobId, 'completed', {
      completed_at: new Date().toISOString(),
      processing_time_ms: totalTime,
      result: processResult,
      processing_log: processingLog,
      memory_peak: Math.round(Deno.memoryUsage().heapUsed/1024/1024)
    });

    // Update document extraction record
    if (processResult.success) {
      await supabase
        .from('document_extractions')
        .update({
          status: 'completed',
          extracted_data: processResult.extractedData,
          confidence_score: processResult.confidence,
          processing_time_ms: totalTime,
          model_used: processResult.method,
          debug_info: {
            async_processing: true,
            job_id: jobId,
            processing_log: processingLog.slice(-10), // Keep last 10 entries
            memory_usage: Math.round(Deno.memoryUsage().heapUsed/1024/1024)
          }
        })
        .eq('document_id', requestData.documentId);
    }

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Background processing failed after ${totalTime}ms:`, error);
    processingLog.push(`Processing failed: ${error.message}`);

    // Check if this is a retryable error
    const shouldRetry = shouldRetryError(error.message) && (requestData.retryAttempt || 0) < 3;

    if (shouldRetry) {
      const nextRetry = new Date(Date.now() + Math.pow(2, requestData.retryAttempt || 0) * 60000); // Exponential backoff
      console.log(`🔄 Scheduling retry for ${nextRetry.toISOString()}`);
      
      await updateJobStatus(supabase, jobId, 'retry_scheduled', {
        error_message: error.message,
        retry_scheduled_for: nextRetry.toISOString(),
        retry_attempt: (requestData.retryAttempt || 0) + 1,
        processing_log: processingLog
      });

      // Schedule retry (in a real system, this would be handled by a job scheduler)
      setTimeout(() => {
        EdgeRuntime.waitUntil(processDocumentInBackground(
          jobId, 
          { ...requestData, retryAttempt: (requestData.retryAttempt || 0) + 1 }, 
          config, 
          supabase
        ));
      }, Math.pow(2, requestData.retryAttempt || 0) * 60000);
      
    } else {
      await updateJobStatus(supabase, jobId, 'failed', {
        error_message: error.message,
        processing_time_ms: totalTime,
        processing_log: processingLog,
        final_failure: true
      });

      // Update document extraction with failure
      await supabase
        .from('document_extractions')
        .update({
          status: 'failed',
          error_message: error.message,
          processing_time_ms: totalTime,
          debug_info: {
            async_processing: true,
            job_id: jobId,
            processing_log: processingLog.slice(-10),
            final_failure: true
          }
        })
        .eq('document_id', requestData.documentId);
    }
  }
}

async function validateDocument(fileUrl: string, config: any, processingLog: string[]) {
  console.log('🔍 Validating document...');
  processingLog.push('Starting document validation');

  // Check file accessibility and size
  const response = await fetch(fileUrl, { method: 'HEAD' });
  if (!response.ok) {
    throw new Error(`Document not accessible: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const fileSize = parseInt(contentLength);
    if (fileSize > config.maxFileSize) {
      throw new Error(`File too large: ${Math.round(fileSize/1024/1024)}MB (max: ${Math.round(config.maxFileSize/1024/1024)}MB)`);
    }
    processingLog.push(`File size validated: ${Math.round(fileSize/1024/1024)}MB`);
  }

  console.log('✅ Document validation passed');
  processingLog.push('Document validation passed');
}

async function executeDocumentProcessing(
  requestData: AsyncProcessingRequest,
  config: any,
  processingLog: string[],
  supabase: any
) {
  console.log('🔄 Starting chunked document processing...');
  processingLog.push('Starting chunked processing');

  // Use the existing hybrid extraction but with better error handling
  try {
    const extractionResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/hybrid-ocr-extraction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        documentId: requestData.documentId,
        fileUrl: requestData.fileUrl,
        fileName: requestData.fileName,
        clientType: requestData.clientType,
        documentType: requestData.documentType,
        fallbackToOpenAI: false, // Let it try the full chain
        isTestDocument: false
      })
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      throw new Error(`Extraction failed: ${errorText}`);
    }

    const result = await extractionResponse.json();
    processingLog.push(`Extraction completed: ${result.success ? 'success' : 'failed'}`);
    
    return {
      success: result.success,
      extractedData: result.extractedData,
      confidence: result.confidence,
      method: result.extractionMethod || 'hybrid-async',
      textLength: result.textLength,
      tokensUsed: result.tokensUsed,
      processingTime: result.processingTime
    };

  } catch (error: any) {
    processingLog.push(`Chunked processing failed: ${error.message}`);
    throw error;
  }
}

async function updateJobStatus(supabase: any, jobId: string, status: string, metadata: any = {}) {
  const { error } = await supabase
    .from('document_processing_jobs')
    .update({
      status,
      updated_at: new Date().toISOString(),
      metadata: metadata
    })
    .eq('id', jobId);

  if (error) {
    console.error(`Failed to update job ${jobId} status to ${status}:`, error);
  }
}

function shouldRetryError(errorMessage: string): boolean {
  const retryableErrors = [
    'timeout',
    'network',
    'connection',
    'rate limit',
    'service unavailable',
    'internal server error'
  ];
  
  const lowerError = errorMessage.toLowerCase();
  return retryableErrors.some(keyword => lowerError.includes(keyword));
}

// Graceful shutdown handling
addEventListener('beforeunload', (ev) => {
  console.log('🛑 Function shutdown due to:', ev.detail?.reason);
  // Log any active processing jobs for recovery
});