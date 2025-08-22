import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingJob {
  id: string;
  document_id: string;
  file_url: string;
  file_name: string;
  client_type: string;
  document_type?: string;
  config: any;
  metadata: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 Async document processor starting...');

    // Get next job to process
    const { data: jobs, error: jobError } = await supabase
      .from('document_processing_jobs')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (jobError) {
      console.error('❌ Error fetching jobs:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to fetch jobs' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!jobs || jobs.length === 0) {
      console.log('ℹ️ No jobs to process');
      return new Response(JSON.stringify({ message: 'No jobs to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const job = jobs[0] as ProcessingJob;
    console.log(`📋 Processing job ${job.id} for document ${job.document_id}`);

    // Update job status to processing
    await supabase
      .from('document_processing_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    const startTime = Date.now();

    try {
      // Call Cloud Run service for processing
      const cloudRunUrl = 'https://subsidypilot-form-parser-838836299668.europe-west1.run.app/process-document';
      
      console.log(`🚀 Calling Cloud Run with: ${job.file_url}`);
      
      const formData = new FormData();
      
      // Download file and add to form data
      const fileResponse = await fetch(job.file_url);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.statusText}`);
      }
      
      const fileBlob = await fileResponse.blob();
      formData.append('document', fileBlob, job.file_name);
      formData.append('document_id', job.document_id);
      formData.append('document_type', job.document_type || 'general');

      const cloudRunResponse = await fetch(cloudRunUrl, {
        method: 'POST',
        body: formData
      });

      if (!cloudRunResponse.ok) {
        throw new Error(`Cloud Run processing failed: ${cloudRunResponse.statusText}`);
      }

      const result = await cloudRunResponse.json();
      const processingTime = Date.now() - startTime;

      if (result.success && result.extractedData) {
        console.log('✅ Cloud Run processing successful');
        
        // Update document_extractions with results
        await supabase
          .from('document_extractions')
          .update({
            status_v2: 'completed',
            extracted_data: result.extractedData,
            confidence_score: result.confidence || 0,
            progress_metadata: {
              ...job.metadata,
              processing_time_ms: processingTime,
              extraction_method: 'cloud-run-async',
              model: result.metadata?.model,
              version: result.metadata?.version
            },
            updated_at: new Date().toISOString()
          })
          .eq('document_id', job.document_id);

        // Mark job as completed
        await supabase
          .from('document_processing_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            processing_time_ms: processingTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        console.log(`✅ Job ${job.id} completed successfully in ${processingTime}ms`);

      } else {
        throw new Error(result.error || 'Processing failed');
      }

    } catch (processingError) {
      console.error('❌ Processing error:', processingError);
      
      const processingTime = Date.now() - startTime;
      const shouldRetry = job.retry_attempt < job.max_retries;
      
      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const retryDelay = Math.min(300 * Math.pow(2, job.retry_attempt), 3600); // Max 1 hour
        const retryTime = new Date(Date.now() + retryDelay * 1000);

        await supabase
          .from('document_processing_jobs')
          .update({
            status: 'retry_scheduled',
            retry_attempt: job.retry_attempt + 1,
            scheduled_for: retryTime.toISOString(),
            error_message: processingError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        console.log(`🔄 Job ${job.id} scheduled for retry ${job.retry_attempt + 1} at ${retryTime.toISOString()}`);
      } else {
        // Mark as failed
        await supabase
          .from('document_processing_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            processing_time_ms: processingTime,
            error_message: processingError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Update document_extractions
        await supabase
          .from('document_extractions')
          .update({
            status_v2: 'failed',
            failure_detail: processingError.message,
            updated_at: new Date().toISOString()
          })
          .eq('document_id', job.document_id);

        console.log(`❌ Job ${job.id} failed permanently after ${job.retry_attempt} retries`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      jobId: job.id,
      documentId: job.document_id,
      status: 'processed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Async processor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});