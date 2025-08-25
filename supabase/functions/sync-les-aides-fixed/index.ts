import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting constants
const DAILY_QUOTA = 720;
const API_BASE_URL = 'https://api.les-aides.fr';

// Rate limiting helper using simple counter (in production, use Redis)
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();

function checkRateLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyRequestCount = 0;
    lastResetDate = today;
  }
  
  if (dailyRequestCount >= DAILY_QUOTA) {
    return false;
  }
  
  dailyRequestCount++;
  return true;
}

async function makeApiRequest(path: string, params: Record<string, any> = {}) {
  if (!checkRateLimit()) {
    throw new Error(`Daily quota of ${DAILY_QUOTA} requests exceeded`);
  }

  // Get credentials from environment
  const idcKey = Deno.env.get('LES_AIDES_IDC') || '711e55108232352685cca98b49777e6b836bfb79';
  const email = Deno.env.get('LES_AIDES_EMAIL');
  const password = Deno.env.get('LES_AIDES_PASSWORD');

  // Build query string
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(`${key}[]`, String(v)));
    } else if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const url = `${API_BASE_URL}${path}?${searchParams.toString()}`;
  console.log(`🌐 API Request: ${url}`);

  // Prepare headers
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'User-Agent': 'SubsidyPilot/1.0 (backend)',
  };

  // Try X-IDC first, then fallback to Basic auth
  if (idcKey) {
    headers['X-IDC'] = idcKey;
  } else if (email && password) {
    const credentials = btoa(`${email}:${password}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else {
    throw new Error('No authentication credentials available');
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`❌ API Error ${response.status}:`, errorText);
    
    if (response.status === 401) {
      throw new Error('Authentication failed - check credentials');
    } else if (response.status === 403) {
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`API Error: ${errorData.exception} (field: ${errorData.field})`);
      } catch {
        throw new Error(`API Error 403: ${errorText}`);
      }
    } else if (response.status === 429) {
      throw new Error('Rate limit exceeded');
    }
    
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return await response.json();
}

async function searchAides(params: {
  ape?: string;
  domaine?: number | number[];
  siret?: string;
  siren?: string;
  moyen?: number | number[];
  filiere?: number;
  region?: number;
  departement?: string;
  commune?: number | string;
}) {
  return await makeApiRequest('/aides/', params);
}

async function loadFiche(requete: number, dispositif: number) {
  return await makeApiRequest('/aide/', { requete, dispositif });
}

async function getReferenceLists() {
  const lists: Record<string, any> = {};
  const endpoints = [
    'domaines',
    'moyens',
    'filieres',
    'regions',
    'departements'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📋 Fetching reference list: ${endpoint}`);
      lists[endpoint] = await makeApiRequest(`/liste/${endpoint}`);
      // Small delay between reference requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error.message);
      lists[endpoint] = [];
    }
  }

  return lists;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🚀 Starting les-aides.fr API sync...');

    // Log sync start
    const { data: logData } = await supabase
      .from('api_sync_logs')
      .insert({
        api_source: 'les-aides-fr',
        sync_type: 'api_sync',
        status: 'running'
      })
      .select()
      .single();

    if (!logData) {
      throw new Error('Failed to create sync log');
    }

    const syncLogId = logData.id;

    try {
      console.log('🔑 Testing API authentication...');
      
      // First, get reference lists to validate API access and cache them
      console.log('📋 Fetching reference lists...');
      const referenceLists = await getReferenceLists();
      console.log('✅ Reference lists loaded successfully');
      console.log(`📊 Loaded ${Object.keys(referenceLists).length} reference lists`);

      // Log available domains for reference
      if (referenceLists.domaines && Array.isArray(referenceLists.domaines)) {
        console.log('📋 Available domains:');
        referenceLists.domaines.slice(0, 10).forEach((domain: any) => {
          console.log(`   ${domain.numero}: ${domain.libelle}`);
        });
      }

      // Clean existing data
      console.log('🧹 Cleaning existing data...');
      const purgeResult = await supabase.rpc('safe_data_purge');
      console.log('✅ Data purged:', purgeResult.data);

      // Define search strategies using proper API parameters from documentation
      // Using real domain numbers from the reference list
      const searchStrategies = [
        // Agriculture sector
        { name: 'Agriculture - Création/Reprise', params: { ape: 'A', domaine: 790 } },
        { name: 'Agriculture - Développement', params: { ape: 'A', domaine: 798 } },
        { name: 'Agriculture - Innovation', params: { ape: 'A', domaine: 799 } },
        
        // Manufacturing
        { name: 'Industrie - Innovation', params: { ape: 'C', domaine: 798 } },
        { name: 'Industrie - Création', params: { ape: 'C', domaine: 790 } },
        
        // Commerce
        { name: 'Commerce - Développement', params: { ape: 'G', domaine: 798 } },
        { name: 'Commerce - Création', params: { ape: 'G', domaine: 790 } },
        
        // Services
        { name: 'Services - Numérique', params: { ape: 'J', domaine: 798 } },
        { name: 'Services - Création', params: { ape: 'J', domaine: 790 } },
        
        // Multi-domain searches
        { name: 'All sectors - Multiple domains', params: { ape: 'A', domaine: [790, 798] } },
        
        // Specific funding types
        { name: 'Subventions tous secteurs', params: { ape: 'A', domaine: 798, moyen: 833 } },
        { name: 'Prêts tous secteurs', params: { ape: 'C', domaine: 798, moyen: 827 } }
      ];

      let allSubsidies: any[] = [];
      let totalSearches = 0;
      let errors: any[] = [];

      console.log(`🔍 Starting ${searchStrategies.length} search strategies...`);

      for (const strategy of searchStrategies) {
        console.log(`🎯 Trying strategy: ${strategy.name}`);
        
        try {
          // Add delay between searches to respect rate limits
          if (totalSearches > 0) {
            console.log('⏱️ Rate limiting delay...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          const searchResult = await searchAides(strategy.params);
          
          console.log(`📊 Strategy ${strategy.name}: Found ${searchResult.nb_dispositifs || 0} dispositifs`);
          
          if (searchResult.depassement) {
            console.warn(`⚠️ Too many results for ${strategy.name} - refining search recommended`);
          }
          
          if (searchResult.dispositifs && searchResult.dispositifs.length > 0) {
            // Process each dispositif
            for (const dispositif of searchResult.dispositifs.slice(0, 20)) { // Limit to first 20 to conserve quota
              try {
                // Map dispositif to our schema
                const subsidy = {
                  code: `les-aides-${dispositif.numero}`,
                  title: { fr: dispositif.nom },
                  description: { fr: dispositif.resume || '' },
                  source_url: dispositif.uri,
                  source: 'les-aides-fr',
                  country: 'france',
                  status: 'open',
                  agency: dispositif.sigle || 'les-aides.fr',
                  external_id: `les-aides-${dispositif.numero}`,
                  level: dispositif.implantation === 'E' ? 'european' : 
                         dispositif.implantation === 'N' ? 'national' : 'regional',
                  tags: dispositif.domaines ? dispositif.domaines.map((d: number) => `domain-${d}`) : [],
                  funding_type: dispositif.moyens && dispositif.moyens.length > 0 ? 
                    (dispositif.moyens.includes(833) ? 'grant' : 
                     dispositif.moyens.includes(827) ? 'loan' : 'other') : 'grant',
                  last_synced_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  raw_data: dispositif
                };

                allSubsidies.push(subsidy);
                
              } catch (mappingError) {
                console.error('Mapping error for dispositif:', mappingError);
                errors.push({
                  strategy: strategy.name,
                  dispositif: dispositif.numero,
                  error: mappingError.message
                });
              }
            }

            // Store search metadata for potential reuse
            if (searchResult.idr) {
              console.log(`💾 Search IDR for ${strategy.name}: ${searchResult.idr}`);
            }
          }
          
          totalSearches++;
          
        } catch (error) {
          console.error(`❌ Strategy ${strategy.name} failed:`, error.message);
          errors.push({
            strategy: strategy.name,
            error: error.message
          });
        }
      }

      console.log(`📊 Total subsidies found: ${allSubsidies.length}`);
      
      if (allSubsidies.length === 0) {
        throw new Error(`No subsidies found. Errors: ${JSON.stringify(errors, null, 2)}`);
      }

      // Remove duplicates based on external_id
      const uniqueSubsidies = allSubsidies.filter((subsidy, index, array) => 
        array.findIndex(s => s.external_id === subsidy.external_id) === index
      );

      console.log(`📊 After deduplication: ${uniqueSubsidies.length} unique subsidies`);

      // Insert subsidies into database
      console.log('💾 Inserting subsidies into database...');
      let insertedCount = 0;
      let skippedCount = 0;

      for (const subsidy of uniqueSubsidies) {
        try {
          const { error: insertError } = await supabase
            .from('subsidies')
            .insert(subsidy);

          if (insertError) {
            console.error('Insert error:', insertError);
            skippedCount++;
          } else {
            insertedCount++;
          }
        } catch (insertError) {
          console.error('Exception during insert:', insertError);
          skippedCount++;
        }
      }

      // Update sync log with success
      await supabase
        .from('api_sync_logs')
        .update({
          status: 'completed',
          records_processed: uniqueSubsidies.length,
          records_added: insertedCount,
          completed_at: new Date().toISOString(),
          errors: errors.length > 0 ? { 
            errors, 
            skipped: skippedCount, 
            quota_used: dailyRequestCount,
            reference_lists_loaded: Object.keys(referenceLists).length
          } : null
        })
        .eq('id', syncLogId);

      const result = {
        success: true,
        sync_log_id: syncLogId,
        total_found: allSubsidies.length,
        unique_subsidies: uniqueSubsidies.length,
        inserted: insertedCount,
        skipped: skippedCount,
        searches_performed: totalSearches,
        strategies_used: searchStrategies.length,
        quota_used: dailyRequestCount,
        quota_remaining: DAILY_QUOTA - dailyRequestCount,
        reference_lists_loaded: Object.keys(referenceLists).length,
        errors: errors.length > 0 ? errors : undefined
      };

      console.log('🎉 API Sync completed successfully:', result);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (error) {
      console.error('💥 Sync failed:', error);
      
      // Update sync log with failure
      await supabase
        .from('api_sync_logs')
        .update({
          status: 'failed',
          errors: { message: error.message, stack: error.stack, quota_used: dailyRequestCount },
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLogId);

      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        sync_log_id: syncLogId,
        quota_used: dailyRequestCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } catch (error) {
    console.error('🚨 Critical error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});