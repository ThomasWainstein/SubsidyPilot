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

    const { run_id, session_id } = await req.json();
    
    console.log(`🔧 Post-harvest patch for run ${run_id}, session ${session_id}`);
    
    // Find pages from this session that don't have run_id set
    const { data: orphanPages, error: selectError } = await supabase
      .from('raw_scraped_pages')
      .select('id')
      .is('run_id', null)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .limit(100);

    if (selectError) {
      throw new Error(`Failed to query orphan pages: ${selectError.message}`);
    }

    if (!orphanPages || orphanPages.length === 0) {
      console.log('✅ No orphan pages found');
      return new Response(JSON.stringify({ 
        success: true, 
        patched: 0,
        message: 'No orphan pages found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update orphan pages to have the correct run_id
    const { error: updateError } = await supabase
      .from('raw_scraped_pages')
      .update({ run_id: run_id })
      .in('id', orphanPages.map(p => p.id));

    if (updateError) {
      throw new Error(`Failed to patch orphan pages: ${updateError.message}`);
    }

    console.log(`✅ Patched ${orphanPages.length} orphan pages with run_id ${run_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      patched: orphanPages.length,
      message: `Patched ${orphanPages.length} orphan pages`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Post-harvest patch error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});