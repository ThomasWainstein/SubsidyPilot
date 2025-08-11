import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SLO {
  min_fr_pages_per_6h: number;
  max_orphans: number;
  max_ai_errors_24h: number;
  ai_stall_minutes: number;
}

interface HealthFlag {
  flag: string;
  severity: 'info' | 'warning' | 'critical';
  count?: number;
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏥 Pipeline Health Monitor: health_check');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse request body for SLO thresholds
    const body = await req.json().catch(() => ({}));
    const slo: SLO = {
      min_fr_pages_per_6h: body.slo?.min_fr_pages_per_6h || 1,
      max_orphans: body.slo?.max_orphans || 0,
      max_ai_errors_24h: body.slo?.max_ai_errors_24h || 10,
      ai_stall_minutes: body.slo?.ai_stall_minutes || 30,
      ...body.slo
    };

    const flags: HealthFlag[] = [];

    // Check 1: French harvest activity
    const { data: harvestQuality } = await supabase
      .from('v_harvest_quality_by_source_24h')
      .select('*')
      .eq('source_site', 'franceagrimer');

    if (!harvestQuality || harvestQuality.length === 0 || harvestQuality[0].pages_harvested === 0) {
      flags.push({
        flag: 'fr_harvest_zero',
        severity: 'critical',
        count: 0,
        description: 'No French harvest activity in last 24h'
      });
    }

    // Check 2: Orphan pages
    const { data: orphanPages } = await supabase
      .from('v_orphan_pages_recent')
      .select('*');

    const totalOrphans = orphanPages?.length || 0;
    if (totalOrphans > slo.max_orphans) {
      flags.push({
        flag: 'orphans_present',
        severity: 'warning',
        count: totalOrphans,
        description: `${totalOrphans} orphan pages detected in last 6h`
      });
    }

    // Check 3: AI errors
    const { data: aiErrors } = await supabase
      .from('v_ai_errors_last_24h')
      .select('*');

    const totalAIErrors = aiErrors?.length || 0;
    if (totalAIErrors > slo.max_ai_errors_24h) {
      flags.push({
        flag: 'ai_error_spike',
        severity: 'warning',
        count: totalAIErrors,
        description: `${totalAIErrors} AI errors in last 24h (threshold: ${slo.max_ai_errors_24h})`
      });
    }

    // Check 4: AI stalled
    const { data: activeRun } = await supabase
      .from('v_active_run_status')
      .select('*')
      .maybeSingle();

    if (activeRun && activeRun.stage === 'ai') {
      const { data: lastAIActivity } = await supabase
        .from('v_ai_yield_by_run')
        .select('*')
        .eq('run_id', activeRun.id)
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastAIActivity?.ended_at) {
        const stallMinutes = (Date.now() - new Date(lastAIActivity.ended_at).getTime()) / (1000 * 60);
        if (stallMinutes > slo.ai_stall_minutes) {
          flags.push({
            flag: 'ai_stalled',
            severity: 'critical',
            count: Math.round(stallMinutes),
            description: `AI processing stalled for ${Math.round(stallMinutes)} minutes`
          });
        }
      }
    }

    // Overall health status
    const criticalCount = flags.filter(f => f.severity === 'critical').length;
    const warningCount = flags.filter(f => f.severity === 'warning').length;
    
    const healthStatus = criticalCount > 0 ? 'critical' : 
                        warningCount > 0 ? 'degraded' : 'healthy';

    // Log results
    console.log(`Health check completed: ${healthStatus} (${flags.length} flags)`);
    flags.forEach(flag => {
      console.log(`- ${flag.flag}: ${flag.description}`);
    });

    return new Response(JSON.stringify({
      status: healthStatus,
      timestamp: new Date().toISOString(),
      slo_thresholds: slo,
      flags,
      summary: {
        total_flags: flags.length,
        critical: criticalCount,
        warnings: warningCount,
        healthy: flags.length === 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Monitor error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});