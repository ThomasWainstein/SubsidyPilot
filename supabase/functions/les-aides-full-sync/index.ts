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
    
    // Real API endpoints only - no mock data
    const endpoints = [
      'https://api.les-aides.fr/v1/aids',
      'https://www.les-aides.fr/api/aides', 
      'https://les-aides.fr/api/aids'
    ];
    
    let workingEndpoint = '';
    
    console.log(`🔍 Testing ${endpoints.length} API endpoints for real data only`);
    
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
            console.log(`🔑 Using API key for authenticated request`);
          } else {
            console.log(`⚠️ No API key provided - trying unauthenticated request`);
          }
          
          console.log(`🌐 Making API request to: ${apiUrl.toString()}`);
          
          const headers: Record<string, string> = {
            'Accept': 'application/json',
            'User-Agent': 'AgriTool-Platform/1.0 (+https://agritooldemo.site)'
          };
          
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
          
          console.log(`📋 Request headers:`, JSON.stringify(headers, null, 2));
          
          const requestStart = Date.now();
          const response = await fetch(apiUrl.toString(), { headers });
          const requestDuration = Date.now() - requestStart;
          
          console.log(`📊 API Response: ${response.status} ${response.statusText} (${requestDuration}ms)`);
          console.log(`📋 Response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
          
          if (response.ok) {
            const responseText = await response.text();
            console.log(`📄 Raw response length: ${responseText.length} characters`);
            
            let data;
            try {
              data = JSON.parse(responseText);
            } catch (parseError) {
              console.error(`❌ JSON parsing failed:`, parseError.message);
              console.log(`📄 Response text preview:`, responseText.substring(0, 500));
              continue; // Try next endpoint
            }
            
            const subsidyCount = data.results?.length || data.data?.length || data.length || 0;
            console.log(`✅ Successfully parsed response with ${subsidyCount} subsidies`);
            console.log(`📋 Response structure:`, Object.keys(data));
            
            if (data.count) console.log(`📊 Total available records: ${data.count}`);
            if (data.next) console.log(`🔗 Next page available: ${data.next}`);
            
            // Enhanced API response sample logging
            if (subsidyCount > 0) {
              const sampleData = data.results?.[0] || data.data?.[0] || data[0];
              console.log(`📋 Sample subsidy structure:`, Object.keys(sampleData));
              console.log(`📋 Sample subsidy data:`, JSON.stringify(sampleData, null, 2));
            } else {
              console.log(`⚠️ No subsidies found in response`);
              continue; // Try next endpoint
            }
            
            workingEndpoint = baseEndpoint;
            console.log(`✅ Endpoint ${baseEndpoint} is working - will use for remaining pages`);
            
            // Process the subsidies
            const subsidies = data.results || data.data || data || [];
            console.log(`🔄 Processing ${Math.min(subsidies.length, 5)} subsidies from page ${page}`);
            
            let pageAddedCount = 0;
            let pageErrorCount = 0;
            
            for (const [index, subsidy] of subsidies.slice(0, 5).entries()) {
              console.log(`📋 Processing subsidy ${index + 1}/5: ${subsidy.titre || subsidy.nom || subsidy.title || 'Untitled'}`);
              
              try {
                console.log(`🔍 Extracting data from subsidy:`, {
                  id: subsidy.id,
                  titre: subsidy.titre,
                  nom: subsidy.nom,
                  title: subsidy.title,
                  hasDescription: !!subsidy.description,
                  hasAmounts: !!(subsidy.montant_min || subsidy.montant_max),
                  hasDeadline: !!subsidy.date_limite,
                  hasSectors: !!(subsidy.secteurs?.length),
                  hasZones: !!(subsidy.zones_geo?.length)
                });
                
                const subsidyData = {
                  code: `les-aides-${subsidy.id || Math.random()}`,
                  external_id: (subsidy.id || Math.random()).toString(),
                  api_source: 'les-aides-fr',
                  title: { fr: subsidy.titre || subsidy.nom || subsidy.title || 'French Subsidy' }, // JSONB format
                  description: { fr: subsidy.description || 'French business/agricultural subsidy' }, // JSONB format
                  amount_min: subsidy.montant_min || null,
                  amount_max: subsidy.montant_max || null,
                  currency: 'EUR',
                  deadline: subsidy.date_limite ? new Date(subsidy.date_limite).toISOString().split('T')[0] : null, // Date format only
                  eligibility_criteria: {
                    secteurs: subsidy.secteurs || [],
                    beneficiaires: subsidy.beneficiaires || [],
                    conditions: subsidy.conditions || ''
                  },
                  application_url: subsidy.url_candidature || subsidy.url || '',
                  source_url: subsidy.url || `https://les-aides.fr/aide/${subsidy.id}`,
                  status: 'open',
                  agency: 'Les-Aides.fr',
                  language: ['fr'],
                  region: ['France'],
                  raw_data: subsidy
                };
                
                console.log(`💾 Inserting subsidy data:`, {
                  code: subsidyData.code,
                  title: subsidyData.title,
                  amounts: `${subsidyData.amount_min || 'N/A'} - ${subsidyData.amount_max || 'N/A'} ${subsidyData.currency}`,
                  deadline: subsidyData.deadline || 'No deadline'
                });
                
                const { data: insertedSubsidy, error } = await supabase
                  .from('subsidies')
                  .insert(subsidyData)
                  .select('id')
                  .single();
                
                if (error) {
                  console.error(`❌ Database insert failed for "${subsidyData.title.fr}":`, {
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                  });
                  pageErrorCount++;
                  errorCount++;
                } else {
                  pageAddedCount++;
                  totalAdded++;
                  console.log(`✅ Successfully inserted subsidy ID: ${insertedSubsidy.id}`);
                  
                  // Add geographic data if available
                  if (subsidy.zones_geo && subsidy.zones_geo.length > 0) {
                    console.log(`📍 Adding ${subsidy.zones_geo.length} geographic locations`);
                    const locationData = subsidy.zones_geo.map(zone => ({
                      subsidy_id: insertedSubsidy.id,
                      country_code: 'FR',
                      region: zone,
                    }));
                    
                    const { error: locationError } = await supabase.from('subsidy_locations').insert(locationData);
                    if (locationError) {
                      console.error(`⚠️ Location insert failed:`, locationError.message);
                    } else {
                      console.log(`✅ Added ${locationData.length} locations`);
                    }
                  }
                  
                  // Add category data if available
                  if (subsidy.secteurs && subsidy.secteurs.length > 0) {
                    console.log(`🏷️ Adding ${subsidy.secteurs.length} categories`);
                    const categoryData = subsidy.secteurs.map(secteur => ({
                      subsidy_id: insertedSubsidy.id,
                      category: secteur,
                      sector: 'agriculture'
                    }));
                    
                    const { error: categoryError } = await supabase.from('subsidy_categories').insert(categoryData);
                    if (categoryError) {
                      console.error(`⚠️ Category insert failed:`, categoryError.message);
                    } else {
                      console.log(`✅ Added ${categoryData.length} categories`);
                    }
                  }
                }
              } catch (subError) {
                console.error(`❌ Subsidy processing failed for index ${index}:`, {
                  error: subError.message,
                  stack: subError.stack,
                  subsidyId: subsidy.id,
                  subsidyTitle: subsidy.titre || subsidy.nom || subsidy.title
                });
                pageErrorCount++;
                errorCount++;
              }
            }
            
            console.log(`📊 Page ${page} summary: ${pageAddedCount} added, ${pageErrorCount} errors`);
            
            success = true;
            break; // Exit endpoint loop if successful
          } else {
            const errorText = await response.text();
            console.error(`❌ HTTP ${response.status} from ${baseEndpoint}:`, {
              status: response.status,
              statusText: response.statusText,
              url: apiUrl.toString(),
              errorBody: errorText.substring(0, 500),
              responseHeaders: Object.fromEntries(response.headers.entries())
            });
          }
        } catch (endpointError) {
          console.error(`❌ Network/Fetch error for ${baseEndpoint}:`, {
            message: endpointError.message,
            name: endpointError.name,
            stack: endpointError.stack?.substring(0, 500)
          });
        }
      }
      
      if (!success) {
        console.error(`💥 ALL ${endpoints.length} API endpoints failed for page ${page}:`);
        endpoints.forEach((endpoint, i) => {
          console.error(`  ${i + 1}. ${endpoint} - Failed`);
        });
        console.error(`🛑 Stopping sync after page ${page - 1} due to API failures`);
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