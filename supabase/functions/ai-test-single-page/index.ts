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
    const { page_id } = await req.json();
    if (!page_id) {
      return new Response(JSON.stringify({ success: false, error: 'MISSING_PAGE_ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Generate run id and invoke the main processor for a single page
    const run_id = crypto.randomUUID();

    const { data: invokeRes, error: invokeErr } = await supabase.functions.invoke('ai-content-processor', {
      body: {
        run_id,
        page_ids: [page_id],
        quality_threshold: 0.3,
        min_len: 200,
        allow_recent_fallback: false,
      }
    });

    if (invokeErr) {
      return new Response(JSON.stringify({ success: false, error: invokeErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pull the latest raw extraction for this page
    const { data: rawRows, error: rawErr } = await supabase
      .from('ai_raw_extractions')
      .select('*')
      .eq('page_id', page_id)
      .order('created_at', { ascending: false })
      .limit(1);

    // Also check if anything was inserted into structured table for this run
    const { data: structuredRows, error: structErr } = await supabase
      .from('subsidies_structured')
      .select('id, title, agency, deadline, url, created_at')
      .eq('run_id', run_id)
      .order('created_at', { ascending: false });

    return new Response(JSON.stringify({
      success: true,
      run: invokeRes,
      run_id,
      raw_extraction: rawRows?.[0] || null,
      structured_inserts: structuredRows || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
