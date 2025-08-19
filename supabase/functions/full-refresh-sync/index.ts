import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LesAidesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LesAidesSubsidy[];
}

interface LesAidesSubsidy {
  id: string;
  nom: string;
  description: string;
  montant_min?: number;
  montant_max?: number;
  date_limite?: string;
  url: string;
  secteurs?: string[];
  zones_geo?: string[];
  beneficiaires?: string[];
  conditions?: string;
  organisme?: string;
  statut?: string;
}

interface SyncProgress {
  session_id: string;
  total_pages: number;
  pages_completed: number;
  subsidies_processed: number;
  subsidies_added: number;
  current_status: string;
  eta_minutes?: number;
  error_count: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Full refresh function started');
    
    // Basic environment check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'full_refresh';
    
    console.log(`📋 Processing action: ${action}`);

    switch (action) {
      case 'purge_data':
        console.log('🗑️ Starting purge operation');
        return await purgeData(supabase);
      case 'full_refresh':
        console.log('🔄 Starting full refresh operation');
        return await fullRefreshSync(supabase);
      case 'get_progress':
        console.log('📊 Getting progress');
        return await getSyncProgress(supabase, url.searchParams.get('session_id') || '');
      default:
        console.log(`❌ Invalid action: ${action}`);
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('❌ Function error:', error);
    console.error('❌ Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack || 'No stack trace available'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function purgeData(supabase: any) {
  console.log('🗑️ Starting safe data purge...');
  
  try {
    const { data, error } = await supabase.rpc('safe_data_purge');
    
    if (error) {
      throw error;
    }

    console.log('✅ Data purge completed:', data);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data safely purged and backed up',
        backup_info: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Purge failed:', error);
    throw error;
  }
}

async function fullRefreshSync(supabase: any) {
  const sessionId = `full-refresh-${Date.now()}`;
  console.log(`🚀 Starting full refresh sync - Session: ${sessionId}`);

  // First, purge existing data
  await purgeData(supabase);

  // Configuration for full sync
  const SYNC_CONFIG = {
    max_pages: 2,               // Start with 2 pages for testing (100 subsidies)
    page_size: 50,              // Maximum per page
    base_url: 'https://api.les-aides.fr/v1/aids/',
    api_key: Deno.env.get('LES_AIDES_API_KEY'),
    filters: {
      secteurs: ['agriculture', 'elevage', 'agroalimentaire', 'rural', 'entreprise'],
      statut: 'active',
      ordering: '-date_creation'
    }
  };

  if (!SYNC_CONFIG.api_key) {
    throw new Error('LES_AIDES_API_KEY not configured');
  }

  // Initialize progress tracking
  await initializeProgress(supabase, sessionId, SYNC_CONFIG.max_pages);

  let totalProcessed = 0;
  let totalAdded = 0;
  let errorCount = 0;
  const errors: any[] = [];
  const startTime = Date.now();

  try {
    // Process all pages
    for (let page = 1; page <= SYNC_CONFIG.max_pages; page++) {
      console.log(`📄 Processing page ${page}/${SYNC_CONFIG.max_pages}...`);

      try {
        // Build API URL with filters
        const apiUrl = new URL(SYNC_CONFIG.base_url);
        apiUrl.searchParams.set('page', page.toString());
        apiUrl.searchParams.set('page_size', SYNC_CONFIG.page_size.toString());
        apiUrl.searchParams.set('secteur', SYNC_CONFIG.filters.secteurs.join(','));
        apiUrl.searchParams.set('statut', SYNC_CONFIG.filters.statut);
        apiUrl.searchParams.set('ordering', SYNC_CONFIG.filters.ordering);

        console.log(`🔍 Fetching: ${apiUrl.toString()}`);

        const response = await fetch(apiUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${SYNC_CONFIG.api_key}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'AgriTool-Platform/1.0 (+https://agritooldemo.site)'
          }
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data: LesAidesResponse = await response.json();
        console.log(`📊 Page ${page}: Found ${data.results?.length || 0} subsidies`);
        
        // Log API response sample for debugging
        if (data.results && data.results.length > 0) {
          console.log('API Response sample:', JSON.stringify(data.results[0], null, 2));
        }

        // Process subsidies from this page
        for (const subsidy of data.results) {
          try {
            await processSubsidy(supabase, subsidy);
            totalAdded++;
          } catch (error) {
            console.error(`❌ Error processing subsidy ${subsidy.id}:`, error);
            errors.push({ subsidy_id: subsidy.id, error: error.message });
            errorCount++;
          }
          totalProcessed++;
        }

        // Update progress
        const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);
        const pagesRemaining = SYNC_CONFIG.max_pages - page;
        const etaMinutes = pagesRemaining > 0 ? Math.round((elapsedMinutes / page) * pagesRemaining) : 0;

        await updateProgress(supabase, sessionId, {
          pages_completed: page,
          subsidies_processed: totalProcessed,
          subsidies_added: totalAdded,
          current_status: `Processing page ${page}/${SYNC_CONFIG.max_pages}`,
          eta_minutes: etaMinutes,
          error_count: errorCount
        });

        // Rate limiting - avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between pages

        // Check if we've reached the end
        if (!data.next || data.results.length < SYNC_CONFIG.page_size) {
          console.log(`🏁 Reached end of data at page ${page}`);
          break;
        }

      } catch (error) {
        console.error(`❌ Error on page ${page}:`, error);
        errorCount++;
        errors.push({ page, error: error.message });
        
        // Continue with next page unless it's a critical error
        if (error.message.includes('401') || error.message.includes('403')) {
          throw error; // Stop on auth errors
        }
      }
    }

    // Mark completion
    await updateProgress(supabase, sessionId, {
      pages_completed: SYNC_CONFIG.max_pages,
      subsidies_processed: totalProcessed,
      subsidies_added: totalAdded,
      current_status: 'completed',
      error_count: errorCount
    });

    // Update change detection state
    await supabase
      .from('change_detection_state')
      .upsert({
        api_source: 'les-aides-fr',
        last_check: new Date().toISOString(),
        last_known_state: { count: totalAdded, last_sync: new Date().toISOString() },
        changes_detected: false,
        change_summary: `Full refresh completed: ${totalAdded} subsidies loaded`,
        updated_at: new Date().toISOString()
      });

    // Log to sync logs
    await supabase.from('api_sync_logs').insert({
      api_source: 'les-aides-fr-full-refresh',
      sync_type: 'full_refresh',
      status: errorCount === 0 ? 'completed' : 'completed_with_errors',
      records_processed: totalProcessed,
      records_added: totalAdded,
      records_updated: 0,
      errors: errors.length > 0 ? errors : null,
      completed_at: new Date().toISOString()
    });

    console.log(`🎉 Full refresh completed: ${totalAdded} subsidies added, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionId,
        summary: {
          total_processed: totalProcessed,
          total_added: totalAdded,
          error_count: errorCount,
          duration_minutes: Math.round((Date.now() - startTime) / (1000 * 60))
        },
        errors: errors.slice(0, 10), // First 10 errors for troubleshooting
        message: `✅ Full refresh completed! Added ${totalAdded} real French subsidies to your database.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Full refresh failed:', error);
    
    await updateProgress(supabase, sessionId, {
      current_status: 'failed',
      error_count: errorCount + 1
    });

    throw error;
  }
}

async function processSubsidy(supabase: any, subsidy: LesAidesSubsidy) {
  // Transform Les-Aides data to our schema with flexible field mapping
  const subsidyData = {
    code: `les-aides-${subsidy.id}`,
    external_id: subsidy.id?.toString() || '',
    api_source: 'les-aides-fr',
    title: subsidy.titre || subsidy.nom || subsidy.title || 'Untitled Subsidy',
    description: subsidy.description || '',
    amount_min: subsidy.montant_min || null,
    amount_max: subsidy.montant_max || null,
    currency: 'EUR',
    deadline: subsidy.date_limite ? new Date(subsidy.date_limite).toISOString() : null,
    eligibility_criteria: {
      beneficiaires: subsidy.beneficiaires || [],
      conditions: subsidy.conditions || '',
      secteurs: subsidy.secteurs || []
    },
    application_url: subsidy.url_candidature || subsidy.url || '',
    status: 'active',
    raw_data: subsidy
  };

  // Insert subsidy
  const { data: insertedSubsidy, error: subsidyError } = await supabase
    .from('subsidies')
    .insert(subsidyData)
    .select('id')
    .single();

  if (subsidyError) {
    throw subsidyError;
  }

  // Add geographic data
  if (subsidy.zones_geo && subsidy.zones_geo.length > 0) {
    const locationData = subsidy.zones_geo.map(zone => ({
      subsidy_id: insertedSubsidy.id,
      country_code: 'FR',
      region: zone,
    }));

    await supabase.from('subsidy_locations').insert(locationData);
  }

  // Add category data
  if (subsidy.secteurs && subsidy.secteurs.length > 0) {
    const categoryData = subsidy.secteurs.map(secteur => ({
      subsidy_id: insertedSubsidy.id,
      category: secteur,
      sector: 'agriculture'
    }));

    await supabase.from('subsidy_categories').insert(categoryData);
  }
}

async function initializeProgress(supabase: any, sessionId: string, totalPages: number) {
  await supabase.from('sync_progress').insert({
    sync_session_id: sessionId,
    api_source: 'les-aides-fr',
    total_pages: totalPages,
    current_status: 'starting'
  });
}

async function updateProgress(supabase: any, sessionId: string, updates: Partial<SyncProgress>) {
  await supabase
    .from('sync_progress')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      completed_at: updates.current_status === 'completed' || updates.current_status === 'failed' 
        ? new Date().toISOString() 
        : null
    })
    .eq('sync_session_id', sessionId);
}

async function getSyncProgress(supabase: any, sessionId: string) {
  const { data, error } = await supabase
    .from('sync_progress')
    .select('*')
    .eq('sync_session_id', sessionId)
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Progress not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}