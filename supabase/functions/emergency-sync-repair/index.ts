import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RepairAction {
  action: 'cleanup_stuck' | 'reset_polling' | 'diagnose' | 'force_sync' | 'health_check';
  api_source?: string;
  options?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, api_source, options = {} }: RepairAction = await req.json();

    console.log(`🔧 Emergency repair action: ${action}`, { api_source, options });

    switch (action) {
      case 'diagnose':
        return await performDiagnosis(supabase);
      case 'cleanup_stuck':
        return await cleanupStuckProcesses(supabase);
      case 'reset_polling':
        return await resetPollingSchedules(supabase);
      case 'force_sync':
        return await forceSyncApiSource(supabase, api_source!, options);
      case 'health_check':
        return await performHealthCheck(supabase);
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('🚨 Emergency repair error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Emergency repair failed', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performDiagnosis(supabase: any) {
  const diagnostics = [];

  try {
    // Check for stuck processes
    const { data: stuckProcesses, error: stuckError } = await supabase
      .from('api_sync_logs')
      .select('*')
      .eq('status', 'running')
      .lt('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

    if (stuckError) throw stuckError;

    diagnostics.push({
      category: 'Stuck Processes',
      status: stuckProcesses.length > 0 ? 'critical' : 'healthy',
      message: `${stuckProcesses.length} processes stuck in running state`,
      count: stuckProcesses.length,
      recommendation: stuckProcesses.length > 0 ? 'Run cleanup_stuck action' : 'No action needed'
    });

    // Check overdue polling
    const { data: overduePolling, error: pollingError } = await supabase
      .from('change_detection_state')
      .select('*')
      .lt('last_check', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

    if (pollingError) throw pollingError;

    diagnostics.push({
      category: 'Overdue Polling',
      status: overduePolling.length > 0 ? 'warning' : 'healthy',
      message: `${overduePolling.length} API sources have overdue polling`,
      count: overduePolling.length,
      recommendation: overduePolling.length > 0 ? 'Reset polling schedules' : 'Polling up to date'
    });

    // Check subsidy data freshness
    const { data: subsidyStats, error: subsidyError } = await supabase
      .from('subsidies')
      .select('source')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (subsidyError) throw subsidyError;

    diagnostics.push({
      category: 'Data Freshness',
      status: subsidyStats.length === 0 ? 'warning' : 'healthy',
      message: `${subsidyStats.length} new subsidies added in last 24 hours`,
      count: subsidyStats.length,
      recommendation: subsidyStats.length === 0 ? 'Check if APIs are returning new data' : 'Data pipeline active'
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        diagnostics,
        timestamp: new Date().toISOString(),
        summary: {
          critical: diagnostics.filter(d => d.status === 'critical').length,
          warnings: diagnostics.filter(d => d.status === 'warning').length,
          healthy: diagnostics.filter(d => d.status === 'healthy').length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🚨 Diagnosis failed:', error);
    return new Response(
      JSON.stringify({ error: 'Diagnosis failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function cleanupStuckProcesses(supabase: any) {
  try {
    console.log('🧹 Starting cleanup of stuck processes...');
    
    // Find stuck processes (running for more than 30 minutes)
    const { data: stuckProcesses, error: findError } = await supabase
      .from('api_sync_logs')
      .select('*')
      .eq('status', 'running')
      .lt('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

    if (findError) throw findError;

    console.log(`📊 Found ${stuckProcesses.length} stuck processes`);

    // Update stuck processes to failed status
    if (stuckProcesses.length > 0) {
      const { error: updateError } = await supabase
        .from('api_sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: { reason: 'Process stuck - cleaned up by emergency repair' }
        })
        .in('id', stuckProcesses.map(p => p.id));

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        cleaned_processes: stuckProcesses.length,
        cleanup_timestamp: new Date().toISOString(),
        stuck_processes: stuckProcesses.map(p => ({
          id: p.id,
          api_source: p.api_source,
          started_at: p.started_at,
          minutes_stuck: Math.floor((Date.now() - new Date(p.started_at).getTime()) / (1000 * 60))
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🚨 Cleanup failed:', error);
    return new Response(
      JSON.stringify({ error: 'Cleanup failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function resetPollingSchedules(supabase: any) {
  try {
    console.log('🔄 Resetting polling schedules...');

    // Reset change detection to force new checks
    const { error: resetError } = await supabase
      .from('change_detection_state')
      .update({
        changes_detected: true,
        change_summary: 'System reset - force refresh needed',
        last_check: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('api_source', 'les-aides-fr');

    if (resetError) throw resetError;

    // Reset polling schedule
    const { error: pollingError } = await supabase
      .from('polling_schedule')
      .update({
        next_check: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        failure_count: 0,
        enabled: true
      })
      .eq('api_source', 'les-aides-fr');

    if (pollingError) throw pollingError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Polling schedules reset successfully',
        reset_timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🚨 Reset polling failed:', error);
    return new Response(
      JSON.stringify({ error: 'Reset polling failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function forceSyncApiSource(supabase: any, apiSource: string, options: Record<string, any>) {
  try {
    console.log(`🚀 Force syncing API source: ${apiSource}`, options);

    // Determine the correct edge function name
    const functionMappings: Record<string, string> = {
      'les-aides-fr': 'ingest-les-aides-orchestrator',
      'aides-territoires': 'sync-aides-territoires'
    };

    const functionName = functionMappings[apiSource] || `sync-${apiSource}`;

    // Call the appropriate edge function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        source: apiSource,
        manual_trigger: true,
        force_sync: true,
        emergency_repair: true,
        ...options
      }
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        api_source: apiSource,
        function_name: functionName,
        function_response: data,
        message: `Force sync initiated for ${apiSource}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`🚨 Force sync failed for ${apiSource}:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Force sync failed', 
        api_source: apiSource,
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function performHealthCheck(supabase: any) {
  try {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall_status: 'healthy' as 'healthy' | 'degraded' | 'critical',
      components: {} as Record<string, any>,
      metrics: {} as Record<string, any>
    };

    // Database connectivity
    try {
      const { data } = await supabase.from('subsidies').select('count').limit(1);
      healthStatus.components.database = { status: 'healthy', message: 'Connected successfully' };
    } catch (error) {
      healthStatus.components.database = { status: 'critical', message: error.message };
      healthStatus.overall_status = 'critical';
    }

    // Sync process health
    const { data: recentSyncs } = await supabase
      .from('api_sync_logs')
      .select('*')
      .gte('started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    const successRate = recentSyncs?.length > 0 
      ? (recentSyncs.filter(s => s.status === 'completed').length / recentSyncs.length) * 100 
      : 100;

    healthStatus.components.sync_processes = {
      status: successRate > 80 ? 'healthy' : successRate > 50 ? 'degraded' : 'critical',
      success_rate: successRate,
      total_syncs_last_hour: recentSyncs?.length || 0
    };

    if (successRate <= 50) {
      healthStatus.overall_status = 'critical';
    } else if (successRate <= 80 && healthStatus.overall_status === 'healthy') {
      healthStatus.overall_status = 'degraded';
    }

    return new Response(
      JSON.stringify(healthStatus),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🚨 Health check failed:', error);
    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        overall_status: 'critical',
        error: 'Health check failed',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}