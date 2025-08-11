import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Feature flags with safe defaults (staging ON by default)
const FLAG_ENFORCE_DB_INSERT_SUCCESS = (Deno.env.get('ENFORCE_DB_INSERT_SUCCESS') ?? 'true') === 'true';
const FLAG_ENABLE_STRUCTURED_LOGS = (Deno.env.get('ENABLE_STRUCTURED_LOGS') ?? 'true') === 'true';
const AI_RETRY_IF_STALLED_MIN = parseInt(Deno.env.get('AI_RETRY_IF_STALLED_MIN') ?? '5', 10);

// Structured logging helper
function logEvent(scope: string, run_id?: string, extra: Record<string, any> = {}) {
  const payload = {
    ts: new Date().toISOString(),
    scope,
    run_id: run_id || null,
    ...extra,
  };
  if (FLAG_ENABLE_STRUCTURED_LOGS) {
    console.log(JSON.stringify(payload));
  } else {
    console.log(`[${scope}]`, payload);
  }
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

    const { action, runId } = await req.json();

    if (action === 'orchestrate') {
      await orchestratePipeline(supabase, runId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('Pipeline orchestrator error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function orchestratePipeline(supabase: any, runId: string) {
  console.log(`🔄 Starting orchestration for run ${runId}`);
  
  const updateRun = async (patch: any) => {
    const { error } = await supabase
      .from('pipeline_runs')
      .update(patch)
      .eq('id', runId);
    if (error) throw error;
  };

  const failRun = async (stage: string, message: string, details?: any) => {
    console.error(`❌ Pipeline failed at ${stage}: ${message}`, details);
    await updateRun({ 
      status: 'failed', 
      stage,
      ended_at: new Date().toISOString(),
      error: { 
        message,
        stage,
        details,
        timestamp: new Date().toISOString()
      }
    });
    throw new Error(`Pipeline failed at ${stage}: ${message}`);
  };

  try {
    // Get run configuration
    const { data: run, error: fetchError } = await supabase
      .from('pipeline_runs')
      .select('*')
      .eq('id', runId)
      .single();
    
    if (fetchError) throw fetchError;
    if (!run) throw new Error(`Run ${runId} not found`);

    // Check if run was canceled
    if (run.status === 'canceled') {
      console.log(`Run ${runId} was canceled, stopping orchestration`);
      return;
    }

    // Stalled AI retry (deterministic, single retry)
    try {
      if (run.stage === 'ai') {
        const { data: aiRows } = await supabase
          .from('ai_content_runs')
          .select('id, started_at')
          .eq('run_id', runId)
          .order('started_at', { ascending: false })
          .limit(1);

        const lastInvokedAtStr = run.stats?.ai?.ai_invoked_at as string | undefined;
        const lastInvokedAt = lastInvokedAtStr ? Date.parse(lastInvokedAtStr) : 0;
        const minutesSinceInvoke = lastInvokedAt ? (Date.now() - lastInvokedAt) / 60000 : Infinity;
        const alreadyRetried = run.stats?.ai?.ai_retry === true;

        if (minutesSinceInvoke >= AI_RETRY_IF_STALLED_MIN && (!aiRows || aiRows.length === 0) && !alreadyRetried) {
          logEvent('orchestrator.ai.retry', runId, { minutesSinceInvoke });
          await processWithAI(supabase, runId, run.config);
          const newStats = { ...(run.stats || {}), ai: { ...(run.stats?.ai || {}), ai_retry: true, ai_invoked_at: new Date().toISOString() } };
          await updateRun({ stats: newStats });
          // Retry kicked; exit early
          return;
        }
      }
    } catch (retryCheckErr) {
      console.warn('⚠️ AI stalled retry check failed:', (retryCheckErr as Error).message);
    }

    // Stage 1: Harvesting with validation
    await updateRun({ 
      status: 'running', 
      stage: 'harvest', 
      progress: 10,
      started_at: new Date().toISOString()
    });
    
    console.log(`📡 Stage 1: Harvesting content for run ${runId}`);
    const harvestResults = await harvestContent(supabase, runId, run.config);
    
    // Validate harvest results - fail fast if no data
    if (!harvestResults.pages_scraped || harvestResults.pages_scraped === 0) {
      await failRun('harvest', 'No pages were successfully harvested', harvestResults);
    }
    
    // Update with harvest results and enforce "inserts = success"
    const perCountry = harvestResults.countries || [];
    const harvest_total_inserted = harvestResults.harvest_total_inserted || harvestResults.pages_ok || 0;

    logEvent('orchestrator.harvest.summary', runId, { per_country: perCountry, harvest_total_inserted });

    const newStats = {
      ...(run.stats || {}),
      harvest: {
        pages_total: harvestResults.pages_total || 0,
        harvest_total_inserted,
        per_country: perCountry,
      },
    };

    await updateRun({ stage: 'harvest', progress: 40, stats: newStats });

    if (FLAG_ENFORCE_DB_INSERT_SUCCESS && harvest_total_inserted === 0) {
      await updateRun({
        stage: 'done',
        status: 'completed',
        progress: 100,
        ended_at: new Date().toISOString(),
        reason: 'no_content_processed',
        stats: newStats,
      });
      logEvent('orchestrator.done.no_content', runId, { harvest_total_inserted });
      return;
    }

    // Stage 2: AI Processing with validation
    if (run.config.enable_ai_processing !== false) {
      const aiInvokeAt = new Date().toISOString();
      await updateRun({ stage: 'ai', progress: 50, stats: { ...(newStats || {}), ai: { ...((newStats as any)?.ai || {}), ai_invoked_at: aiInvokeAt, ai_invocation_attempts: (((newStats as any)?.ai?.ai_invocation_attempts) || 0) + 1 } } });
      logEvent('orchestrator.ai.invoke', runId, { invoked: true });
      console.log(`🤖 Stage 2: AI processing for run ${runId}`);
      
      // Post-harvest patch: Ensure pages are wired to this run
      try {
        await supabase.functions.invoke('pipeline-post-harvest-patch', {
          body: { run_id: runId, session_id: `harvest-${runId}` },
          headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` }
        });
        console.log(`🔧 Post-harvest patch completed for run ${runId}`);
      } catch (patchError) {
        console.warn(`⚠️ Post-harvest patch failed: ${ (patchError as Error).message }`);
        // Continue execution - this is not critical
      }
      
      try {
        const aiResults = await processWithAI(supabase, runId, run.config);
        console.log(`✅ AI processing completed: ${aiResults.subsidies_created} subsidies created`);
        
        const hasResults = aiResults.subsidies_created > 0;
        const shouldGenerateForms = hasResults && run.config.enable_form_generation !== false;
        const statsAfterAI = { ...(newStats || {}), ai: { ...(aiResults?.stats || {}), ai_invoked_at: aiInvokeAt } };
        
        // Forms Stage (optional)
        if (shouldGenerateForms) {
          await updateRun({ 
            stage: 'forms', 
            progress: 75, 
            stats: statsAfterAI
          });
          console.log(`📋 Forms Stage: Generating forms for run ${runId}`);
          
          const formResults = await generateForms(supabase, runId, run.config);
          console.log(`✅ Form generation completed: ${formResults.forms_generated} forms generated`);
          
          // Complete with forms
          await updateRun({ 
            stage: 'done', 
            status: 'completed', 
            progress: 100,
            ended_at: new Date().toISOString(),
            stats: { ...statsAfterAI, forms: formResults }
          });
        } else {
          // Complete without forms
          await updateRun({ 
            stage: 'done', 
            status: 'completed', 
            progress: 100,
            ended_at: new Date().toISOString(),
            reason: hasResults ? 'completed_without_forms' : 'no_content_processed',
            stats: statsAfterAI
          });
        }
      } catch (aiError) {
        console.error(`❌ AI processing failed: ${(aiError as Error).message}`);
        await updateRun({ 
          stage: 'ai', 
          status: 'failed', 
          progress: 50,
          reason: 'ai_invoke_error',
          error_details: (aiError as Error).message,
          stats: newStats
        });
        throw aiError;
      }
    }

    // Stage 3: Form Generation (optional)
    if (run.config.enable_form_generation !== false) {
      await updateRun({ stage: 'forms', progress: 90 });
      
      console.log(`📝 Stage 3: Form generation for run ${runId}`);
      const formResults = await generateForms(supabase, runId, run.config);
      
      const finalStats = {
        ...((await supabase.from('pipeline_runs').select('stats').eq('id', runId).single()).data?.stats || {}),
        forms: {
          forms_generated: formResults.forms_generated || 0,
          generation_errors: formResults.errors || 0
        }
      };
      
      await updateRun({ 
        stage: 'forms', 
        progress: 95,
        stats: finalStats
      });
    }

    // Final completion with summary
    const finalData = await supabase.from('pipeline_runs').select('stats').eq('id', runId).single();
    const finalStats = finalData.data?.stats || {};
    
    await updateRun({ 
      status: 'completed', 
      stage: 'done', 
      progress: 100,
      ended_at: new Date().toISOString(),
      stats: {
        ...finalStats,
        completion_time: new Date().toISOString(),
        total_subsidies: finalStats.ai?.subsidies_created || 0
      }
    });

    console.log(`✅ Pipeline run ${runId} completed successfully`);

  } catch (error) {
    console.error(`❌ Pipeline run ${runId} failed:`, error);
    
    // Only update if not already failed
    const currentRun = await supabase.from('pipeline_runs').select('status').eq('id', runId).single();
    if (currentRun.data?.status !== 'failed') {
      await updateRun({ 
        status: 'failed', 
        ended_at: new Date().toISOString(),
        error: { 
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

async function harvestContent(supabase: any, runId: string, config: any) {
  const countries = config.countries || ['france', 'romania'];
  let totalPagesReturned = 0;
  let totalInserted = 0;
  const results: any[] = [];

  for (const country of countries) {
    try {
      const functionName = country === 'france' ? 'franceagrimer-harvester' : 'afir-harvester';
      logEvent('orchestrator.harvest.invoke', runId, { country, function: functionName });

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'scrape',
          max_pages: config.max_pages_per_country || 10,
          run_id: runId,
        },
      });

      if (error) {
        logEvent('orchestrator.harvest.error', runId, { country, error: error.message });
        results.push({ country, success: false, error: error.message });
        continue;
      }

      const returned = data?.pages_scraped_returned || data?.pages_scraped || 0;
      const inserted = data?.pages_inserted_db ?? 0;
      const inserted_ids = data?.inserted_ids || [];

      totalPagesReturned += returned;
      totalInserted += inserted;

      const res = { country, success: data?.success === true, pages_scraped_returned: returned, pages_inserted_db: inserted, inserted_ids };
      results.push(res);
      logEvent('orchestrator.harvest.result', runId, res);
    } catch (err) {
      logEvent('orchestrator.harvest.exception', runId, { country, error: (err as Error).message });
      results.push({ country, success: false, error: (err as Error).message });
    }
  }

  return {
    pages_total: totalPagesReturned,
    pages_scraped: totalPagesReturned,
    pages_ok: totalInserted,
    harvest_total_inserted: totalInserted,
    countries: results,
  };
}

async function processWithAI(supabase: any, runId: string, config: any) {
  console.log(`🤖 Starting AI processing for run ${runId}`);
  
  const retryWithBackoff = async (attempt: number = 1): Promise<any> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-content-processor', {
        body: {
          run_id: runId,
          source: 'run',
          quality_threshold: config.quality_threshold || 0.3
        },
        headers: { 
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` 
        }
      });

      if (error) {
        // Check if it's a transient error worth retrying
        if ((error.status === 429 || error.status >= 500) && attempt < 3) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`⏳ AI processing attempt ${attempt} failed with ${error.status}, retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          return retryWithBackoff(attempt + 1);
        }
        throw new Error(`AI processing failed: ${error.message}`);
      }

      return data;
    } catch (err) {
      if (attempt < 3 && (err.message.includes('429') || err.message.includes('500'))) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ AI processing attempt ${attempt} failed, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return retryWithBackoff(attempt + 1);
      }
      throw err;
    }
  };

  try {
    const result = await retryWithBackoff();
    
    return {
      subsidies_created: result?.successful || result?.subs_created || 0,
      errors: result?.failed || result?.errors || 0,
      stats: result
    };
  } catch (error) {
    console.error('AI processing failed after retries:', error);
    return { subsidies_created: 0, errors: 1, error_details: error.message };
  }
}

async function generateForms(supabase: any, runId: string, config: any) {
  try {
    console.log(`📝 Starting form generation for run ${runId}`);
    
    const { data, error } = await supabase.functions.invoke('pdf-form-detector', {
      body: {
        action: 'batch_detect',
        run_id: runId
      }
    });

    if (error) {
      console.error('Form generation failed:', error);
      return { forms_generated: 0, errors: 1 };
    }

    console.log(`✅ Form generation completed: ${data?.successful || 0} forms created`);
    return { forms_generated: data?.successful || 0, errors: data?.failed || 0 };
    
  } catch (error) {
    console.error('Form generation failed:', error);
    return { forms_generated: 0, errors: 1 };
  }
}