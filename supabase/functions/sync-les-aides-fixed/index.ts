import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting les-aides.fr sync (fixed version)');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { sync_type = 'incremental' } = await req.json().catch(() => ({}))

    // Log sync start
    const { data: syncLog } = await supabase
      .from('api_sync_logs')
      .insert({
        api_source: 'les-aides-fr', // Match database source name
        sync_type,
        status: 'running'
      })
      .select('id')
      .single()

    const logId = syncLog?.id

    try {
      // Fetch from les-aides.fr API with IDC authentication
      console.log('📡 Fetching from les-aides.fr API with authentication...');
      
      const idcKey = Deno.env.get('LES_AIDES_IDC_KEY');
      if (!idcKey) {
        throw new Error('LES_AIDES_IDC_KEY environment variable not set');
      }
      
      const apiResponse = await fetch('https://api.les-aides.fr/aides/', {
        headers: {
          'User-Agent': 'SubsidyPilot/1.0 (https://subsidypilot.com)',
          'Accept': 'application/json',
          'X-IDC': idcKey
        }
      });

      if (!apiResponse.ok) {
        throw new Error(`API request failed: ${apiResponse.status} ${apiResponse.statusText}`);
      }

      const subsidies = await apiResponse.json();
      console.log(`📊 Fetched ${subsidies?.length || 0} subsidies from API`);

      let processed = 0;
      let added = 0;
      let updated = 0;
      const errors: any[] = [];

      // Process each subsidy
      if (Array.isArray(subsidies)) {
        for (const subsidy of subsidies) { // Process ALL subsidies, not just first 50
          try {
            const subsidyId = `les-aides-${subsidy.id || crypto.randomUUID()}`;
            
            // Check if subsidy already exists to determine add vs update
            const { data: existingSubsidy } = await supabase
              .from('subsidies')
              .select('id')
              .eq('id', subsidyId)
              .maybeSingle();
            
            const subsidyData = {
              id: subsidyId,
              title: subsidy.title || subsidy.name || 'Untitled Aid',
              description: subsidy.description || subsidy.details || '',
              amount: subsidy.amount || subsidy.budget,
              region: subsidy.region || 'France',
              deadline: subsidy.deadline || subsidy.end_date,
              eligibility: Array.isArray(subsidy.eligibility) ? subsidy.eligibility.join(', ') : subsidy.eligibility,
              sector: subsidy.sector || subsidy.category || 'General',
              funding_type: subsidy.funding_type || 'Grant',
              application_url: subsidy.url || subsidy.application_link,
              source: 'les-aides-fr', // Fixed: Match the database source
              status: 'active',
              created_at: existingSubsidy ? undefined : new Date().toISOString(), // Don't override created_at for existing records
              updated_at: new Date().toISOString()
            };

            // Upsert subsidy
            const { error: upsertError } = await supabase
              .from('subsidies')
              .upsert(subsidyData, { 
                onConflict: 'id',
                ignoreDuplicates: false 
              });

            if (upsertError) {
              errors.push({ subsidy: subsidyId, error: upsertError.message });
            } else {
              if (existingSubsidy) {
                updated++;
              } else {
                added++;
              }
            }
            processed++;

          } catch (error) {
            errors.push({ subsidy: `item-${processed}`, error: (error as Error).message });
            processed++;
          }
        }
      }

      // Update sync log
      if (logId) {
        await supabase
          .from('api_sync_logs')
          .update({
            status: errors.length > 0 ? 'completed_with_errors' : 'completed',
            completed_at: new Date().toISOString(),
            records_processed: processed,
            records_added: added,
            records_updated: updated,
            errors: errors.length > 0 ? { error_count: errors.length, errors: errors.slice(0, 5) } : null
          })
          .eq('id', logId);
      }

      console.log(`✅ Sync completed: ${processed} processed, ${added} added, ${updated} updated, ${errors.length} errors`);

      return new Response(JSON.stringify({
        success: true,
        processed,
        added,
        updated,
        errors,
        sync_log_id: logId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      // Update sync log with error
      if (logId) {
        await supabase
          .from('api_sync_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            errors: { error: (error as Error).message }
          })
          .eq('id', logId);
      }

      return new Response(JSON.stringify({
        success: false,
        error: (error as Error).message,
        sync_log_id: logId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})