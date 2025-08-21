import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AsyncDocumentProcessorRequest {
  documentId: string;
  fileUrl: string;
  fileName: string;
  clientType: string;
  documentType: string;
  userId?: string;
}

interface AsyncDocumentProcessorResponse {
  success: boolean;
  jobId: string;
  message: string;
  error?: string;
}

async function processDocumentInBackground(
  jobId: string,
  documentId: string,
  fileUrl: string,
  fileName: string,
  clientType: string,
  documentType: string,
  userId?: string
) {
  const processingStartTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  
  try {
    console.log(`[${requestId}] 🔄 Background processing started for job ${jobId}`);
    console.log(`[${requestId}] 📋 Processing parameters:`, {
      documentId,
      fileUrl,
      fileName,
      documentType,
      clientType,
      userId: userId || 'anonymous'
    });
    
    // Update job status to processing
    await supabase
      .from('document_processing_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Validate file URL accessibility before processing
    const fileSize = await getFileSize(fileUrl);
    console.log(`[${requestId}] 📏 File size: ${Math.round(fileSize / 1024 / 1024)}MB`);
    
    // Only block processing if file is completely inaccessible (0 bytes from HTTP URLs)
    if (fileSize === 0 && !fileUrl.startsWith('data:')) {
      console.error(`[${requestId}] ❌ HTTP file is not accessible - cannot process`);
      throw new Error(`File at URL ${fileUrl.substring(0, 100)}... is not accessible. Please check the file URL and permissions.`);
    }
    
    if (fileSize > 10 * 1024 * 1024) { // 10MB+
      console.log(`[${requestId}] ⏳ Large file detected, adding processing delay`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Call hybrid extraction for processing with detailed error tracking
    console.log(`[${requestId}] 🔄 Calling hybrid-extraction function`);
    const hybridResponse = await supabase.functions.invoke('hybrid-extraction', {
      body: {
        fileUrl,
        fileName,
        documentType,
        processingMode: 'async'
      }
    });

    console.log(`[${requestId}] 📝 Hybrid extraction response status:`, {
      hasError: !!hybridResponse.error,
      hasData: !!hybridResponse.data,
      status: hybridResponse.status
    });

    if (hybridResponse.error) {
      console.error(`[${requestId}] ❌ Hybrid extraction error details:`, {
        message: hybridResponse.error.message,
        code: hybridResponse.error.code,
        details: hybridResponse.error.details,
        status: hybridResponse.status
      });
      throw new Error(`Hybrid extraction failed: ${hybridResponse.error.message || JSON.stringify(hybridResponse.error)}`);
    }

    if (!hybridResponse.data) {
      console.error(`[${requestId}] ❌ No data returned from hybrid extraction:`, hybridResponse);
      throw new Error(`Hybrid extraction returned no data. Status: ${hybridResponse.status}`);
    }

    const hybridData = hybridResponse.data;
    console.log(`[${requestId}] ✅ Hybrid extraction successful: confidence ${hybridData.confidence}, method ${hybridData.method}`);
    
    // Store extraction results
    console.log(`[${requestId}] 💾 Storing extraction results`);
    const { error: extractionError } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        user_id: userId,
        extracted_data: hybridData.structuredData,
        confidence_score: hybridData.confidence,
        extraction_type: hybridData.method,
        ocr_metadata: hybridData.ocrMetadata,
        status: 'completed',
        model_used: hybridData.method === 'openai_fallback' ? 'gpt-4o-mini' : 'google_vision',
        processing_time_ms: hybridData.processingTime,
        session_id: jobId,
        triggered_by: 'async_processor'
      });

    if (extractionError) {
      console.error(`[${requestId}] ❌ Database insertion error:`, extractionError);
      throw extractionError;
    }

    const totalProcessingTime = Date.now() - processingStartTime;

    // Update job status to completed
    await supabase
      .from('document_processing_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        processing_time_ms: totalProcessingTime,
        metadata: {
          ...hybridData.ocrMetadata,
          confidence: hybridData.confidence,
          extractionMethod: hybridData.method,
          textLength: hybridData.extractedText.length,
          requestId
        }
      })
      .eq('id', jobId);

    console.log(`[${requestId}] ✅ Background processing completed for job ${jobId} in ${totalProcessingTime}ms`);

  } catch (error) {
    const totalProcessingTime = Date.now() - processingStartTime;
    console.error(`[${requestId}] ❌ Background processing failed for job ${jobId} at ${totalProcessingTime}ms:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Update job status to failed
    await supabase
      .from('document_processing_jobs')
      .update({ 
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
        processing_time_ms: totalProcessingTime
      })
      .eq('id', jobId);

    // Create failed extraction record for tracking
    await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        user_id: userId,
        extracted_data: {},
        confidence_score: 0,
        extraction_type: 'async_failed',
        status: 'failed',
        error_message: error.message,
        session_id: jobId,
        triggered_by: 'async_processor'
      });
  }
}

async function getFileSize(url: string): Promise<number> {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] 🔍 Checking file size for URL type: ${url.substring(0, 50)}...`);
  
  if (!url) {
    console.error(`[${requestId}] ❌ Empty URL provided to getFileSize`);
    return 0;
  }
  
  // Handle base64 data URLs
  if (url.startsWith('data:')) {
    console.log(`[${requestId}] 📦 Base64 data URL detected - estimating size`);
    try {
      // Estimate size from base64 data
      const base64Data = url.substring(url.indexOf(',') + 1);
      const estimatedSize = Math.floor((base64Data.length * 3) / 4);
      console.log(`[${requestId}] ✅ Base64 data estimated size: ${estimatedSize} bytes`);
      return estimatedSize;
    } catch (error) {
      console.error(`[${requestId}] ❌ Failed to estimate base64 size:`, error);
      return 1024; // Return 1KB as fallback for base64 data
    }
  }
  
  try {
    console.log(`[${requestId}] 📡 Making HEAD request to: ${url}`);
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Supabase-Edge-Function/1.0'
      }
    });
    
    console.log(`[${requestId}] 📊 HEAD response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.warn(`[${requestId}] ⚠️ HEAD request failed, trying GET request for size`);
      // Fallback to partial GET request
      try {
        const getResponse = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Supabase-Edge-Function/1.0',
            'Range': 'bytes=0-1023' // Only get first 1KB to check if accessible
          }
        });
        if (getResponse.ok) {
          const contentLength = getResponse.headers.get('content-length') || 
                               getResponse.headers.get('content-range')?.split('/')[1];
          const size = contentLength ? parseInt(contentLength, 10) : 1024;
          console.log(`[${requestId}] ✅ File accessible via GET, estimated size: ${size} bytes`);
          return size;
        }
      } catch (getFallbackError) {
        console.error(`[${requestId}] ❌ GET fallback also failed:`, getFallbackError);
      }
      return 0;
    }
    
    const contentLength = response.headers.get('content-length');
    const size = contentLength ? parseInt(contentLength, 10) : 1024; // Default to 1KB if unknown
    console.log(`[${requestId}] ✅ File size determined: ${size} bytes (${Math.round(size / 1024 / 1024)}MB)`);
    return size;
  } catch (error) {
    console.error(`[${requestId}] ❌ getFileSize error for URL ${url.substring(0, 100)}:`, {
      message: error.message,
      name: error.name
    });
    // For network errors, return 1KB to allow processing to continue
    return 1024;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Add debug endpoints for testing
  const url = new URL(req.url);
  if (url.searchParams.get('test') === 'health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      service: 'async-document-processor',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      supabase: {
        url: supabaseUrl ? 'configured' : 'missing',
        serviceKey: supabaseServiceKey ? 'configured' : 'missing'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { documentId, fileUrl, fileName, clientType, documentType, userId }: AsyncDocumentProcessorRequest = await req.json();
    const requestId = crypto.randomUUID().slice(0, 8);

    console.log(`[${requestId}] 🔄 Creating async processing job for document ${documentId}`);

    // Validate input
    if (!documentId || !fileUrl || !fileName || !clientType || !documentType) {
      throw new Error('Missing required parameters: documentId, fileUrl, fileName, clientType, documentType');
    }

    // Determine priority based on file size and type
    const fileSize = await getFileSize(fileUrl);
    const priority = fileSize > 50 * 1024 * 1024 ? 'high' : 'normal'; // High priority for files > 50MB
    console.log(`[${requestId}] 📏 File size: ${Math.round(fileSize / 1024 / 1024)}MB, priority: ${priority}`);

    // Create job record
    const { data: jobData, error: jobError } = await supabase
      .from('document_processing_jobs')
      .insert({
        document_id: documentId,
        user_id: userId,
        file_url: fileUrl,
        file_name: fileName,
        client_type: clientType,
        document_type: documentType,
        status: 'queued',
        priority,
        scheduled_for: new Date().toISOString(),
        config: {
          async: true,
          timeout: 300000, // 5 minutes
          retryOnFailure: true
        },
        metadata: {
          fileSize,
          createdBy: 'async-document-processor',
          version: '1.0',
          requestId
        }
      })
      .select()
      .single();

    if (jobError) {
      console.error(`[${requestId}] ❌ Job creation failed:`, jobError);
      throw jobError;
    }

    const jobId = jobData.id;
    console.log(`[${requestId}] ✅ Created job ${jobId} with priority ${priority}`);

    // Start background processing using EdgeRuntime.waitUntil for memory safety
    EdgeRuntime.waitUntil(
      processDocumentInBackground(jobId, documentId, fileUrl, fileName, clientType, documentType, userId)
    );

    const response: AsyncDocumentProcessorResponse = {
      success: true,
      jobId,
      message: `Document processing job created successfully. Job ID: ${jobId}`
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Async document processor error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({ 
        success: false,
        jobId: '',
        message: 'Failed to create processing job',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});