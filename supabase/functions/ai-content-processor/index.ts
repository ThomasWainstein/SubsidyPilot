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

    // Select pages: by page_ids OR by run_id; filter eligible content
    if (page_ids && page_ids.length > 0) {
      const { data: pageData, error: fetchError } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .in('id', page_ids);

      if (fetchError) throw fetchError;
      pages = pageData || [];
    } else if (run_id) {
      const { data: pageData, error: fetchError } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .eq('run_id', run_id);

      if (fetchError) throw fetchError;
      pages = pageData || [];
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

    // Process each eligible page
    console.log(`🔄 Starting to process ${eligiblePages.length} eligible pages...`);
    
    try {
      for (const page of eligiblePages.slice(0, 50)) { // Safety limit
        try {
          console.log(`AI_PAGE_PROCESS {page_id: ${page.id}, url: "${page.source_url}"}`);
          logEvent('ai.page.start', run_id, { page_id: page.id, url: page.source_url });
        
        const content = page.text_markdown || page.raw_text || page.raw_html || '';
        console.log(`📄 Page ${page.id} content length: ${content.length} chars`);
        
        if (content.length < min_len) {
          console.log(`⚠️ Page ${page.id} content too short (${content.length} < ${min_len}), skipping`);
          continue;
        }

        // Chunk content if needed
        const chunks = chunkText(content, AI_CHUNK_SIZE);
        console.log(`📝 Page ${page.id} split into ${chunks.length} chunks`);
        
        for (const [chunkIndex, chunk] of chunks.entries()) {
          try {
            console.log(`🧠 Processing chunk ${chunkIndex + 1}/${chunks.length} for page ${page.id}`);
            
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
${chunk}

Return only valid JSON array, no other text.`;

            console.log(`🔄 Making OpenAI API call with model: ${model}`);
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
                max_tokens: 2000
              }),
            });

            console.log(`📡 OpenAI API response status: ${aiResponse.status}`);
            
            if (!aiResponse.ok) {
              const errorText = await aiResponse.text();
              console.error(`❌ OpenAI API error: ${aiResponse.status} - ${errorText}`);
              throw new Error(`OpenAI API error: ${aiResponse.status} - ${errorText}`);
            }

            const aiData = await aiResponse.json();
            const extractedText = aiData.choices[0].message.content;
            console.log(`✅ OpenAI response received, length: ${extractedText?.length || 0} chars`);
            
            // Parse with robustJsonArray, map each using coerceSubsidy
            const rawSubsidies = robustJsonArray(extractedText);
            
            for (const rawSub of rawSubsidies) {
              const subsidy = coerceSubsidy(rawSub);
              
              // Skip empty subsidies
              if (!subsidy.title && !subsidy.description) continue;
              
              // Compute fingerprint for idempotent inserts
              const fingerprint = makeFingerprint({
                title: subsidy.title,
                agency: subsidy.agency,
                deadline: subsidy.deadline,
                url: page.source_url
              });
              
              // Upsert into subsidies_structured on fingerprint
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
                  errorsCount++;
                  await logAiError(run_id, page.id, page.source_url, 'db_insert', upsertError.message, extractedText.slice(0, 500));
                  logEvent('ai.page.insert.error', run_id, { page_id: page.id, error: upsertError.message });
                } else {
                  subsidiesCreated++;
                  logEvent('ai.page.insert.success', run_id, { page_id: page.id, fingerprint });
                }
            }
            
          } catch (chunkError) {
            errorsCount++;
            await logAiError(run_id, page.id, page.source_url, 'ai_api', (chunkError as Error).message);
            logEvent('ai.page.chunk.error', run_id, { page_id: page.id, error: (chunkError as Error).message });
          }
        }
        
        pagesProcessed++;
        logEvent('ai.page.done', run_id, { page_id: page.id, chunks: chunks.length });
        
        } catch (pageError) {
          errorsCount++;
          await logAiError(run_id, page.id, page.source_url, 'processing', (pageError as Error).message);
          logEvent('ai.page.error', run_id, { page_id: page.id, error: (pageError as Error).message });
        }
      }
    } catch (outerError) {
      console.error(`❌ Critical error in processing loop: ${(outerError as Error).message}`);
      errorsCount++;
    }

    console.log(`AI_RUN_END {run_id: ${run_id}, pages_processed: ${pagesProcessed}, subs_created: ${subsidiesCreated}, failed: ${errorsCount}}`);

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