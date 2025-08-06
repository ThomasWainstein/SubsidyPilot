import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  error_message?: string;
  last_checked: string;
  metrics?: Record<string, any>;
}

interface RecoveryAction {
  component: string;
  action: 'retry_failed_pages' | 'clear_orphaned_logs' | 'fix_foreign_keys' | 'update_urls';
  description: string;
  auto_fix_available: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config = {
      supabase_url: Deno.env.get('SUPABASE_URL'),
      supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    };

    if (!config.supabase_url || !config.supabase_service_key) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(config.supabase_url, config.supabase_service_key);
    const { action = 'health_check', component, auto_fix = false } = await req.json();

    console.log(`🏥 Pipeline Health Monitor: ${action}`);

    if (action === 'health_check') {
      const healthResults = await performComprehensiveHealthCheck(supabase);
      const recoveryActions = await identifyRecoveryActions(supabase, healthResults);
      
      return new Response(JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        overall_status: calculateOverallHealth(healthResults),
        components: healthResults,
        recovery_actions: recoveryActions,
        summary: generateHealthSummary(healthResults)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'auto_recover' && auto_fix) {
      const recoveryResults = await performAutoRecovery(supabase);
      
      return new Response(JSON.stringify({
        success: true,
        recovery_applied: recoveryResults,
        message: 'Auto-recovery completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'fix_foreign_keys') {
      const fixResults = await fixForeignKeyConstraints(supabase);
      
      return new Response(JSON.stringify({
        success: true,
        fixes_applied: fixResults,
        message: 'Foreign key constraints fixed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Pipeline Health Monitor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performComprehensiveHealthCheck(supabase: any): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Check Database Connectivity
  const dbCheck = await checkComponent('database', async () => {
    const { data, error } = await supabase.from('raw_scraped_pages').select('count').limit(1);
    if (error) throw error;
    return { tables_accessible: true };
  });
  results.push(dbCheck);

  // Check Raw Data Pipeline
  const rawDataCheck = await checkComponent('raw_data_pipeline', async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentPages, error: pagesError } = await supabase
      .from('raw_scraped_pages')
      .select('count')
      .gte('created_at', oneDayAgo);
    
    if (pagesError) throw pagesError;

    const { data: failedPages, error: failedError } = await supabase
      .from('raw_scraped_pages')
      .select('count')
      .eq('status', 'failed')
      .gte('created_at', oneDayAgo);

    if (failedError) throw failedError;

    return {
      recent_pages: recentPages?.length || 0,
      failed_pages: failedPages?.length || 0,
      success_rate: recentPages?.length ? ((recentPages.length - (failedPages?.length || 0)) / recentPages.length) * 100 : 0
    };
  });
  results.push(rawDataCheck);

  // Check AI Processing Pipeline
  const aiCheck = await checkComponent('ai_processing', async () => {
    const { data: structuredSubsidies, error: structuredError } = await supabase
      .from('subsidies_structured')
      .select('count')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (structuredError) throw structuredError;

    // Check for foreign key constraint violations
    const { data: orphanedStructured, error: orphanedError } = await supabase
      .from('subsidies_structured')
      .select('id, raw_log_id')
      .not('raw_log_id', 'is', null)
      .limit(10);

    if (orphanedError) throw orphanedError;

    const orphanedCount = orphanedStructured ? 
      await checkOrphanedRecords(supabase, orphanedStructured) : 0;

    return {
      recent_extractions: structuredSubsidies?.length || 0,
      orphaned_records: orphanedCount,
      extraction_health: orphanedCount === 0 ? 'healthy' : 'degraded'
    };
  });
  results.push(aiCheck);

  // Check Romanian Source Health
  const romanianCheck = await checkComponent('romanian_sources', async () => {
    const romanianUrls = [
      'https://www.afir.info/',
      'https://www.madr.ro/',
      'https://www.fonduri-ue.ro/',
      'https://mfe.gov.ro/'
    ];

    const urlChecks = await Promise.allSettled(
      romanianUrls.map(async url => {
        const response = await fetch(url, { 
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgriTool/1.0)' }
        });
        return { url, status: response.status, accessible: response.ok };
      })
    );

    const accessible = urlChecks.filter(result => 
      result.status === 'fulfilled' && result.value.accessible
    ).length;

    return {
      total_sources: romanianUrls.length,
      accessible_sources: accessible,
      accessibility_rate: (accessible / romanianUrls.length) * 100,
      failed_sources: urlChecks
        .filter(result => result.status === 'rejected' || !result.value?.accessible)
        .map(result => result.status === 'fulfilled' ? result.value.url : 'unknown')
    };
  });
  results.push(romanianCheck);

  // Check French Source Health
  const frenchCheck = await checkComponent('french_sources', async () => {
    const frenchUrls = [
      'https://www.franceagrimer.fr/',
      'https://agriculture.gouv.fr/'
    ];

    const urlChecks = await Promise.allSettled(
      frenchUrls.map(async url => {
        const response = await fetch(url, { 
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgriTool/1.0)' }
        });
        return { url, status: response.status, accessible: response.ok };
      })
    );

    const accessible = urlChecks.filter(result => 
      result.status === 'fulfilled' && result.value.accessible
    ).length;

    return {
      total_sources: frenchUrls.length,
      accessible_sources: accessible,
      accessibility_rate: (accessible / frenchUrls.length) * 100
    };
  });
  results.push(frenchCheck);

  return results;
}

async function checkComponent(
  componentName: string, 
  checkFunction: () => Promise<any>
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const metrics = await checkFunction();
    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Determine status based on metrics
    if (componentName === 'ai_processing' && metrics.orphaned_records > 0) {
      status = 'degraded';
    } else if (componentName.includes('sources') && metrics.accessibility_rate < 50) {
      status = 'unhealthy';
    } else if (componentName.includes('sources') && metrics.accessibility_rate < 80) {
      status = 'degraded';
    } else if (responseTime > 10000) {
      status = 'degraded';
    }

    return {
      component: componentName,
      status,
      response_time_ms: responseTime,
      last_checked: new Date().toISOString(),
      metrics
    };
  } catch (error) {
    return {
      component: componentName,
      status: 'unhealthy',
      response_time_ms: Date.now() - startTime,
      error_message: error.message,
      last_checked: new Date().toISOString()
    };
  }
}

async function checkOrphanedRecords(supabase: any, structuredRecords: any[]): Promise<number> {
  let orphanedCount = 0;
  
  for (const record of structuredRecords) {
    const { data: rawLog } = await supabase
      .from('raw_logs')
      .select('id')
      .eq('id', record.raw_log_id)
      .single();
    
    if (!rawLog) {
      orphanedCount++;
    }
  }
  
  return orphanedCount;
}

async function identifyRecoveryActions(
  supabase: any, 
  healthResults: HealthCheckResult[]
): Promise<RecoveryAction[]> {
  const actions: RecoveryAction[] = [];

  // Check for foreign key issues
  const aiProcessingHealth = healthResults.find(r => r.component === 'ai_processing');
  if (aiProcessingHealth?.metrics?.orphaned_records > 0) {
    actions.push({
      component: 'ai_processing',
      action: 'fix_foreign_keys',
      description: `Fix ${aiProcessingHealth.metrics.orphaned_records} orphaned subsidies_structured records`,
      auto_fix_available: true
    });
  }

  // Check for failed pages that can be retried
  const rawDataHealth = healthResults.find(r => r.component === 'raw_data_pipeline');
  if (rawDataHealth?.metrics?.failed_pages > 0) {
    actions.push({
      component: 'raw_data_pipeline',
      action: 'retry_failed_pages',
      description: `Retry processing ${rawDataHealth.metrics.failed_pages} failed pages`,
      auto_fix_available: true
    });
  }

  // Check for inaccessible Romanian sources
  const romanianHealth = healthResults.find(r => r.component === 'romanian_sources');
  if (romanianHealth?.metrics?.accessibility_rate < 80) {
    actions.push({
      component: 'romanian_sources',
      action: 'update_urls',
      description: 'Update Romanian source URLs to working alternatives',
      auto_fix_available: false
    });
  }

  return actions;
}

async function performAutoRecovery(supabase: any): Promise<string[]> {
  const appliedFixes: string[] = [];

  try {
    // Fix foreign key constraints
    const fkFixes = await fixForeignKeyConstraints(supabase);
    if (fkFixes.length > 0) {
      appliedFixes.push(`Fixed ${fkFixes.length} foreign key constraint violations`);
    }

    // Retry failed pages
    const { data: failedPages } = await supabase
      .from('raw_scraped_pages')
      .select('id')
      .eq('status', 'failed')
      .limit(10);

    if (failedPages && failedPages.length > 0) {
      await supabase
        .from('raw_scraped_pages')
        .update({ status: 'raw' })
        .in('id', failedPages.map(p => p.id));
      
      appliedFixes.push(`Reset ${failedPages.length} failed pages for retry`);
    }

  } catch (error) {
    console.error('❌ Auto-recovery failed:', error);
    appliedFixes.push(`Auto-recovery error: ${error.message}`);
  }

  return appliedFixes;
}

async function fixForeignKeyConstraints(supabase: any): Promise<string[]> {
  const fixes: string[] = [];

  try {
    // Find orphaned subsidies_structured records
    const { data: orphanedSubsidies, error } = await supabase
      .from('subsidies_structured')
      .select('id, raw_log_id')
      .not('raw_log_id', 'is', null);

    if (error) {
      console.error('❌ Error finding orphaned subsidies:', error);
      return fixes;
    }

    if (!orphanedSubsidies || orphanedSubsidies.length === 0) {
      return fixes;
    }

    // Check which ones are actually orphaned
    for (const subsidy of orphanedSubsidies) {
      const { data: rawLog } = await supabase
        .from('raw_logs')
        .select('id')
        .eq('id', subsidy.raw_log_id)
        .single();

      if (!rawLog) {
        // Create missing raw_log entry
        const { error: insertError } = await supabase
          .from('raw_logs')
          .insert({
            id: subsidy.raw_log_id,
            payload: JSON.stringify({
              recovery_action: 'auto_generated',
              original_subsidy_id: subsidy.id,
              timestamp: new Date().toISOString()
            }),
            processed: true,
            processed_at: new Date().toISOString()
          });

        if (!insertError) {
          fixes.push(`Created missing raw_log entry for subsidy ${subsidy.id}`);
        } else {
          console.warn(`⚠️ Failed to create raw_log entry for ${subsidy.id}:`, insertError);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error in fixForeignKeyConstraints:', error);
  }

  return fixes;
}

function calculateOverallHealth(results: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
  const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
  const degradedCount = results.filter(r => r.status === 'degraded').length;

  if (unhealthyCount > 0) return 'unhealthy';
  if (degradedCount > 1) return 'degraded';
  if (degradedCount > 0) return 'degraded';
  return 'healthy';
}

function generateHealthSummary(results: HealthCheckResult[]): string {
  const healthy = results.filter(r => r.status === 'healthy').length;
  const degraded = results.filter(r => r.status === 'degraded').length;
  const unhealthy = results.filter(r => r.status === 'unhealthy').length;
  const total = results.length;

  return `System Health: ${healthy}/${total} healthy, ${degraded} degraded, ${unhealthy} unhealthy components`;
}