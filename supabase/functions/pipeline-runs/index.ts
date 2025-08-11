import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PipelineRun {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
  stage: 'init' | 'harvest' | 'ai' | 'forms' | 'done';
  progress: number;
  started_at: string;
  ended_at?: string;
  error?: any;
  stats: any;
  config: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, runId, config } = await req.json();

    switch (action) {
      case 'start':
        return await startPipeline(supabase, config);
      case 'get_active':
        return await getActivePipeline(supabase);
      case 'get_status':
        return await getPipelineStatus(supabase, runId);
      case 'cancel':
        return await cancelPipeline(supabase, runId);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Pipeline runs error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function startPipeline(supabase: any, config: any) {
  console.log('🚀 Starting new pipeline run');
  
  // Check if there's already an active run
  const { data: activeRun } = await supabase
    .from('pipeline_runs')
    .select('*')
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRun) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Pipeline already running',
      runId: activeRun.id
    }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Create new pipeline run
  const { data: newRun, error } = await supabase
    .from('pipeline_runs')
    .insert({
      status: 'queued',
      stage: 'init',
      progress: 0,
      config: config || {
        countries: ['france', 'romania'],
        max_pages_per_country: 10,
        enable_ai_processing: true,
        enable_form_generation: true
      },
      stats: {}
    })
    .select()
    .single();

  if (error) throw error;

  // Start the orchestrator asynchronously
  supabase.functions.invoke('pipeline-orchestrator', {
    body: { action: 'orchestrate', runId: newRun.id }
  }).catch((err: any) => console.error('Failed to start orchestrator:', err));

  return new Response(JSON.stringify({
    success: true,
    runId: newRun.id,
    run: newRun
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getActivePipeline(supabase: any) {
  const { data: activeRun } = await supabase
    .from('pipeline_runs')
    .select('*')
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return new Response(JSON.stringify({
    success: true,
    run: activeRun
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getPipelineStatus(supabase: any, runId: string) {
  if (!runId) {
    throw new Error('runId is required');
  }

  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    run
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function cancelPipeline(supabase: any, runId: string) {
  if (!runId) {
    throw new Error('runId is required');
  }

  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .update({
      status: 'canceled',
      ended_at: new Date().toISOString(),
      error: { message: 'Pipeline canceled by user' }
    })
    .eq('id', runId)
    .select()
    .single();

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    run
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}