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
    console.log('📊 Sync progress function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get recent sync logs
    const { data: logs, error: logsError } = await supabase
      .from('api_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('❌ Error fetching logs:', logsError);
    }

    // Get subsidy count
    const { count, error: countError } = await supabase
      .from('subsidies')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting subsidies:', countError);
    }

    // Get subsidies by source
    const { data: subsidiesBySource, error: sourceError } = await supabase
      .from('subsidies')
      .select('api_source')
      .not('api_source', 'is', null);

    if (sourceError) {
      console.error('❌ Error fetching subsidies by source:', sourceError);
    }

    // Count by source
    const sourceCounts = (subsidiesBySource || []).reduce((acc: Record<string, number>, curr) => {
      acc[curr.api_source] = (acc[curr.api_source] || 0) + 1;
      return acc;
    }, {});

    console.log('✅ Progress data retrieved successfully');

    return new Response(JSON.stringify({
      success: true,
      current_count: count || 0,
      source_breakdown: sourceCounts,
      recent_logs: logs || [],
      last_updated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Progress error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});