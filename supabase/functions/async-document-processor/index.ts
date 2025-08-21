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
  
  try {
    console.log(`🔄 Background processing started for job ${jobId}`);
    
    // Update job status to processing
    await supabase
      .from('document_processing_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Add artificial delay for very large documents to prevent memory issues
    const fileSize = await getFileSize(fileUrl);
    if (fileSize > 10 * 1024 * 1024) { // 10MB+
      console.log(`⏳ Large file detected (${Math.round(fileSize / 1024 / 1024)}MB), adding processing delay`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Call hybrid extraction for processing
    const hybridResponse = await supabase.functions.invoke('hybrid-extraction', {
      body: {
        fileUrl,
        fileName,
        documentType,
        processingMode: 'async'
      }
    });

    if (hybridResponse.error) {
      throw new Error(`Hybrid extraction failed: ${hybridResponse.error.message}`);
    }

    const hybridData = hybridResponse.data;
    
    // Store extraction results
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
          textLength: hybridData.extractedText.length
        }
      })
      .eq('id', jobId);

    console.log(`✅ Background processing completed for job ${jobId} in ${totalProcessingTime}ms`);

  } catch (error) {
    console.error(`❌ Background processing failed for job ${jobId}:`, error);
    
    // Update job status to failed
    await supabase
      .from('document_processing_jobs')
      .update({ 
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - processingStartTime
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
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch (error) {
    console.warn('Could not determine file size:', error);
    return 0;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, fileUrl, fileName, clientType, documentType, userId }: AsyncDocumentProcessorRequest = await req.json();

    console.log(`🔄 Creating async processing job for document ${documentId}`);

    // Validate input
    if (!documentId || !fileUrl || !fileName || !clientType || !documentType) {
      throw new Error('Missing required parameters: documentId, fileUrl, fileName, clientType, documentType');
    }

    // Determine priority based on file size and type
    const fileSize = await getFileSize(fileUrl);
    const priority = fileSize > 50 * 1024 * 1024 ? 'high' : 'normal'; // High priority for files > 50MB

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
          version: '1.0'
        }
      })
      .select()
      .single();

    if (jobError) {
      throw jobError;
    }

    const jobId = jobData.id;
    console.log(`✅ Created job ${jobId} with priority ${priority}`);

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
    console.error('❌ Async document processor error:', error);
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