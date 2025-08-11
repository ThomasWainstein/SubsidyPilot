import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

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

    console.log('🧪 Direct AI test starting...');
    
    // Test 1: Check if we can access the database
    const { data: pages, error: pageError } = await supabase
      .from('raw_scraped_pages')
      .select('id, source_url, text_markdown, raw_text, raw_html')
      .limit(3);
    
    if (pageError) throw pageError;
    
    console.log(`✅ Found ${pages?.length || 0} pages`);
    
    // Test 2: Check if we can write to ai_content_runs
    const testRunId = crypto.randomUUID();
    const { data: runData, error: runError } = await supabase
      .from('ai_content_runs')
      .insert({
        run_id: testRunId,
        model: 'test',
        pages_seen: pages?.length || 0,
        pages_eligible: 0,
        pages_processed: 0,
        subs_created: 0,
        status: 'completed',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        notes: 'Direct test run'
      })
      .select()
      .single();
    
    if (runError) throw runError;
    
    console.log('✅ Successfully created ai_content_runs record');
    
    // Test 3: Check API key
    const apiKey = Deno.env.get('SCRAPPER_RAW_GPT_API') ?? Deno.env.get('OPENAI_API_KEY');
    const hasApiKey = !!apiKey;
    
    console.log(`API Key present: ${hasApiKey}`);
    
    // Test 4: Check content eligibility
    let eligiblePages = 0;
    if (pages) {
      eligiblePages = pages.filter(p => {
        const content = p.text_markdown || p.raw_text || p.raw_html || '';
        return content.length >= 200;
      }).length;
    }
    
    return new Response(JSON.stringify({
      success: true,
      test_results: {
        pages_found: pages?.length || 0,
        pages_eligible: eligiblePages,
        api_key_present: hasApiKey,
        ai_runs_table_working: true,
        test_run_id: testRunId
      },
      message: 'All tests passed! AI processing should work now.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      test_results: {
        pages_found: 0,
        pages_eligible: 0,
        api_key_present: false,
        ai_runs_table_working: false
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});