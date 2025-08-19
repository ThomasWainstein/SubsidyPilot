import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🕐 Change Detection Scheduler running...');

    // Get APIs that are due for checking
    const { data: dueApis, error } = await supabase.rpc('get_apis_due_for_check');
    
    if (error) {
      console.error('❌ Error getting due APIs:', error);
      throw error;
    }

    if (!dueApis || dueApis.length === 0) {
      console.log('✅ No APIs due for checking at this time');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No APIs due for checking',
          checked: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${dueApis.length} APIs due for checking:`, dueApis.map(api => api.api_source));

    const results = [];
    
    // Process each due API
    for (const api of dueApis) {
      try {
        console.log(`🔍 Checking ${api.api_source} (${api.hours_overdue?.toFixed(1)}h overdue)...`);
        
        // Call the smart change detector for this specific API
        const response = await supabase.functions.invoke('smart-change-detector', {
          body: { action: 'check_changes', api_source: api.api_source }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const result = response.data;
        results.push({
          api_source: api.api_source,
          success: true,
          changes_detected: result.results?.[0]?.changes_detected || false,
          response_time: result.results?.[0]?.response_time_ms
        });

        // Update the polling schedule
        const nextCheckTime = calculateNextCheck(api.api_source);
        await supabase
          .from('polling_schedule')
          .update({
            last_check: new Date().toISOString(),
            next_check: nextCheckTime.toISOString(),
            failure_count: 0 // Reset failure count on successful check
          })
          .eq('api_source', api.api_source);

        console.log(`✅ ${api.api_source} checked successfully`);

      } catch (error) {
        console.error(`❌ Error checking ${api.api_source}:`, error);
        
        results.push({
          api_source: api.api_source,
          success: false,
          error: error.message
        });

        // Increment failure count
        await supabase
          .from('polling_schedule')
          .update({
            failure_count: (api.failure_count || 0) + 1,
            last_check: new Date().toISOString()
          })
          .eq('api_source', api.api_source);

        // Disable API if too many failures
        if ((api.failure_count || 0) >= 4) { // 5 total failures (4 + this one)
          console.warn(`⚠️ Disabling ${api.api_source} due to repeated failures`);
          await supabase
            .from('polling_schedule')
            .update({ enabled: false })
            .eq('api_source', api.api_source);
        }
      }

      // Add delay between API checks to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;
    const changesDetected = results.filter(r => r.changes_detected).length;
    const errorsCount = results.filter(r => !r.success).length;

    console.log(`📊 Scheduler Summary: ${successCount} successful, ${changesDetected} with changes, ${errorsCount} errors`);

    // Log scheduler run to database
    await supabase.from('api_sync_logs').insert({
      api_source: 'scheduler',
      sync_type: 'change_detection_run',
      status: errorsCount === 0 ? 'completed' : 'completed_with_errors',
      records_processed: results.length,
      records_added: changesDetected,
      errors: errorsCount > 0 ? results.filter(r => !r.success).map(r => ({ api: r.api_source, error: r.error })) : null,
      completed_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scheduler completed: ${successCount}/${results.length} APIs checked successfully`,
        summary: {
          total_checked: results.length,
          successful: successCount,
          changes_detected: changesDetected,
          errors: errorsCount
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Scheduler error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculateNextCheck(apiSource: string): Date {
  const now = new Date();
  
  // Define check frequencies per API
  const frequencies: { [key: string]: number } = {
    'les-aides-fr': 60 * 60 * 1000, // 1 hour
    'aides-territoires': 24 * 60 * 60 * 1000, // 1 day
    'romania-open-data': 24 * 60 * 60 * 1000, // 1 day  
    'eu-open-data': 7 * 24 * 60 * 60 * 1000 // 1 week
  };

  const frequency = frequencies[apiSource] || (24 * 60 * 60 * 1000); // Default to daily
  return new Date(now.getTime() + frequency);
}