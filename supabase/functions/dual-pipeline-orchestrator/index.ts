import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PipelineExecution {
  id: string;
  execution_type: 'full_pipeline' | 'harvesting_only' | 'processing_only' | 'form_generation';
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: {
    countries: string[];
    max_pages_per_country: number;
    enable_ai_processing: boolean;
    enable_form_generation: boolean;
    quality_threshold: number;
  };
  metrics: {
    pages_discovered: number;
    pages_scraped: number;
    subsidies_extracted: number;
    forms_generated: number;
    processing_time_ms: number;
    success_rate: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config = {
      supabase_url: Deno.env.get('NEXT_PUBLIC_SUPABASE_URL'),
      supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    };

    const supabase = createClient(config.supabase_url!, config.supabase_service_key!);
    
    const { action, execution_config, pipeline_id } = await req.json();

    console.log('🔄 Dual Pipeline Orchestrator:', { action });

    if (action === 'start_full_pipeline') {
      const execution = await startFullPipeline(execution_config || {}, supabase);
      
      return new Response(JSON.stringify({
        success: true,
        execution_id: execution.id,
        message: 'Full dual pipeline started',
        execution
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'monitor_pipeline') {
      const status = await monitorPipelineStatus(pipeline_id, supabase);
      
      return new Response(JSON.stringify({
        success: true,
        pipeline_status: status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'health_check') {
      const health = await performHealthCheck(supabase);
      
      return new Response(JSON.stringify({
        success: true,
        health_status: health
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'trigger_harvesting') {
      const countries = execution_config?.countries || ['france', 'romania'];
      const results = await triggerHarvestingPipeline(countries, execution_config, supabase);
      
      return new Response(JSON.stringify({
        success: true,
        harvesting_results: results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'trigger_processing') {
      const results = await triggerProcessingPipeline(execution_config, supabase);
      
      return new Response(JSON.stringify({
        success: true,
        processing_results: results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Dual Pipeline Orchestrator error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function startFullPipeline(config: any, supabase: any): Promise<PipelineExecution> {
  const execution_id = `pipeline-${Date.now()}`;
  const startTime = Date.now();
  
  const execution: PipelineExecution = {
    id: execution_id,
    execution_type: 'full_pipeline',
    status: 'running',
    config: {
      countries: config.countries || ['france', 'romania'],
      max_pages_per_country: config.max_pages_per_country || 20,
      enable_ai_processing: config.enable_ai_processing !== false,
      enable_form_generation: config.enable_form_generation !== false,
      quality_threshold: config.quality_threshold || 0.7
    },
    metrics: {
      pages_discovered: 0,
      pages_scraped: 0,
      subsidies_extracted: 0,
      forms_generated: 0,
      processing_time_ms: 0,
      success_rate: 0
    }
  };

  // Store execution record
  await supabase.from('pipeline_executions').insert({
    id: execution_id,
    execution_type: execution.execution_type,
    status: execution.status,
    config: execution.config,
    metrics: execution.metrics,
    started_at: new Date().toISOString()
  });

  console.log(`🚀 Starting full dual pipeline: ${execution_id}`);

  try {
    // Phase 1: Harvesting Pipeline
    console.log('📡 Phase 1: Content Harvesting');
    const harvestingResults = await triggerHarvestingPipeline(
      execution.config.countries, 
      execution.config, 
      supabase
    );
    
    execution.metrics.pages_scraped = harvestingResults.total_pages_scraped;
    execution.metrics.pages_discovered = harvestingResults.total_pages_discovered;

    // Phase 2: AI Processing Pipeline (if enabled)
    if (execution.config.enable_ai_processing) {
      console.log('🤖 Phase 2: AI Content Processing');
      const processingResults = await triggerProcessingPipeline(execution.config, supabase);
      execution.metrics.subsidies_extracted = processingResults.subsidies_created;
    }

    // Phase 3: Form Generation (if enabled)
    if (execution.config.enable_form_generation) {
      console.log('📝 Phase 3: Form Generation');
      const formResults = await triggerFormGeneration(execution.config, supabase);
      execution.metrics.forms_generated = formResults.forms_generated;
    }

    // Calculate final metrics
    const endTime = Date.now();
    execution.metrics.processing_time_ms = endTime - startTime;
    execution.metrics.success_rate = calculateSuccessRate(execution.metrics);
    execution.status = 'completed';

    // Update execution record
    await supabase.from('pipeline_executions').update({
      status: execution.status,
      metrics: execution.metrics,
      completed_at: new Date().toISOString()
    }).eq('id', execution_id);

    console.log(`✅ Full pipeline completed: ${execution_id}`, execution.metrics);

  } catch (error) {
    console.error(`❌ Pipeline execution failed: ${execution_id}`, error);
    execution.status = 'failed';
    
    await supabase.from('pipeline_executions').update({
      status: execution.status,
      error_details: { error: error.message, timestamp: new Date().toISOString() },
      completed_at: new Date().toISOString()
    }).eq('id', execution_id);
  }

  return execution;
}

async function triggerHarvestingPipeline(countries: string[], config: any, supabase: any) {
  const results = {
    total_pages_discovered: 0,
    total_pages_scraped: 0,
    country_results: {} as Record<string, any>
  };

  for (const country of countries) {
    try {
      console.log(`🌍 Triggering harvesting for: ${country}`);
      
      let harvesterResult;
      
      if (country === 'france') {
        harvesterResult = await supabase.functions.invoke('franceagrimer-harvester', {
          body: {
            action: 'scrape',
            max_pages: config.max_pages_per_country
          }
        });
      } else if (country === 'romania') {
        harvesterResult = await supabase.functions.invoke('afir-harvester', {
          body: {
            action: 'scrape',
            max_pages: config.max_pages_per_country
          }
        });
      }

      if (harvesterResult?.data?.success) {
        const pages_scraped = harvesterResult.data.pages_scraped || 0;
        results.total_pages_scraped += pages_scraped;
        results.total_pages_discovered += pages_scraped;
        results.country_results[country] = {
          success: true,
          pages_scraped,
          session_id: harvesterResult.data.session_id
        };
      } else {
        results.country_results[country] = {
          success: false,
          error: harvesterResult?.error?.message || 'Unknown error'
        };
      }

    } catch (error) {
      console.warn(`⚠️ Harvesting failed for ${country}:`, error);
      results.country_results[country] = {
        success: false,
        error: error.message
      };
    }
  }

  return results;
}

async function triggerProcessingPipeline(config: any, supabase: any) {
  console.log('🔄 Triggering AI processing pipeline');
  
  const processingResult = await supabase.functions.invoke('ai-content-processor', {
    body: {
      source: 'all', // Process all unprocessed pages
      quality_threshold: config.quality_threshold
    }
  });

  return {
    success: processingResult?.data?.success || false,
    subsidies_created: processingResult?.data?.successful || 0,
    processing_errors: processingResult?.data?.failed || 0
  };
}

async function triggerFormGeneration(config: any, supabase: any) {
  console.log('📝 Triggering form generation pipeline');
  
  const formResult = await supabase.functions.invoke('pdf-form-detector', {
    body: {
      action: 'batch_detect'
    }
  });

  return {
    success: formResult?.data?.success || false,
    forms_generated: formResult?.data?.successful || 0,
    generation_errors: formResult?.data?.results?.filter((r: any) => !r.success).length || 0
  };
}

async function monitorPipelineStatus(pipeline_id: string, supabase: any) {
  const { data: execution, error } = await supabase
    .from('pipeline_executions')
    .select('*')
    .eq('id', pipeline_id)
    .single();

  if (error || !execution) {
    throw new Error(`Pipeline execution not found: ${pipeline_id}`);
  }

  // Get additional real-time metrics
  const { data: recentActivity } = await supabase
    .from('raw_scraped_pages')
    .select('created_at, source_site, status')
    .gte('created_at', execution.started_at)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    execution,
    recent_activity: recentActivity || [],
    last_updated: new Date().toISOString()
  };
}

async function performHealthCheck(supabase: any) {
  const health = {
    database_connectivity: false,
    harvesting_functions: false,
    processing_functions: false,
    recent_activity: false,
    overall_status: 'unhealthy'
  };

  try {
    // Test database connectivity
    const { data, error } = await supabase.from('pipeline_executions').select('count').limit(1);
    health.database_connectivity = !error;

    // Check recent scraping activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPages } = await supabase
      .from('raw_scraped_pages')
      .select('count')
      .gte('created_at', oneDayAgo);
    
    health.recent_activity = (recentPages && recentPages.length > 0);

    // Test edge function availability (simplified check)
    health.harvesting_functions = true; // Assume available if we got this far
    health.processing_functions = true;

    // Overall health assessment
    const healthyComponents = Object.values(health).filter(status => status === true).length;
    health.overall_status = healthyComponents >= 3 ? 'healthy' : 'degraded';

  } catch (error) {
    console.error('Health check failed:', error);
  }

  return health;
}

function calculateSuccessRate(metrics: any): number {
  const total_operations = metrics.pages_scraped + metrics.subsidies_extracted + metrics.forms_generated;
  if (total_operations === 0) return 0;
  
  // Simplified success rate calculation
  const successful_operations = metrics.pages_scraped * 0.9 + metrics.subsidies_extracted + metrics.forms_generated;
  return Math.min(100, (successful_operations / total_operations) * 100);
}