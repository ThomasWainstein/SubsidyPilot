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
    const startTime = Date.now();
    
    // Create session ID for tracking
    const sessionId = `les-aides-sync-${Date.now()}`;
    console.log(`📋 Session ID: ${sessionId}`);
    
    // Test multiple endpoints with different authentication methods
    const endpoints = [
      'https://api.les-aides.fr/v1/aids',
      'https://les-aides.fr/api/aids',
      'https://www.les-aides.fr/api/aides',
      'https://api.les-aides.fr/aids'
    ];
    
    const authMethods = [
      { 'Authorization': `Bearer ${apiKey || '711e55108232352685cca98b49777e6b836bfb79'}` },
      { 'X-API-Key': apiKey || '711e55108232352685cca98b49777e6b836bfb79' },
      { 'Authorization': `Token ${apiKey || '711e55108232352685cca98b49777e6b836bfb79'}` },
      {} // No auth (public endpoint)
    ];
    
    console.log('🧪 Testing API connectivity with different endpoints...');
    let workingEndpoint = '';
    let workingAuth = {};
    
    // Test API connectivity first
    for (const endpoint of endpoints) {
      for (const authMethod of authMethods) {
        try {
          const testUrl = `${endpoint}?page=1&page_size=1&secteur=agriculture,elevage,agroalimentaire`;
          console.log(`🔍 Testing: ${endpoint} with auth: ${JSON.stringify(authMethod)}`);
          
          const response = await fetch(testUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'AgriTool-Platform/1.0',
              ...authMethod
            }
          });
          
          if (response.ok) {
            const testData = await response.json();
            if (testData.results?.length > 0 || testData.data?.length > 0 || Array.isArray(testData)) {
              workingEndpoint = endpoint;
              workingAuth = authMethod;
              console.log(`✅ Found working endpoint: ${endpoint} with auth: ${JSON.stringify(authMethod)}`);
              console.log(`📊 Test response has ${testData.results?.length || testData.data?.length || testData.length || 0} items`);
              break;
            }
          }
        } catch (error) {
          console.log(`❌ Failed: ${endpoint} - ${error.message}`);
          continue;
        }
      }
      if (workingEndpoint) break;
    }
    
    if (!workingEndpoint) {
      console.log('⚠️ No working API endpoint found, trying fallback to working sync function...');
      
      // Fallback to working sync function
      try {
        const { data: workingSync, error: workingSyncError } = await supabase.functions.invoke('sync-les-aides-fixed');
        
        if (!workingSyncError && workingSync?.success) {
          console.log(`✅ Working sync function succeeded: ${workingSync.added} subsidies added`);
          totalAdded = workingSync.added || 0;
          
          await supabase.from('api_sync_logs').insert({
            api_source: 'les-aides-fr-sync',
            sync_type: 'full_sync_via_working_function',
            status: 'completed',
            records_processed: totalAdded,
            records_added: totalAdded,
            records_updated: 0,
            errors: null,
            completed_at: new Date().toISOString()
          });
          
          const durationMinutes = Math.round((Date.now() - startTime) / (1000 * 60));
          
          return new Response(JSON.stringify({
            success: true,
            session_id: sessionId,
            summary: {
              total_added: totalAdded,
              error_count: 0,
              duration_minutes: durationMinutes,
              working_endpoint: 'sync-les-aides-fixed'
            },
            message: `✅ Les-Aides.fr sync completed via working function! Added ${totalAdded} subsidies.`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (fallbackError) {
        console.log(`⚠️ Working sync fallback failed: ${fallbackError.message}`);
        throw new Error('No working API endpoint found and fallback sync failed');
      }
    }
    
    // Use the working endpoint and authentication
    const maxPages = 2; // Start with 2 pages for testing (100 subsidies)
    const pageSize = 50;
    console.log(`🎯 Target: ${maxPages} pages × ${pageSize} subsidies = ${maxPages * pageSize} total subsidies`);
    console.log(`📍 Using working endpoint: ${workingEndpoint}`);
    
    for (let page = 1; page <= maxPages; page++) {
      console.log(`📄 Processing page ${page}/${maxPages}...`);
      
      try {
        const apiUrl = new URL(workingEndpoint);
        apiUrl.searchParams.set('page', page.toString());
        apiUrl.searchParams.set('page_size', pageSize.toString());
        apiUrl.searchParams.set('secteur', 'agriculture,elevage,agroalimentaire');
        
        console.log(`🌐 Making API request to: ${apiUrl.toString()}`);
        
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'User-Agent': 'AgriTool-Platform/1.0 (+https://agritooldemo.site)',
          ...workingAuth
        };
        
        console.log(`📋 Using working authentication method`);
        
        console.log(`📋 API Key being used: ${apiKey ? 'Environment variable' : 'Hardcoded fallback'}`);
        
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
            
            console.log(`✅ Endpoint ${workingEndpoint} is working for page ${page}`);
            
            // Process ALL subsidies from the page (not just 5)
            const subsidies = data.results || data.data || data || [];
            console.log(`🔄 Processing ALL ${subsidies.length} subsidies from page ${page}`);
            
            let pageAddedCount = 0;
            let pageErrorCount = 0;
            
            for (const [index, subsidy] of subsidies.entries()) {
              console.log(`📋 Processing subsidy ${index + 1}/${subsidies.length}: ${subsidy.titre || subsidy.nom || subsidy.title || 'Untitled'}`);
              
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
                
                // Fixed data structure to match database schema
                const subsidyData = {
                  code: `les-aides-${subsidy.id || Math.random()}`,
                  external_id: (subsidy.id || Math.random()).toString(),
                  api_source: 'les-aides-fr',
                  title: subsidy.titre || subsidy.nom || subsidy.title || 'French Subsidy', // Plain TEXT
                  description: subsidy.description || 'French business/agricultural subsidy', // Plain TEXT
                  amount_min: subsidy.montant_min || null,
                  amount_max: subsidy.montant_max || null,
                  currency: 'EUR',
                  deadline: subsidy.date_limite ? new Date(subsidy.date_limite).toISOString() : null, // Full timestamp
                  eligibility_criteria: {
                    secteurs: subsidy.secteurs || [],
                    beneficiaires: subsidy.beneficiaires || [],
                    conditions: subsidy.conditions || ''
                  },
                  application_url: subsidy.url_candidature || subsidy.url || '',
                  status: 'active', // Use 'active' not 'open'
                  raw_data: subsidy,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                
                console.log(`💾 Inserting subsidy data:`, {
                  code: subsidyData.code,
                  title: subsidyData.title,
                  amounts: `${subsidyData.amount_min || 'N/A'} - ${subsidyData.amount_max || 'N/A'} ${subsidyData.currency}`,
                  deadline: subsidyData.deadline || 'No deadline',
                  status: subsidyData.status
                });
                
                const { data: insertedSubsidy, error } = await supabase
                  .from('subsidies')
                  .insert(subsidyData)
                  .select('id')
                  .single();
                
                if (error) {
                  console.error(`❌ Database insert failed for "${subsidyData.title}":`, {
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
          
        } else {
          const errorText = await response.text();
          console.error(`❌ HTTP ${response.status} from ${apiUrl.toString()}:`, {
            status: response.status,
            statusText: response.statusText,
            url: apiUrl.toString(),
            errorBody: errorText.substring(0, 500),
            responseHeaders: Object.fromEntries(response.headers.entries())
          });
          
          // Stop processing if API fails
          console.error(`🛑 Stopping sync at page ${page} due to API failure`);
          break;
        }
      } catch (fetchError) {
        console.error(`❌ Network/Fetch error for page ${page}:`, {
          message: fetchError.message,
          name: fetchError.name,
          stack: fetchError.stack?.substring(0, 500)
        });
        
        console.error(`🛑 Stopping sync at page ${page} due to network error`);
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