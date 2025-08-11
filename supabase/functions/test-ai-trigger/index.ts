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

    const { run_id } = await req.json();
    
    console.log(`🧪 Testing AI processor for run: ${run_id}`);
    
    // Invoke AI content processor
    const { data, error } = await supabase.functions.invoke('ai-content-processor', {
      body: {
        run_id,
        quality_threshold: 0.3
      }
    });

    if (error) {
      console.error('AI processor error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('AI processor response:', data);

    // Check results
    const { data: aiRun } = await supabase
      .from('ai_content_runs')
      .select('*')
      .eq('run_id', run_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: subsidyCount } = await supabase
      .from('subsidies_structured')
      .select('count')
      .eq('run_id', run_id);

    const { data: errorCount } = await supabase
      .from('ai_content_errors')
      .select('count')
      .eq('run_id', run_id);

    return new Response(JSON.stringify({
      success: true,
      ai_response: data,
      ai_run_record: aiRun,
      subsidies_created: subsidyCount?.[0]?.count || 0,
      errors_logged: errorCount?.[0]?.count || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});