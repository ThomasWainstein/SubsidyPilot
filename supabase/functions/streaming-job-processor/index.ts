import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting streaming job processor...');

    // Get all queued jobs ordered by priority and creation time
    const { data: queuedJobs, error: jobsError } = await supabase
      .from('document_processing_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: false }) // high, medium, low
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

    // Process each job
    for (const job of queuedJobs) {
      try {
        console.log(`🚀 Processing job ${job.id} for document ${job.document_id}`);
        
        // Mark job as processing
        const { error: statusError } = await supabase
          .from('document_processing_jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        if (statusError) {
          console.error(`❌ Error updating job ${job.id} to processing:`, statusError);
          continue;
        }

        // Create extraction record if it doesn't exist
        const { data: existingExtraction } = await supabase
          .from('document_extractions')
          .select('id')
          .eq('document_id', job.document_id)
          .eq('source_table', 'universal')
          .single();

        let extractionId;
        if (!existingExtraction) {
          const { data: newExtraction, error: extractionError } = await supabase
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
                stage: 'text-extraction',
                progress: 25,
                processing_method: 'streaming-pipeline'
              }
            })
            .select('id')
            .single();

          if (extractionError) {
            console.error(`❌ Error creating extraction for job ${job.id}:`, extractionError);
            await markJobFailed(supabase, job.id, 'Failed to create extraction record');
            continue;
          }
          extractionId = newExtraction.id;
        } else {
          extractionId = existingExtraction.id;
        }

        console.log(`📊 Created/found extraction ${extractionId} for job ${job.id}`);

        // Process through stages
        await processJobStages(supabase, job, extractionId);
        
        processed++;
        
      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        await markJobFailed(supabase, job.id, error.message);
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

async function processJobStages(supabase: any, job: any, extractionId: string) {
  const stages = [
    { name: 'text-extraction', progress: 25 },
    { name: 'pattern-analysis', progress: 50 },
    { name: 'ai-processing', progress: 75 },
    { name: 'data-merging', progress: 90 },
    { name: 'validation', progress: 100 }
  ];

  for (const stage of stages) {
    console.log(`🔄 Processing stage: ${stage.name} for job ${job.id}`);
    
    // Update job metadata with current stage
    await supabase
      .from('document_processing_jobs')
      .update({
        metadata: {
          ...job.metadata,
          current_stage: stage.name,
          progress: stage.progress,
          last_heartbeat: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    // Update extraction progress
    await supabase
      .from('document_extractions')
      .update({
        progress_metadata: {
          job_id: job.id,
          stage: stage.name,
          progress: stage.progress,
          extraction_method: 'streaming-pipeline',
          last_updated: new Date().toISOString()
        },
        status_v2: stage.progress === 100 ? 'completed' : 'extracting',
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionId);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
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

  // Final extraction update with mock extracted data
  await supabase
    .from('document_extractions')
    .update({
      status_v2: 'completed',
      extracted_data: {
        document_type: job.document_type || 'unknown',
        processing_method: 'streaming-pipeline',
        stages_completed: 6,
        confidence_score: 0.85,
        extracted_fields: {
          title: 'Processed Document',
          content: 'Document processed through streaming pipeline',
          metadata: {
            file_name: job.file_name,
            client_type: job.client_type,
            processed_at: new Date().toISOString()
          }
        }
      },
      confidence_score: 0.85,
      progress_metadata: {
        job_id: job.id,
        stage: 'completed',
        progress: 100,
        extraction_method: 'streaming-pipeline',
        processing_time_ms: Date.now() - new Date(job.created_at).getTime()
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', extractionId);

  console.log(`✅ Job ${job.id} completed successfully`);
}

async function markJobFailed(supabase: any, jobId: string, errorMessage: string) {
  await supabase
    .from('document_processing_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}