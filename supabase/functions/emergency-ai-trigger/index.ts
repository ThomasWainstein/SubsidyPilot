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
    
    console.log(`🚀 Emergency AI trigger for stuck run ${run_id}`);
    
    // Manually invoke AI content processor
    const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-content-processor', {
      body: {
        run_id: run_id,
        source: 'run', 
        quality_threshold: 0.3
      }
    });

    console.log('AI processor result:', aiResult);
    console.log('AI processor error:', aiError);

    // Force run progression regardless
    const updateData = {
      stage: aiResult?.successful > 0 ? 'forms' : 'done',
      progress: aiResult?.successful > 0 ? 75 : 100,
      status: 'completed',
      updated_at: new Date().toISOString()
    };

    if (aiResult?.successful === 0) {
      updateData.status = 'completed';
      // Don't add ended_at here since we can't update via function
    }

    // Since we can't update via SQL, return the result for manual verification
    return new Response(JSON.stringify({ 
      success: true,
      message: `AI processing ${aiError ? 'failed' : 'completed'}`,
      ai_result: aiResult,
      ai_error: aiError,
      suggested_update: updateData,
      verification_queries: [
        "SELECT count(*) FROM subsidies_structured WHERE run_id = '" + run_id + "';",
        "SELECT * FROM ai_content_runs WHERE run_id = '" + run_id + "' ORDER BY created_at DESC LIMIT 1;",
        "SELECT id, status, stage, progress FROM pipeline_runs WHERE id = '" + run_id + "';"
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Emergency trigger error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});