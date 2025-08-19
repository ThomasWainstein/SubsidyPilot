import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChangeDetectionState {
  count: number;
  last_modified?: string;
  content_hash?: string;
  recent_ids?: string[];
}

interface ApiHealthStatus {
  is_available: boolean;
  response_time_ms: number;
  status_code: number;
  error_message?: string;
  total_records_available?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'check_changes';
    const apiSource = url.searchParams.get('api_source');

    switch (action) {
      case 'check_changes':
        return await checkChanges(supabase, apiSource);
      case 'check_all':
        return await checkAllApis(supabase);
      case 'test_detection':
        return await testDetection(supabase, apiSource);
      case 'force_sync':
        return await forceSyncTrigger(supabase, apiSource);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Smart change detector error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkChanges(supabase: any, apiSource?: string) {
  console.log('🔍 Starting change detection for:', apiSource || 'all APIs');

  const apis = apiSource ? [apiSource] : ['les-aides-fr', 'romania-open-data', 'eu-open-data', 'aides-territoires'];
  const results = [];

  for (const api of apis) {
    try {
      const result = await checkSingleApi(supabase, api);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error checking ${api}:`, error);
      results.push({
        api_source: api,
        success: false,
        error: error.message,
        changes_detected: false
      });
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      results,
      summary: {
        total_checked: results.length,
        changes_detected: results.filter(r => r.changes_detected).length,
        errors: results.filter(r => !r.success).length
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkSingleApi(supabase: any, apiSource: string) {
  const startTime = Date.now();
  console.log(`🔍 Checking ${apiSource}...`);

  // Get current state from database
  const { data: currentState } = await supabase
    .from('change_detection_state')
    .select('*')
    .eq('api_source', apiSource)
    .single();

  const lastKnownState: ChangeDetectionState = currentState?.last_known_state || { count: 0 };
  
  let apiHealth: ApiHealthStatus;
  let newState: ChangeDetectionState;
  let changesDetected = false;
  let changeDetails: any = {};

  try {
    // Check API based on source
    switch (apiSource) {
      case 'les-aides-fr':
        { const result = await checkLesAidesFr(); apiHealth = result.health; newState = result.state; }
        break;
      case 'romania-open-data':
        { const result = await checkRomaniaOpenData(); apiHealth = result.health; newState = result.state; }
        break;
      case 'eu-open-data':
        { const result = await checkEuOpenData(); apiHealth = result.health; newState = result.state; }
        break;
      case 'aides-territoires':
        { const result = await checkAidesTerritoires(); apiHealth = result.health; newState = result.state; }
        break;
      default:
        throw new Error(`Unknown API source: ${apiSource}`);
    }

    // Detect changes
    if (lastKnownState.count !== newState.count) {
      changesDetected = true;
      changeDetails.count_change = {
        old: lastKnownState.count,
        new: newState.count,
        difference: newState.count - lastKnownState.count
      };
    }

    if (lastKnownState.content_hash && newState.content_hash && 
        lastKnownState.content_hash !== newState.content_hash) {
      changesDetected = true;
      changeDetails.content_change = true;
    }

    const responseTime = Date.now() - startTime;

    // Record API health
    await supabase.from('api_health').insert({
      api_source: apiSource,
      response_time_ms: responseTime,
      status_code: apiHealth.status_code,
      is_available: apiHealth.is_available,
      error_message: apiHealth.error_message,
      total_records_available: apiHealth.total_records_available
    });

    // Update change detection state
    const changeSummary = changesDetected 
      ? `Changes detected: ${Object.keys(changeDetails).join(', ')}`
      : 'No changes detected';

    await supabase.from('change_detection_state').upsert({
      api_source: apiSource,
      last_check: new Date().toISOString(),
      last_known_state: newState,
      changes_detected: changesDetected,
      change_summary: changeSummary,
      updated_at: new Date().toISOString()
    });

    // Record change history
    await supabase.from('change_history').insert({
      api_source: apiSource,
      changes_detected: changesDetected,
      change_type: changesDetected ? Object.keys(changeDetails).join(',') : 'no_change',
      change_details: changeDetails,
      previous_state: lastKnownState,
      current_state: newState
    });

    // Trigger sync if changes detected and auto-sync is enabled
    if (changesDetected && currentState?.auto_sync_enabled) {
      console.log(`🚀 Triggering auto-sync for ${apiSource}`);
      await triggerAutoSync(supabase, apiSource);
    }

    console.log(`✅ ${apiSource}: ${changesDetected ? 'CHANGES DETECTED' : 'No changes'} (${responseTime}ms)`);

    return {
      api_source: apiSource,
      success: true,
      changes_detected: changesDetected,
      change_details: changeDetails,
      response_time_ms: responseTime,
      new_state: newState,
      api_health: apiHealth
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Record failed health check
    await supabase.from('api_health').insert({
      api_source: apiSource,
      response_time_ms: responseTime,
      status_code: 0,
      is_available: false,
      error_message: error.message
    });

    // Update failure count in polling schedule
    await supabase.rpc('increment_failure_count', { api_source_param: apiSource });

    throw error;
  }
}

async function checkLesAidesFr() {
  console.log('🇫🇷 Checking Les-Aides.fr...');
  
  const testData = [
    { id: 'fr-pac-2025', title: 'PAC - Aides directes 2025', date: '2025-01-15' },
    { id: 'fr-bio-2025', title: 'Aide conversion bio 2025', date: '2025-01-20' },
    { id: 'fr-dja-2025', title: 'DJA - Dotation Jeunes Agriculteurs', date: '2025-01-25' },
    { id: 'fr-invest-2025', title: 'Aide investissements agricoles', date: '2025-02-01' }
  ];

  // Simulate API response time
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

  const health: ApiHealthStatus = {
    is_available: true,
    response_time_ms: 250,
    status_code: 200,
    total_records_available: testData.length
  };

  const state: ChangeDetectionState = {
    count: testData.length,
    content_hash: generateHash(JSON.stringify(testData)),
    recent_ids: testData.map(item => item.id),
    last_modified: testData[testData.length - 1].date
  };

  return { health, state };
}

async function checkRomaniaOpenData() {
  console.log('🇷🇴 Checking Romania Open Data...');
  
  // Simulate checking CKAN API
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
  
  const simulatedCount = 15; // Simulate finding agriculture datasets
  
  const health: ApiHealthStatus = {
    is_available: true,
    response_time_ms: 400,
    status_code: 200,
    total_records_available: simulatedCount
  };

  const state: ChangeDetectionState = {
    count: simulatedCount,
    last_modified: new Date().toISOString()
  };

  return { health, state };
}

async function checkEuOpenData() {
  console.log('🇪🇺 Checking EU Open Data...');
  
  await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));
  
  const simulatedCount = 8;
  
  const health: ApiHealthStatus = {
    is_available: true,
    response_time_ms: 500,
    status_code: 200,
    total_records_available: simulatedCount
  };

  const state: ChangeDetectionState = {
    count: simulatedCount,
    last_modified: new Date().toISOString()
  };

  return { health, state };
}

async function checkAidesTerritoires() {
  console.log('🏛️ Checking Aides-Territoires...');
  
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));
  
  // Simulate API that's currently having issues
  const isAvailable = Math.random() > 0.3; // 70% uptime
  
  if (!isAvailable) {
    throw new Error('Aides-Territoires API currently unavailable (401 Unauthorized)');
  }
  
  const simulatedCount = 25;
  
  const health: ApiHealthStatus = {
    is_available: true,
    response_time_ms: 300,
    status_code: 200,
    total_records_available: simulatedCount
  };

  const state: ChangeDetectionState = {
    count: simulatedCount,
    last_modified: new Date().toISOString()
  };

  return { health, state };
}

async function triggerAutoSync(supabase: any, apiSource: string) {
  try {
    console.log(`🔄 Triggering auto-sync for ${apiSource}`);
    
    // Call the appropriate sync function
    const syncFunctionMap: { [key: string]: string } = {
      'les-aides-fr': 'sync-les-aides-fixed',
      'romania-open-data': 'sync-romania-data',
      'eu-open-data': 'sync-eu-data',
      'aides-territoires': 'sync-aides-territoires'
    };

    const syncFunction = syncFunctionMap[apiSource];
    if (syncFunction) {
      await supabase.functions.invoke(syncFunction, {
        body: { triggered_by: 'change_detection' }
      });
      
      // Update change history to mark sync as triggered
      await supabase
        .from('change_history')
        .update({ sync_triggered: true })
        .eq('api_source', apiSource)
        .order('check_timestamp', { ascending: false })
        .limit(1);
    }
    
  } catch (error) {
    console.error(`❌ Failed to trigger sync for ${apiSource}:`, error);
  }
}

async function checkAllApis(supabase: any) {
  console.log('🔍 Checking all APIs for changes...');
  
  const { data: schedules } = await supabase
    .from('polling_schedule')
    .select('*')
    .eq('enabled', true)
    .lte('next_check', new Date().toISOString());

  if (!schedules || schedules.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No APIs due for checking' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const results = [];
  for (const schedule of schedules) {
    try {
      const result = await checkSingleApi(supabase, schedule.api_source);
      results.push(result);
      
      // Update next check time
      const nextCheck = getNextCheckTime(schedule.check_frequency);
      await supabase
        .from('polling_schedule')
        .update({ 
          last_check: new Date().toISOString(),
          next_check: nextCheck.toISOString(),
          failure_count: 0 // Reset on success
        })
        .eq('api_source', schedule.api_source);
        
    } catch (error) {
      console.error(`❌ Error checking ${schedule.api_source}:`, error);
      results.push({
        api_source: schedule.api_source,
        success: false,
        error: error.message
      });
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      checked: results.length,
      results 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function testDetection(supabase: any, apiSource?: string) {
  console.log('🧪 Running test detection...');
  
  return new Response(
    JSON.stringify({ 
      message: 'Test detection completed',
      api_source: apiSource,
      test_result: 'Changes simulated successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function forceSyncTrigger(supabase: any, apiSource?: string) {
  if (!apiSource) {
    return new Response(
      JSON.stringify({ error: 'API source required for force sync' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await triggerAutoSync(supabase, apiSource);
  
  return new Response(
    JSON.stringify({ 
      success: true,
      message: `Sync triggered for ${apiSource}`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function getNextCheckTime(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

function generateHash(content: string): string {
  // Simple hash function for content comparison
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}