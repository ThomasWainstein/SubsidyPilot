import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚨 FIXING STUCK IMPORT SYSTEM');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Clean up stuck sync jobs
    console.log('⏳ Cleaning stuck sync jobs...');
    
    const { data: stuckJobs, error: selectError } = await supabase
      .from('api_sync_logs')
      .select('id, status, started_at, api_source')
      .eq('status', 'running')
      .lt('started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // 1 hour ago

    if (selectError) {
      console.error('Error selecting stuck jobs:', selectError);
    } else {
      console.log(`Found ${stuckJobs?.length || 0} stuck jobs`);
      
      if (stuckJobs && stuckJobs.length > 0) {
        const { error: updateError } = await supabase
          .from('api_sync_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            errors: { reason: 'Stuck job - automatically failed after 1 hour' }
          })
          .in('id', stuckJobs.map(job => job.id));

        if (updateError) {
          console.error('Error updating stuck jobs:', updateError);
        } else {
          console.log(`✅ Cleaned up ${stuckJobs.length} stuck jobs`);
        }
      }
    }

    // Step 2: Reset change detection
    console.log('🔄 Resetting change detection...');
    
    const { error: changeDetectionError } = await supabase
      .from('change_detection_state')
      .update({
        changes_detected: true,
        change_summary: 'System reset - force refresh needed',
        last_check: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        updated_at: new Date().toISOString()
      })
      .eq('api_source', 'les-aides-fr');

    if (changeDetectionError) {
      console.error('Error updating change detection:', changeDetectionError);
    } else {
      console.log('✅ Reset change detection state');
    }

    // Step 3: Reset polling schedule
    console.log('📅 Resetting polling schedule...');
    
    const { error: pollingError } = await supabase
      .from('polling_schedule')
      .update({
        next_check: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago (overdue)
        failure_count: 0,
        enabled: true
      })
      .eq('api_source', 'les-aides-fr');

    if (pollingError) {
      console.error('Error updating polling schedule:', pollingError);
    } else {
      console.log('✅ Reset polling schedule');
    }

    // Step 4: Trigger fresh import
    console.log('🚀 Triggering fresh import...');
    
    try {
      const importResponse = await fetch('https://gvfgvbztagafjykncwto.supabase.co/functions/v1/ingest-les-aides-orchestrator', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force_refresh: true,
          batch_size: 100,
          reason: 'System reset - importing fresh subsidies'
        })
      });

      if (importResponse.ok) {
        const importResult = await importResponse.json();
        console.log('✅ Fresh import triggered:', importResult);
      } else {
        console.error('❌ Failed to trigger fresh import:', await importResponse.text());
      }
    } catch (importError) {
      console.error('❌ Error triggering fresh import:', importError);
    }

    // Step 5: Get current subsidy count for verification
    const { count: currentCount } = await supabase
      .from('subsidies')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Current subsidy count: ${currentCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Import system reset completed',
        stuckJobsFixed: stuckJobs?.length || 0,
        currentSubsidyCount: currentCount,
        actions: [
          'Cleaned stuck sync jobs',
          'Reset change detection',
          'Reset polling schedule',
          'Triggered fresh import'
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🚨 Error in fix-import-system:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fix import system',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});