import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const allowRecentFallback = Deno.env.get('ALLOW_RECENT_FALLBACK') === 'true';

if (!openAIApiKey) {
  throw new Error('OpenAI API key not found');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let runId: string | null = null;

  try {
    const { source, run_id, page_ids, quality_threshold = 0.4 } = await req.json();
    runId = run_id;
    
    console.log(`🤖 Starting AI content processing. Run: ${run_id}, Page IDs: ${page_ids?.length || 'none'}, Allow fallback: ${allowRecentFallback}`);
    
    // Create AI content run tracking
    const { data: aiContentRun } = await supabase
      .from('ai_content_runs')
      .insert({
        run_id: run_id,
        started_at: new Date().toISOString(),
        model: 'gpt-4.1-2025-04-14'
      })
      .select()
      .single();
    
    // Update pipeline run to AI stage
    if (run_id) {
      await updatePipelineRun(run_id, {
        status: 'running',
        stage: 'ai',
        progress: 50
      });
    }

    let pages: any[] = [];

    // Get pages to process
    if (page_ids && page_ids.length > 0) {
      // Process specific page IDs
      const { data: pageData, error: fetchError } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .in('id', page_ids);

      if (fetchError) throw fetchError;
      pages = pageData || [];
    } else if (run_id) {
      // Process pages for specific run
      const { data: pageData, error: fetchError } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .eq('run_id', run_id);

      if (fetchError) throw fetchError;
      pages = pageData || [];

      // Filter pages with sufficient content (200+ chars guard)
      const substantialPages = pages.filter(p => {
        const contentLength = (p.text_markdown?.length || 0) + 
                            (p.raw_text?.length || 0) + 
                            (p.raw_html?.length || 0);
        return contentLength >= 200;
      });

      // Log insufficient content pages to harvest_issues
      const insufficientPages = pages.filter(p => {
        const contentLength = (p.text_markdown?.length || 0) + 
                            (p.raw_text?.length || 0) + 
                            (p.raw_html?.length || 0);
        return contentLength < 200;
      });

      for (const page of insufficientPages) {
        const contentLength = (page.text_markdown?.length || 0) + 
                            (page.raw_text?.length || 0) + 
                            (page.raw_html?.length || 0);
        
        await supabase.from('harvest_issues').insert({
          run_id,
          page_id: page.id,
          source_url: page.source_url,
          reason: 'Insufficient content for AI processing',
          content_length: contentLength
        });
      }

      pages = substantialPages;

      // Fallback to recent content only if enabled and no substantial pages
      if (pages.length === 0 && allowRecentFallback) {
        console.log(`⚠️ No substantial content for run ${run_id}, using recent fallback (ALLOW_RECENT_FALLBACK=true)`);
        
        const { data: recentPages, error: recentError } = await supabase
          .from('raw_scraped_pages')
          .select('*')
          .like('source_url', '%franceagrimer%')
          .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
          .limit(10);

        if (!recentError && recentPages?.length > 0) {
          pages = recentPages.filter(p => {
            const contentLength = (p.text_markdown?.length || 0) + 
                                (p.raw_text?.length || 0) + 
                                (p.raw_html?.length || 0);
            return contentLength >= 200;
          });
          console.log(`📄 Using ${pages.length} recent FranceAgriMer pages (fallback mode)`);
        }
      }
    }

    console.log(`📄 Processing ${pages.length} pages with sufficient content`);

    if (pages.length === 0) {
      const message = `No pages found for processing. Run: ${run_id}, Page IDs: ${page_ids?.length || 'none'}`;
      console.log(`⚠️ ${message}`);
      
      if (run_id) {
        await updatePipelineRun(run_id, {
          stage: 'done',
          progress: 100,
          status: 'completed',
          ended_at: new Date().toISOString(),
          stats: { ai: { pages_processed: 0, successful: 0, failed: 0 } }
        });
      }

      return new Response(JSON.stringify({
        pages_processed: 0,
        successful: 0,
        failed: 0,
        message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let successful = 0;
    let failed = 0;

    // Process each page
    for (const page of pages) {
      const pageStartTime = Date.now();
      try {
        console.log(`🔍 Processing page: ${page.source_url} (${page.id})`);
        
        const extractedData = await extractSubsidyData(page);
        const pageProcessingTime = Date.now() - pageStartTime;
        
        if (extractedData && extractedData.length > 0) {
          // Store in subsidies_structured table
          const { error: insertError } = await supabase
            .from('subsidies_structured')
            .insert(extractedData.map(subsidy => ({
              ...subsidy,
              url: page.source_url,
              run_id: run_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })));

          if (insertError) {
            console.error(`❌ Error inserting subsidies for ${page.source_url}:`, insertError);
            await logError(run_id, page.id, page.source_url, 'insert', insertError.message);
            failed++;
          } else {
            console.log(`✅ ${page.id}, ${page.source_url}, ${(page.text_markdown?.length || 0) + (page.raw_text?.length || 0) + (page.raw_html?.length || 0)} chars, success, 0 tokens, ${pageProcessingTime}ms`);
            successful += extractedData.length;
          }
        } else {
          console.log(`⚠️ ${page.id}, ${page.source_url}, ${(page.text_markdown?.length || 0) + (page.raw_text?.length || 0) + (page.raw_html?.length || 0)} chars, no_data, 0 tokens, ${pageProcessingTime}ms`);
          await logError(run_id, page.id, page.source_url, 'extraction', 'No subsidies found in content');
        }

      } catch (error) {
        const pageProcessingTime = Date.now() - pageStartTime;
        console.error(`❌ ${page.id}, ${page.source_url}, ${(page.text_markdown?.length || 0) + (page.raw_text?.length || 0) + (page.raw_html?.length || 0)} chars, error, 0 tokens, ${pageProcessingTime}ms:`, error);
        await logError(run_id, page.id, page.source_url, 'processing', error.message);
        failed++;
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    console.log(`🎯 AI processing completed in ${totalProcessingTime}ms: ${successful} subsidies created, ${failed} errors`);

    // Update pipeline run with results
    if (run_id) {
      const nextStage = successful > 0 ? 'forms' : 'done';
      const nextProgress = successful > 0 ? 75 : 100;
      const runStatus = nextStage === 'done' ? 'completed' : 'running';
      
      await updatePipelineRun(run_id, {
        stage: nextStage,
        progress: nextProgress,
        status: runStatus,
        ended_at: nextStage === 'done' ? new Date().toISOString() : undefined,
        stats: {
          ai: {
            pages_processed: pages.length,
            successful,
            failed,
            processing_time_ms: totalProcessingTime
          }
        }
      });
    }

    return new Response(JSON.stringify({
      pages_processed: pages.length,
      successful,
      failed,
      processing_time_ms: totalProcessingTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const totalProcessingTime = Date.now() - startTime;
    console.error('❌ AI content processing error:', error);
    
    if (runId) {
      await updatePipelineRun(runId, {
        status: 'failed',
        ended_at: new Date().toISOString(),
        error: {
          stage: 'ai',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    return new Response(JSON.stringify({ 
      error: error.message,
      pages_processed: 0,
      successful: 0,
      failed: 1,
      processing_time_ms: totalProcessingTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function updatePipelineRun(runId: string, updates: any) {
  try {
    const { error } = await supabase
      .from('pipeline_runs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', runId);

    if (error) {
      console.error('Error updating pipeline run:', error);
    }
  } catch (error) {
    console.error('Error in updatePipelineRun:', error);
  }
}

async function logError(runId: string | null, pageId: string, sourceUrl: string, stage: string, message: string) {
  if (!runId) return;
  
  try {
    await supabase.from('ai_content_errors').insert({
      run_id: runId,
      page_id: pageId,
      source_url: sourceUrl,
      stage,
      message,
      snippet: message.slice(0, 500)
    });
  } catch (error) {
    console.error('Error logging AI content error:', error);
  }
}

async function extractSubsidyData(page: any) {
  try {
    const content = page.text_markdown || page.raw_text || page.raw_html;
    
    if (!content || content.length < 100) {
      console.log(`⚠️ Insufficient content in ${page.source_url}`);
      return [];
    }

    const prompt = `Extract agricultural subsidy information from this French text. Return a JSON array of subsidies found.

For each subsidy, extract:
- title: The name/title of the subsidy program
- description: A detailed description of what the subsidy covers
- eligibility: Who is eligible and requirements
- deadline: Application deadline if mentioned (format: YYYY-MM-DD)
- funding_type: Type of funding (grant, loan, etc.)
- agency: The agency providing the subsidy
- sector: Agricultural sector (fruits, vegetables, livestock, etc.)
- region: Geographic region if specified

Text to analyze:
${content.slice(0, 8000)}

Return only valid JSON array, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert at extracting agricultural subsidy information from French government documents. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const extractedText = aiResponse.choices[0].message.content;
    
    try {
      const subsidies = JSON.parse(extractedText);
      return Array.isArray(subsidies) ? subsidies : [subsidies];
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw AI response:', extractedText);
      return [];
    }

  } catch (error) {
    console.error('Error in extractSubsidyData:', error);
    return [];
  }
}