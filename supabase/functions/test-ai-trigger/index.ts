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

    const { run_id } = await req.json();
    
    console.log(`🧪 Test AI processing for run ${run_id}`);
    
    // Directly trigger AI content processor
    const { data, error } = await supabase.functions.invoke('ai-content-processor', {
      body: {
        run_id: run_id,
        source: 'run',
        quality_threshold: 0.3
      }
    });

    if (error) {
      console.error('❌ AI processing failed:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ AI processing completed:', data);
    
    // Query results
    const { data: aiRuns } = await supabase
      .from('ai_content_runs')
      .select('*')
      .eq('run_id', run_id)
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: subsidies } = await supabase
      .from('subsidies_structured')
      .select('count')
      .eq('run_id', run_id);

    return new Response(JSON.stringify({ 
      success: true, 
      ai_result: data,
      ai_runs: aiRuns,
      subsidies_count: subsidies?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test trigger error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});