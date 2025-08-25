import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔄 RESTARTING IMPORT SYSTEM')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Clear any stuck sync runs
    console.log('🧹 Cleaning up stuck syncs...')
    const { data: cleanupResult } = await supabase.rpc('cleanup_stuck_syncs')
    console.log(`✅ Cleaned up ${cleanupResult || 0} stuck jobs`)

    // Reset change detection to force fresh import
    console.log('🔄 Resetting change detection...')
    await supabase
      .from('change_detection_state')
      .upsert({
        api_source: 'les-aides-fr',
        changes_detected: true,
        change_summary: 'Manual restart - triggering fresh import',
        last_check: new Date().toISOString(),
        auto_sync_enabled: true
      })

    // Trigger fresh import directly
    console.log('🚀 Triggering fresh import...')
    const importResponse = await supabase.functions.invoke('ingest-les-aides-orchestrator', {
      body: {
        dry_run: false,
        limit: 200,
        max_requests: 50
      }
    })

    if (importResponse.error) {
      console.error('❌ Import trigger failed:', importResponse.error)
      throw new Error(`Import failed: ${importResponse.error.message}`)
    }

    console.log('✅ Import triggered successfully:', importResponse.data)

    // Check current subsidy count
    const { data: subsidyCount } = await supabase
      .from('subsidies')
      .select('count(*)', { count: 'exact' })
    
    console.log(`📊 Current subsidy count: ${subsidyCount?.[0]?.count || 0}`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Import system restarted successfully',
      cleaned_stuck_jobs: cleanupResult || 0,
      import_response: importResponse.data,
      current_subsidies: subsidyCount?.[0]?.count || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Restart failed:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})