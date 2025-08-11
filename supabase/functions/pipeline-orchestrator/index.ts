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
    
    // Update with harvest results
    const harvestStats = {
      harvest: {
        pages_total: harvestResults.pages_total || 0,
        pages_scraped: harvestResults.pages_scraped,
        pages_ok: harvestResults.pages_ok || 0,
        countries: harvestResults.countries || []
      }
    };
    
    await updateRun({ 
      stage: 'harvest', 
      progress: 40,
      stats: harvestStats
    });

    // Stage 2: AI Processing with validation
    if (run.config.enable_ai_processing !== false) {
      await updateRun({ stage: 'ai', progress: 50 });
      
      console.log(`🤖 Stage 2: AI processing for run ${runId}`);
      
      // Post-harvest patch: Ensure pages are wired to this run
      console.log(`🔧 Post-harvest patch: wiring pages to run ${runId}`);
      const { data: patchedPages } = await supabase
        .from('raw_scraped_pages')
        .update({ run_id: runId })
        .gte('created_at', run.started_at)
        .lte('created_at', new Date().toISOString())
        .in('source_site', ['franceagrimer', 'afir-romania'])
        .gte('length(coalesce(text_markdown,raw_text,raw_html))', 200)
        .is('run_id', null)
        .select('id');
      
      if (patchedPages?.length > 0) {
        console.log(`✅ Patched ${patchedPages.length} orphaned pages to run ${runId}`);
      }
      
      const aiResults = await processWithAI(supabase, runId, run.config);
      
      // Handle AI results gracefully - don't fail on zero subsidies
      if (!aiResults.subsidies_created || aiResults.subsidies_created === 0) {
        if (aiResults.pages_processed === 0) {
          console.log(`⚠️ No pages with sufficient content for AI processing (run ${runId})`);
          await updateRun({ 
            status: 'completed', 
            stage: 'done', 
            progress: 100,
            ended_at: new Date().toISOString(),
            stats: {
              ...harvestStats,
              ai: { pages_processed: 0, subsidies_created: 0, reason: 'no_content' }
            }
          });
          console.log(`✅ Pipeline run ${runId} completed with reason: no_content`);
          return; // Exit gracefully
        } else {
          console.log(`⚠️ AI processing completed but extracted 0 subsidies from ${aiResults.pages_processed} pages`);
          // Continue - this is valid (pages may contain no subsidies)
        }
      }
      
      const aiStats = {
        ...harvestStats,
        ai: {
          pages_processed: harvestResults.pages_scraped,
          subsidies_created: aiResults.subsidies_created,
          processing_errors: aiResults.errors || 0
        }
      };
      
      await updateRun({ 
        stage: 'ai', 
        progress: 80,
        stats: aiStats
      });
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
  let totalPagesScraped = 0;
  let totalPagesOk = 0;
  const results = [];

  for (const country of countries) {
    try {
      console.log(`🌍 Harvesting ${country} for run ${runId}`);
      
      const functionName = country === 'france' ? 'franceagrimer-harvester' : 'afir-harvester';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'scrape',
          max_pages: config.max_pages_per_country || 10,
          run_id: runId  // CRITICAL: Pass runId to ensure data is tagged
        }
      });

      if (error) {
        console.warn(`Harvesting ${country} failed:`, error);
        results.push({ country, success: false, error: error.message });
        continue;
      }

      const pagesScraped = data?.pages_scraped || 0;
      const pagesOk = data?.pages_ok || pagesScraped; // Assume OK if not specified
      
      totalPagesScraped += pagesScraped;
      totalPagesOk += pagesOk;
      results.push({ country, success: true, pages_scraped: pagesScraped, pages_ok: pagesOk });
      
      console.log(`✅ ${country} harvesting completed: ${pagesScraped} pages (${pagesOk} OK)`);
      
    } catch (error) {
      console.warn(`Error harvesting ${country}:`, error);
      results.push({ country, success: false, error: error.message });
    }
  }

  return { 
    pages_total: totalPagesScraped,
    pages_scraped: totalPagesScraped,
    pages_ok: totalPagesOk,
    countries: results
  };
}

async function processWithAI(supabase: any, runId: string, config: any) {
  try {
    console.log(`🤖 Starting AI processing for run ${runId}`);
    
    const { data, error } = await supabase.functions.invoke('ai-content-processor', {
      body: {
        source: 'all',
        run_id: runId,  // CRITICAL: Filter by runId
        quality_threshold: config.quality_threshold || 0.4
      }
    });

    if (error) {
      console.error('AI processing failed:', error);
      return { subsidies_created: 0, errors: 1, error_details: error };
    }

    const subsidiesCreated = data?.successful || 0;
    const errors = data?.failed || 0;

    console.log(`✅ AI processing completed: ${subsidiesCreated} subsidies created, ${errors} errors`);
    return { subsidies_created: subsidiesCreated, errors };
    
  } catch (error) {
    console.error('AI processing failed:', error);
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