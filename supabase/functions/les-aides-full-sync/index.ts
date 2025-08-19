import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LesAidesSubsidy {
  id: string;
  titre?: string;
  nom?: string;
  title?: string;
  description?: string;
  montant_min?: number;
  montant_max?: number;
  date_limite?: string;
  url_candidature?: string;
  url?: string;
  secteurs?: string[];
  beneficiaires?: string[];
  conditions?: string;
  zones_geo?: string[];
}

interface LesAidesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LesAidesSubsidy[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Les-Aides.fr full sync started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('LES_AIDES_API_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasApiKey: !!apiKey
    });
    
    let totalAdded = 0;
    let errorCount = 0;
    const maxPages = 3; // Start small for testing
    const startTime = Date.now();
    
    // Create session ID for tracking
    const sessionId = `les-aides-sync-${Date.now()}`;
    console.log(`📋 Session ID: ${sessionId}`);
    
    // Try different endpoint formats until one works
    const endpoints = [
      'https://api.les-aides.fr/v1/aids',
      'https://www.les-aides.fr/api/aides',
      'https://les-aides.fr/api/aids'
    ];
    
    let workingEndpoint = '';
    
    for (let page = 1; page <= maxPages; page++) {
      console.log(`📄 Processing page ${page}/${maxPages}...`);
      
      let success = false;
      
      for (const baseEndpoint of endpoints) {
        if (workingEndpoint && baseEndpoint !== workingEndpoint) {
          continue; // Skip if we already found a working endpoint
        }
        
        try {
          const apiUrl = new URL(baseEndpoint);
          apiUrl.searchParams.set('page', page.toString());
          apiUrl.searchParams.set('page_size', '20');
          
          if (apiKey) {
            apiUrl.searchParams.set('secteur', 'agriculture,elevage,agroalimentaire');
          }
          
          console.log(`🔍 Trying endpoint: ${apiUrl.toString()}`);
          
          const headers: Record<string, string> = {
            'Accept': 'application/json',
            'User-Agent': 'AgriTool-Platform/1.0 (+https://agritooldemo.site)'
          };
          
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
          
          const response = await fetch(apiUrl.toString(), { headers });
          
          console.log(`📊 Response: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Found ${data.results?.length || data.data?.length || 0} subsidies`);
            console.log(`📋 Data structure:`, Object.keys(data));
            
            // Log API response sample for debugging
            if (data.results && data.results.length > 0) {
              console.log('API Response sample:', JSON.stringify(data.results[0], null, 2));
            }
            
            workingEndpoint = baseEndpoint; // Remember this endpoint works
            
            // Process the subsidies
            const subsidies = data.results || data.data || [];
            
            for (const subsidy of subsidies.slice(0, 5)) { // Limit to 5 per page for testing
              try {
                const subsidyData = {
                  code: `les-aides-${subsidy.id || Math.random()}`,
                  external_id: (subsidy.id || Math.random()).toString(),
                  api_source: 'les-aides-fr',
                  title: subsidy.titre || subsidy.nom || subsidy.title || 'French Subsidy',
                  description: subsidy.description || 'French business/agricultural subsidy',
                  amount_min: subsidy.montant_min || null,
                  amount_max: subsidy.montant_max || null,
                  currency: 'EUR',
                  deadline: subsidy.date_limite ? new Date(subsidy.date_limite).toISOString() : null,
                  eligibility_criteria: {
                    secteurs: subsidy.secteurs || [],
                    beneficiaires: subsidy.beneficiaires || [],
                    conditions: subsidy.conditions || ''
                  },
                  application_url: subsidy.url_candidature || subsidy.url || '',
                  source_url: subsidy.url || `https://les-aides.fr/aide/${subsidy.id}`,
                  status: 'active',
                  raw_data: subsidy
                };
                
                const { data: insertedSubsidy, error } = await supabase
                  .from('subsidies')
                  .insert(subsidyData)
                  .select('id')
                  .single();
                
                if (error) {
                  console.error(`❌ Insert error for ${subsidyData.title}:`, error);
                  errorCount++;
                } else {
                  totalAdded++;
                  console.log(`✅ Added: ${subsidyData.title}`);
                  
                  // Add geographic data if available
                  if (subsidy.zones_geo && subsidy.zones_geo.length > 0) {
                    const locationData = subsidy.zones_geo.map(zone => ({
                      subsidy_id: insertedSubsidy.id,
                      country_code: 'FR',
                      region: zone,
                    }));
                    
                    await supabase.from('subsidy_locations').insert(locationData);
                  }
                  
                  // Add category data if available
                  if (subsidy.secteurs && subsidy.secteurs.length > 0) {
                    const categoryData = subsidy.secteurs.map(secteur => ({
                      subsidy_id: insertedSubsidy.id,
                      category: secteur,
                      sector: 'agriculture'
                    }));
                    
                    await supabase.from('subsidy_categories').insert(categoryData);
                  }
                }
              } catch (subError) {
                console.error('❌ Subsidy processing error:', subError);
                errorCount++;
              }
            }
            
            success = true;
            break; // Exit endpoint loop if successful
          } else {
            const errorText = await response.text();
            console.log(`❌ Endpoint ${apiUrl.toString()} failed: ${response.status} - ${errorText}`);
          }
        } catch (endpointError) {
          console.log(`❌ Endpoint error:`, endpointError.message);
        }
      }
      
      if (!success) {
        console.log(`⚠️ All endpoints failed for page ${page}`);
        break;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Log to sync logs
    await supabase.from('api_sync_logs').insert({
      api_source: 'les-aides-fr-sync',
      sync_type: 'full_sync',
      status: errorCount === 0 ? 'completed' : 'completed_with_errors',
      records_processed: totalAdded + errorCount,
      records_added: totalAdded,
      records_updated: 0,
      errors: errorCount > 0 ? { error_count: errorCount } : null,
      completed_at: new Date().toISOString()
    });
    
    const durationMinutes = Math.round((Date.now() - startTime) / (1000 * 60));
    
    return new Response(JSON.stringify({
      success: true,
      session_id: sessionId,
      summary: {
        total_added: totalAdded,
        error_count: errorCount,
        duration_minutes: durationMinutes,
        working_endpoint: workingEndpoint
      },
      message: `✅ Les-Aides.fr sync completed! Added ${totalAdded} subsidies${errorCount > 0 ? ` with ${errorCount} errors` : ''}.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Les-Aides sync error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});