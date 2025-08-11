import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { robustJsonArray, coerceSubsidy, makeFingerprint, chunkText } from '../_lib/ai-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Feature flags with safe defaults
const AI_MODEL = Deno.env.get('AI_MODEL') || 'gpt-4.1-2025-04-14';
const AI_MIN_LEN = parseInt(Deno.env.get('AI_MIN_LEN') || '200');
const AI_CHUNK_SIZE = parseInt(Deno.env.get('AI_CHUNK_SIZE') || '8000');
const AI_ALLOW_RECENT_FALLBACK = Deno.env.get('AI_ALLOW_RECENT_FALLBACK') === 'true';
const ENABLE_STRUCTURED_LOGS = Deno.env.get('ENABLE_STRUCTURED_LOGS') !== 'false';

function logEvent(scope: string, run_id?: string | null, extra: Record<string, any> = {}) {
  const payload = { ts: new Date().toISOString(), scope, run_id: run_id ?? null, ...extra };
  if (ENABLE_STRUCTURED_LOGS) console.log(JSON.stringify(payload));
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl!, supabaseKey!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let runId: string | null = null;
  let aiRunId: string | null = null;

  try {
    const body = await req.json();
    const { 
      run_id, 
      page_ids, 
      quality_threshold = 0.3, 
      min_len = AI_MIN_LEN,
      model = AI_MODEL,
      allow_recent_fallback = AI_ALLOW_RECENT_FALLBACK,
      recent_window_minutes = 120 
    } = body;
    
    runId = run_id;
    const sessionId = `ai-${Date.now()}`;
    
    console.log(`AI_RUN_START {run_id: ${run_id}, pages_seen: 0, pages_eligible: 0}`);
    logEvent('ai.run.start', run_id, { 
      page_ids_count: page_ids?.length || 0, 
      quality_threshold, 
      min_len, 
      model, 
      allow_recent_fallback 
    });
    
    // Start envelope: insert ai_content_runs FIRST to track all attempts
    const { data: aiRun, error: aiRunError } = await supabase
      .from('ai_content_runs')
      .insert({
        run_id,
        model,
        started_at: new Date().toISOString(),
        pages_seen: 0,
        pages_eligible: 0,
        pages_processed: 0,
        subs_created: 0,
        status: 'running'
      })
      .select()
      .single();
    
    if (aiRunError) throw aiRunError;
    aiRunId = aiRun.id;

    // Check for OpenAI API key with fallback AFTER creating envelope
    const openAIApiKey = Deno.env.get('SCRAPPER_RAW_GPT_API') ?? Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      console.log(`AI_RUN_ERROR {run_id: ${run_id}, reason: "MISSING_OPENAI_KEY"}`);
      logEvent('ai.run.error', run_id, { reason: 'MISSING_OPENAI_KEY' });
      
      // Update the existing ai_content_runs row with error status
      await supabase.from('ai_content_runs')
        .update({
          status: 'error',
          notes: 'MISSING_OPENAI_KEY',
          ended_at: new Date().toISOString()
        })
        .eq('id', aiRunId);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'MISSING_OPENAI_KEY'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let pages: any[] = [];
    let pagesEligible = 0;

    // Select pages: by page_ids OR get recent unprocessed pages
    if (page_ids && page_ids.length > 0) {
      console.log(`📋 Fetching specific pages: ${page_ids.length} IDs`);
      const { data: pageData, error: fetchError } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .in('id', page_ids);

      if (fetchError) throw fetchError;
      pages = pageData || [];
    } else {
      // Get recent pages that haven't been processed yet
      console.log('📋 Fetching recent unprocessed pages...');
      const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      const { data: pageData, error: fetchError } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .gte('created_at', recentCutoff)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;
      pages = pageData || [];
      console.log(`📄 Found ${pages.length} recent pages`);
    }

    // Filter eligible content (length >= min_len) - use COALESCE fallback
    const eligiblePages = pages.filter(p => {
      const content = p.text_markdown || p.raw_text || p.raw_html || '';
      return content.length >= min_len;
    });
    pagesEligible = eligiblePages.length;

    // If none and allow_recent_fallback → pull recent pages
    if (eligiblePages.length === 0 && allow_recent_fallback) {
      logEvent('ai.fallback.start', run_id, { recent_window_minutes });
      
      const recentCutoff = new Date(Date.now() - recent_window_minutes * 60 * 1000).toISOString();
      const { data: recentPages, error: recentError } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .gte('created_at', recentCutoff)
        .limit(10);

      if (!recentError && recentPages?.length > 0) {
        const recentEligible = recentPages.filter(p => {
          const content = p.text_markdown || p.raw_text || p.raw_html || '';
          return content.length >= min_len;
        });
        pages.push(...recentEligible);
        pagesEligible = recentEligible.length;
        logEvent('ai.fallback.used', run_id, { recent_pages: recentEligible.length });
      }
    }

    const pagesSeen = pages.length;
    let pagesProcessed = 0;
    let subsidiesCreated = 0;
    let errorsCount = 0;

    console.log(`AI_RUN_START {run_id: ${run_id}, pages_seen: ${pagesSeen}, pages_eligible: ${pagesEligible}}`);

    // Process each eligible page ONE AT A TIME to avoid timeouts
    console.log(`🔄 Starting to process ${eligiblePages.length} eligible pages ONE BY ONE...`);
    
    for (const page of eligiblePages.slice(0, 5)) { // Limit to 5 pages max for stability
      try {
        console.log(`\n📄 === PROCESSING PAGE ${page.id} ===`);
        console.log(`URL: ${page.source_url}`);
        logEvent('ai.page.start', run_id, { page_id: page.id, url: page.source_url });
        
        const content = page.text_markdown || page.raw_text || page.raw_html || '';
        console.log(`📝 Content length: ${content.length} chars`);
        
        if (content.length < min_len) {
          console.log(`⚠️ Skipping page ${page.id} - content too short (${content.length} < ${min_len})`);
          continue;
        }

        // Use only the first chunk for each page to avoid complexity
        const firstChunk = content.slice(0, AI_CHUNK_SIZE);
        console.log(`📝 Using first ${firstChunk.length} chars of content`);
        
        try {
          console.log(`🧠 Making OpenAI API call for page ${page.id}...`);
          
          const prompt = `Extract agricultural subsidy information from this text. Return a JSON array of subsidies found.

For each subsidy, extract:
- title: The name/title of the subsidy program  
- description: A detailed description
- eligibility: Who is eligible and requirements
- deadline: Application deadline (format: YYYY-MM-DD)
- funding_type: Type of funding
- agency: The agency providing the subsidy
- sector: Agricultural sector
- region: Geographic region if specified

Text to analyze:
${firstChunk}

Return only valid JSON array, no other text.`;

          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are an expert at extracting agricultural subsidy information. Return only valid JSON.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.1,
              max_tokens: 1000
            }),
          });

          console.log(`📡 OpenAI API response status: ${aiResponse.status}`);
          
          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error(`❌ OpenAI API error for page ${page.id}: ${aiResponse.status} - ${errorText}`);
            errorsCount++;
            await logAiError(run_id, page.id, page.source_url, 'ai_api', `OpenAI API error: ${aiResponse.status} - ${errorText}`);
            continue;
          }

          const aiData = await aiResponse.json();
          const extractedText = aiData.choices[0].message.content;
          console.log(`✅ OpenAI response for page ${page.id}: ${extractedText?.length || 0} chars`);
          
          // Parse with robustJsonArray
          const rawSubsidies = robustJsonArray(extractedText);
          console.log(`📊 Found ${rawSubsidies.length} potential subsidies in page ${page.id}`);
          
          let pageSubsidiesCreated = 0;
          for (const rawSub of rawSubsidies) {
            const subsidy = coerceSubsidy(rawSub);
            
            // Skip empty subsidies
            if (!subsidy.title && !subsidy.description) {
              console.log(`⚠️ Skipping empty subsidy from page ${page.id}`);
              continue;
            }
            
            // Compute fingerprint for idempotent inserts
            const fingerprint = makeFingerprint({
              title: subsidy.title,
              agency: subsidy.agency,
              deadline: subsidy.deadline,
              url: page.source_url
            });
            
            console.log(`💾 Inserting subsidy: ${subsidy.title || 'Untitled'} (${fingerprint})`);
            
            // Upsert into subsidies_structured
            const { error: upsertError } = await supabase
              .from('subsidies_structured')
              .upsert({
                fingerprint,
                url: page.source_url,
                run_id,
                title: subsidy.title,
                description: subsidy.description,
                eligibility: subsidy.eligibility,
                deadline: subsidy.deadline,
                funding_type: subsidy.funding_type,
                agency: subsidy.agency,
                sector: subsidy.sector,
                region: subsidy.region,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { 
                onConflict: 'fingerprint',
                ignoreDuplicates: false
              });
            
            if (upsertError) {
              console.error(`❌ DB error for subsidy ${fingerprint}:`, upsertError.message);
              errorsCount++;
              await logAiError(run_id, page.id, page.source_url, 'db_insert', upsertError.message, extractedText.slice(0, 500));
            } else {
              console.log(`✅ Successfully inserted subsidy ${fingerprint}`);
              pageSubsidiesCreated++;
              subsidiesCreated++;
            }
          }
          
          console.log(`✅ Page ${page.id} complete: ${pageSubsidiesCreated} subsidies created`);
          pagesProcessed++;
          
        } catch (chunkError) {
          console.error(`❌ Error processing page ${page.id}:`, chunkError.message);
          errorsCount++;
          await logAiError(run_id, page.id, page.source_url, 'ai_api', (chunkError as Error).message);
        }
        
      } catch (pageError) {
        console.error(`❌ Critical error with page ${page.id}:`, pageError.message);
        errorsCount++;
        await logAiError(run_id, page.id, page.source_url, 'processing', (pageError as Error).message);
      }
    }

    console.log(`\n🏁 AI_RUN_END {run_id: ${run_id}, pages_processed: ${pagesProcessed}, subs_created: ${subsidiesCreated}, failed: ${errorsCount}}`);

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    // Finish envelope: update ai_content_runs with metrics
    await supabase
      .from('ai_content_runs')
      .update({
        pages_seen: pagesSeen,
        pages_eligible: pagesEligible,
        pages_processed: pagesProcessed,
        subs_created: subsidiesCreated,
        status: 'completed',
        ended_at: new Date().toISOString(),
        notes: subsidiesCreated > 0 ? 'Success' : 'No subsidies found'
      })
      .eq('id', aiRunId);

    // Update pipeline_runs if run_id present
    if (run_id) {
      const nextStage = subsidiesCreated > 0 ? 'forms' : 'done';
      const nextProgress = subsidiesCreated > 0 ? 75 : 100;
      const nextStatus = nextStage === 'done' ? 'completed' : 'running';
      const reason = subsidiesCreated === 0 ? 'no_subsidies_found' : undefined;
      
      await supabase
        .from('pipeline_runs')
        .update({
          stage: nextStage,
          progress: nextProgress,
          status: nextStatus,
          reason,
          ended_at: nextStage === 'done' ? new Date().toISOString() : undefined,
          stats: {
            ai: {
              pages_seen: pagesSeen,
              pages_eligible: pagesEligible,
              pages_processed: pagesProcessed,
              subs_created: subsidiesCreated,
              errors_count: errorsCount,
              duration_ms: durationMs
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', run_id);
    }

    logEvent('ai.run.done', run_id, { 
      pages_seen: pagesSeen,
      pages_eligible: pagesEligible, 
      pages_processed: pagesProcessed, 
      subs_created: subsidiesCreated,
      errors_count: errorsCount,
      duration_ms: durationMs 
    });

    return new Response(JSON.stringify({
      success: true,
      run_id,
      session_id: sessionId,
      model,
      pages_seen: pagesSeen,
      pages_eligible: pagesEligible,
      pages_processed: pagesProcessed,
      subsidies_created: subsidiesCreated,
      errors_count: errorsCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  
  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    console.log(`AI_RUN_ERROR {run_id: ${runId}, reason: "${(error as Error).message}"}`);
    logEvent('ai.run.error', runId, { error: (error as Error).message, duration_ms: durationMs });
    
    // Finish envelope on error
    if (aiRunId) {
      await supabase
        .from('ai_content_runs')
        .update({
          status: 'error',
          ended_at: new Date().toISOString(),
          notes: `Error: ${(error as Error).message}`
        })
        .eq('id', aiRunId);
    } else if (runId) {
      // Create error record even if aiRunId wasn't set
      await supabase.from('ai_content_runs').insert({
        run_id: runId,
        model: 'unknown',
        pages_seen: 0,
        pages_eligible: 0,
        pages_processed: 0,
        subs_created: 0,
        status: 'error',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        notes: `Error: ${(error as Error).message}`
      });
    }
    
    // Update pipeline_runs on error
    if (runId) {
      await supabase
        .from('pipeline_runs')
        .update({
          status: 'failed',
          ended_at: new Date().toISOString(),
          error: {
            stage: 'ai',
            message: (error as Error).message,
            timestamp: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', runId);
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: (error as Error).message,
      run_id: runId,
      pages_seen: 0,
      pages_eligible: 0,
      pages_processed: 0,
      subsidies_created: 0,
      errors_count: 1
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function logAiError(runId: string | null, pageId: string, sourceUrl: string, errorType: string, message: string, snippet?: string) {
  if (!runId) return;
  
  try {
    await supabase.from('ai_content_errors').insert({
      run_id: runId,
      page_id: pageId,
      source_url: sourceUrl,
      error_type: errorType,
      message,
      snippet: snippet?.slice(0, 2000),
      stage: 'processing',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging AI content error:', error);
  }
}