import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LesAidesDispositif {
  numero: number;
  nom: string;
  sigle?: string;
  revision?: number;
  generation?: string;
  validation?: string;
  nouveau?: boolean;
  implantation?: string; // "E", "N", "T"
  uri?: string;
  aps?: boolean;
  domaines?: number[];
  moyens?: number[];
  resume?: string;
}

interface LesAidesResponse {
  idr: number;
  depassement: boolean;
  nb_dispositifs: number;
  date: string;
  dispositifs: LesAidesDispositif[];
  etablissement?: any;
  localisation?: any;
}

interface LesAidesFicheDispositif extends LesAidesDispositif {
  auteur?: string;
  organisme?: {
    numero: number;
    sigle: string;
    raison_sociale: string;
    implantation: string;
    adresses?: Array<{
      libelle: string;
      interlocuteur?: string;
      adresse?: string;
      email?: string;
      service?: string;
      telephone?: string;
      telecopie?: string;
      web?: string;
    }>;
  };
  objet?: string;
  conditions?: string;
  montants?: string;
  conseils?: string;
  references?: string;
  restrictions?: string[];
  criteres?: {
    pour?: Array<{ libelle: string; enfants?: any[] }>;
    contre?: Array<{ libelle: string; enfants?: any[] }>;
  };
  particularites?: Array<{
    titre: string;
    texte: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Les-Aides.fr API sync started (with official documentation)');
    console.log('🔍 ENVIRONMENT DEBUG - Function is executing');
    console.log('🔍 ENVIRONMENT DEBUG - Date:', new Date().toISOString());
    console.log('🔍 ENVIRONMENT DEBUG - Timestamp:', Date.now());
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lesAidesApiKey = Deno.env.get('LES_AIDES_API_KEY') || '711e55108232352685cca98b49777e6b836bfb79';
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let totalAdded = 0;
    let totalUpdated = 0;
    let errorCount = 0;
    let totalRequests = 0; // Initialize request counter
    const startTime = Date.now();
    
    const sessionId = `les-aides-sync-${Date.now()}`;
    console.log(`📋 Session ID: ${sessionId}`);
    console.log(`🔑 Using IDC: ${lesAidesApiKey.substring(0, 10)}...${lesAidesApiKey.substring(-10)}`);
    
    // Official Les-Aides.fr API endpoints from documentation
    const baseApiUrl = 'https://api.les-aides.fr';
    const searchEndpoint = '/aides/';
    const ficheEndpoint = '/aide/';
    
    // Test basic API connectivity first
    console.log('🌐 Testing basic API connectivity...');
    try {
      const testUrl = `${baseApiUrl}/aides/?format=json`;
      console.log(`🧪 Test URL: ${testUrl}`);
      
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-IDC': lesAidesApiKey,
          'User-Agent': 'AgriTool-Platform/1.0 API les-aides.fr',
        }
      });
      
      console.log(`🧪 Test response: ${testResponse.status} ${testResponse.statusText}`);
      console.log(`🧪 Test response headers:`, Object.fromEntries(testResponse.headers.entries()));
      
      const testText = await testResponse.text();
      console.log(`🧪 Test response body (first 200 chars): ${testText.substring(0, 200)}`);
      
    } catch (testError) {
      console.error('🧪 Basic API test failed:', testError.message);
    }
    // COMPREHENSIVE API CONFIGURATION - Using official documentation
    console.log('🔍 Using COMPREHENSIVE APE + domain combinations from official documentation...');
    
    // Complete domain list from official API documentation
    const DOMAINS = [
      { numero: 893, libelle: 'Crise énergétique' },
      { numero: 883, libelle: 'France 2030' },
      { numero: 877, libelle: 'Plan Résilience' },
      { numero: 790, libelle: 'Création Reprise' },
      { numero: 793, libelle: 'Cession Transmission' },
      { numero: 798, libelle: 'Développement commercial' },
      { numero: 802, libelle: 'Investissement' },
      { numero: 805, libelle: 'Implantation Immobilier' },
      { numero: 862, libelle: 'Numérique' },
      { numero: 807, libelle: 'Innovation' },
      { numero: 810, libelle: 'International' },
      { numero: 813, libelle: 'Transition écologique' },
      { numero: 816, libelle: 'Ressources Humaines' },
      { numero: 820, libelle: 'Soutien à l\'ESS' },
      { numero: 818, libelle: 'Difficultés de trésorerie' }
    ];

    // Complete intervention methods from official API documentation  
    const MOYENS = [
      { numero: 822, libelle: 'Intervention en fonds propres' },
      { numero: 827, libelle: 'Avance − Prêts − Garanties' },
      { numero: 833, libelle: 'Subvention' },
      { numero: 837, libelle: 'Prise en charge des coûts' },
      { numero: 840, libelle: 'Allègement des charges sociales' },
      { numero: 845, libelle: 'Allègement des charges fiscales' }
    ];

    // Priority APE codes for systematic coverage
    const APE_CODES = [
      { code: 'A', libelle: 'Agriculture, sylviculture et pêche' },
      { code: 'C', libelle: 'Industrie manufacturière' },
      { code: 'F', libelle: 'Construction' },
      { code: 'G', libelle: 'Commerce de gros et de détail' },
      { code: 'J', libelle: 'Information et communication' },
      { code: 'M', libelle: 'Activités spécialisées, scientifiques et techniques' },
      { code: 'N', libelle: 'Activités de services administratifs et de soutien' }
    ];
    
    // Generate comprehensive search approaches using all combinations
    const workingSearchApproaches = [];
    
    // First, add proven working combinations (highest priority)
    const provenConfigs = [
      { name: 'APE A + domain 798', params: { ape: 'A', domaine: '798', format: 'json' } },
      { name: 'APE J + domain 798', params: { ape: 'J', domaine: '798', format: 'json' } },
      { name: 'APE C + domain 798', params: { ape: 'C', domaine: '798', format: 'json' } },
      { name: 'APE A + domain 790', params: { ape: 'A', domaine: '790', format: 'json' } },
      { name: 'APE A + domain 793', params: { ape: 'A', domaine: '793', format: 'json' } }
    ];
    workingSearchApproaches.push(...provenConfigs);
    
    // Then add systematic coverage of all domains with agriculture (most relevant)
    for (const domain of DOMAINS) {
      const configName = `APE A + domain ${domain.numero}`;
      if (!workingSearchApproaches.some(config => config.name === configName)) {
        workingSearchApproaches.push({
          name: `APE A + ${domain.libelle}`,
          params: { ape: 'A', domaine: domain.numero.toString(), format: 'json' }
        });
      }
    }
    
    // Add key business sectors with high-impact domains
    const businessSectors = ['C', 'F', 'G', 'J', 'M', 'N'];
    const highImpactDomains = [790, 793, 798, 802, 807, 813]; // Creation, transmission, development, investment, innovation, ecological transition
    
    for (const apeCode of businessSectors) {
      for (const domainNum of highImpactDomains) {
        const domain = DOMAINS.find(d => d.numero === domainNum);
        if (domain) {
          const configName = `APE ${apeCode} + ${domain.libelle}`;
          if (!workingSearchApproaches.some(config => config.name === configName)) {
            workingSearchApproaches.push({
              name: configName,
              params: { ape: apeCode, domaine: domainNum.toString(), format: 'json' }
            });
          }
        }
      }
    }
    
    // Add multi-domain searches for comprehensive coverage
    const multiDomainConfigs = [
      { name: 'APE A + Création/Transmission', params: { ape: 'A', format: 'json' }, domains: ['790', '793'] },
      { name: 'APE A + Innovation/Numérique', params: { ape: 'A', format: 'json' }, domains: ['807', '862'] },
      { name: 'APE G + Commerce/Développement', params: { ape: 'G', format: 'json' }, domains: ['798', '802'] },
      { name: 'APE C + Innovation/Investissement', params: { ape: 'C', format: 'json' }, domains: ['807', '802'] }
    ];
    workingSearchApproaches.push(...multiDomainConfigs);
    
    console.log(`🎯 COMPREHENSIVE COVERAGE: ${workingSearchApproaches.length} search configurations generated:`);
    console.log(`   ├─ ${provenConfigs.length} proven working configurations (priority)`);
    console.log(`   ├─ ${DOMAINS.length} agriculture + domain combinations`);
    console.log(`   ├─ ${businessSectors.length * highImpactDomains.length} business sector combinations`);
    console.log(`   └─ ${multiDomainConfigs.length} multi-domain strategies`);
    console.log(`📊 Available parameter space: ${APE_CODES.length} APE codes × ${DOMAINS.length} domains × ${MOYENS.length} intervention methods`);
    
    const requestLimit = 150; // Increased limit for comprehensive coverage
    
    // Search for aids using comprehensive approach
    for (const approach of workingSearchApproaches) {
        if (totalRequests >= requestLimit) {
          console.log(`⚠️ Reached request limit (${requestLimit}), stopping to avoid API quota`);
          break;
        }
        
        console.log(`🔍 Trying comprehensive approach: ${approach.name}...`);
        
        try {
          // Build search URL with comprehensive parameters
          const searchParams = new URLSearchParams(approach.params);
          
          // Handle multiple domains if specified
          if (approach.domains) {
            approach.domains.forEach(domain => {
              searchParams.append('domaine[]', domain);
            });
          }
          
          const searchUrl = `${baseApiUrl}${searchEndpoint}?${searchParams.toString()}`;
          console.log(`📡 Making comprehensive search request: ${searchUrl}`);
          console.log(`📋 Request headers:`, {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip', 
            'X-IDC': `${lesAidesApiKey.substring(0, 10)}...${lesAidesApiKey.substring(-10)}`,
            'User-Agent': 'AgriTool-Platform/1.0 API les-aides.fr'
          });

          const searchResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip',
              'X-IDC': lesAidesApiKey, // Using X-IDC as documented
              'User-Agent': 'AgriTool-Platform/1.0 API les-aides.fr',
            }
          });
          
          console.log(`🔍 RESPONSE DEBUG - Status: ${searchResponse.status}`);
          console.log(`🔍 RESPONSE DEBUG - Status Text: ${searchResponse.statusText}`);
          console.log(`🔍 RESPONSE DEBUG - Headers:`, Object.fromEntries(searchResponse.headers.entries()));
          console.log(`🔍 RESPONSE DEBUG - URL: ${searchResponse.url}`);
          
          totalRequests++;
          console.log(`📊 Search response: ${searchResponse.status} ${searchResponse.statusText}`);
          
          if (searchResponse.status === 401) {
            console.error('❌ Authentication failed - check IDC key');
            console.error('🔑 IDC being used:', `${lesAidesApiKey.substring(0, 15)}...${lesAidesApiKey.substring(-15)}`);
            return new Response(JSON.stringify({
              error: 'Authentication failed',
              message: 'IDC key is invalid or expired. Check your Les-Aides.fr account.'
            }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          if (searchResponse.status === 403) {
            const errorText = await searchResponse.text();
            console.error(`❌ API Error 403:`, errorText);
            
            try {
              const errorData = JSON.parse(errorText);
              console.log(`📋 Structured error:`, {
                exception: errorData.exception,
                field: errorData.field,
                api: errorData.api,
                args: errorData.args
              });
              
              // Use structured error information
              if (errorData.field === 'ape' || errorData.field === 'domaine') {
                console.log(`⚠️ Invalid parameter - ${errorData.field}: ${errorData.exception}, skipping approach: ${approach.name}...`);
                continue;
              }
            } catch (parseError) {
              console.log('Could not parse error response');
            }
            continue;
          }
          if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error(`❌ HTTP ${searchResponse.status}: ${errorText.substring(0, 500)}`);
            continue;
          }
          
          const rawResponseText = await searchResponse.text();
          console.log(`📄 Raw response (first 500 chars): ${rawResponseText.substring(0, 500)}`);
          
          let searchData: LesAidesResponse;
          try {
            searchData = JSON.parse(rawResponseText);
            console.log(`✅ JSON parsed successfully`);
            console.log(`📊 Response structure:`, {
              hasIdr: !!searchData.idr,
              hasDispositifs: !!searchData.dispositifs,
              nbDispositifs: searchData.nb_dispositifs,
              hasDepassement: searchData.depassement
            });
          } catch (parseError) {
            console.error(`❌ JSON parse error:`, parseError);
            console.log(`📄 Could not parse response as JSON: ${rawResponseText}`);
            continue;
          }
          
          console.log(`✅ Search successful for approach: ${approach.name}`);
          console.log(`📊 Found ${searchData.nb_dispositifs} dispositifs (depassement: ${searchData.depassement})`);
          console.log(`📋 IDR: ${searchData.idr}`);
          
          if (searchData.nb_dispositifs === 0) {
            console.log(`⚠️ No dispositifs found for approach: ${approach.name}`);
            continue;
          }
          
          if (searchData.depassement) {
            console.log('🚨 Too many results (>200) - API truncated results!');
            console.log('💡 Consider using more specific APE codes for better coverage');
            // Still process the truncated results
          }
          
          // Process each dispositif
          for (const [index, dispositif] of searchData.dispositifs.entries()) {
            if (totalRequests >= requestLimit) {
              console.log(`⚠️ Reached request limit, stopping dispositif processing`);
              break;
            }
            
            console.log(`📋 Processing dispositif ${index + 1}/${searchData.dispositifs.length}: "${dispositif.nom}"`);
            
            try {
              // Load full fiche for this dispositif
              const ficheParams = new URLSearchParams({
                requete: searchData.idr.toString(),
                dispositif: dispositif.numero.toString(),
                format: 'json'
              });
              
              const ficheUrl = `${baseApiUrl}${ficheEndpoint}?${ficheParams.toString()}`;
              console.log(`📄 Loading fiche: ${ficheUrl}`);
              
              const ficheResponse = await fetch(ficheUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'Accept-Encoding': 'gzip',
                  'X-IDC': lesAidesApiKey,
                  'User-Agent': 'AgriTool-Platform/1.0 API les-aides.fr',
                }
              });
              
              totalRequests++;
              
              if (!ficheResponse.ok) {
                console.error(`❌ Fiche load failed: ${ficheResponse.status}`);
                continue;
              }
              
              const ficheData: LesAidesFicheDispositif = await ficheResponse.json();
              console.log(`✅ Loaded fiche for dispositif ${dispositif.numero}`);
              
              // Check if dispositif already exists
              const externalId = dispositif.numero.toString();
              const { data: existingSubsidy } = await supabase
                .from('subsidies')
                .select('id')
                .eq('external_id', externalId)
                .eq('api_source', 'les-aides-fr')
                .maybeSingle();
              
              // Extract amount information from HTML montants field
              let amountMin = null;
              let amountMax = null;
              if (ficheData.montants) {
                // Simple regex to extract euro amounts
                const amountMatches = ficheData.montants.match(/(\d+(?:[\s,]\d{3})*(?:\.\d{2})?)\s*€/g);
                if (amountMatches && amountMatches.length > 0) {
                  const amounts = amountMatches.map(match => {
                    const num = match.replace(/[€\s,]/g, '').replace('.', '');
                    return parseInt(num);
                  }).filter(num => !isNaN(num));
                  
                  if (amounts.length > 0) {
                    amountMin = Math.min(...amounts);
                    amountMax = Math.max(...amounts);
                  }
                }
              }
              
              // Prepare subsidy data
              const subsidyData = {
                code: `les-aides-${dispositif.numero}`,
                external_id: externalId,
                api_source: 'les-aides-fr',
                title: dispositif.nom,
                description: ficheData.objet ? 
                  ficheData.objet.replace(/<[^>]*>/g, '').substring(0, 1000) : // Strip HTML
                  dispositif.resume || 'Aide aux entreprises françaises',
                amount_min: amountMin,
                amount_max: amountMax,
                currency: 'EUR',
                deadline: null, // Les-Aides.fr doesn't seem to have standardized deadlines
                eligibility_criteria: {
                  domaines: dispositif.domaines || [],
                  moyens: dispositif.moyens || [],
                  implantation: dispositif.implantation,
                  conditions: ficheData.conditions ? ficheData.conditions.replace(/<[^>]*>/g, '') : '',
                  criteres_pour: ficheData.criteres?.pour || [],
                  criteres_contre: ficheData.criteres?.contre || [],
                  restrictions: ficheData.restrictions || []
                },
                application_url: ficheData.organisme?.adresses?.[0]?.web || dispositif.uri || '',
                status: 'active',
                raw_data: {
                  dispositif: dispositif,
                  fiche: ficheData,
                  search_context: { 
                    approach: approach.name,
                    params: approach.params,
                    idr: searchData.idr 
                  }
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              if (existingSubsidy) {
                // Update existing
                const { error: updateError } = await supabase
                  .from('subsidies')
                  .update({
                    title: subsidyData.title,
                    description: subsidyData.description,
                    amount_min: subsidyData.amount_min,
                    amount_max: subsidyData.amount_max,
                    eligibility_criteria: subsidyData.eligibility_criteria,
                    application_url: subsidyData.application_url,
                    raw_data: subsidyData.raw_data,
                    updated_at: subsidyData.updated_at
                  })
                  .eq('id', existingSubsidy.id);
                
                if (updateError) {
                  console.error(`❌ Update failed:`, updateError.message);
                  errorCount++;
                } else {
                  totalUpdated++;
                  console.log(`🔄 Updated dispositif ${dispositif.numero}`);
                }
              } else {
                // Insert new
                const { data: insertedSubsidy, error: insertError } = await supabase
                  .from('subsidies')
                  .insert(subsidyData)
                  .select('id')
                  .single();
                
                if (insertError) {
                  console.error(`❌ Insert failed:`, {
                    error: insertError.message,
                    code: insertError.code,
                    title: subsidyData.title
                  });
                  errorCount++;
                } else {
                  totalAdded++;
                  console.log(`✅ Inserted dispositif ${dispositif.numero} as subsidy ID: ${insertedSubsidy.id}`);
                  
                  // Add categories based on domains
                  if (dispositif.domaines?.length > 0) {
                    const categoryData = dispositif.domaines.map((domainId: number) => ({
                      subsidy_id: insertedSubsidy.id,
                      category: `domain-${domainId}`,
                      sector: 'agriculture'
                    }));
                    
                    const { error: categoryError } = await supabase
                      .from('subsidy_categories')
                      .insert(categoryData);
                    
                    if (!categoryError) {
                      console.log(`🏷️ Added ${categoryData.length} domain categories`);
                    }
                  }
                  
                  // Add location (France by default, could be more specific based on implantation)
                  const locationData = {
                    subsidy_id: insertedSubsidy.id,
                    country_code: 'FR',
                    region: ficheData.implantation === 'N' ? 'National' : 
                           ficheData.implantation === 'E' ? 'European' : 'Territorial'
                  };
                  
                  const { error: locationError } = await supabase
                    .from('subsidy_locations')
                    .insert(locationData);
                  
                  if (!locationError) {
                    console.log(`📍 Added location: ${locationData.region}`);
                  }
                }
              }
              
              // Rate limiting between fiche requests
              await new Promise(resolve => setTimeout(resolve, 1000));
              
            } catch (dispositifError) {
              console.error(`❌ Dispositif processing error for ${dispositif.numero}:`, dispositifError.message);
              errorCount++;
            }
          }
          
          // Rate limiting between search requests
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (searchError) {
          console.error(`❌ Search error for approach: ${approach.name}:`, searchError.message);
          errorCount++;
        }
        
        if (totalRequests >= requestLimit) break;
      }
    
    // Log sync results
    const durationMinutes = Math.round((Date.now() - startTime) / (1000 * 60));
    
    await supabase.from('api_sync_logs').insert({
      api_source: 'les-aides-fr',
      sync_type: 'manual_sync',
      status: errorCount === 0 ? 'completed' : 'completed_with_errors',
      records_processed: totalAdded + totalUpdated + errorCount,
      records_added: totalAdded,
      records_updated: totalUpdated,
      errors: errorCount > 0 ? { error_count: errorCount, total_requests: totalRequests } : null,
      completed_at: new Date().toISOString()
    });
    
    console.log(`📊 Final summary: ${totalAdded} added, ${totalUpdated} updated, ${errorCount} errors`);
    console.log(`📡 Total API requests made: ${totalRequests}/${requestLimit}`);
    
    return new Response(JSON.stringify({
      success: true,
      session_id: sessionId,
      summary: {
        total_added: totalAdded,
        total_updated: totalUpdated,
        error_count: errorCount,
        duration_minutes: durationMinutes,
        api_requests_made: totalRequests,
        api_requests_limit: requestLimit,
        working_endpoint: `${baseApiUrl}${searchEndpoint}`,
        api_source: 'les-aides-fr'
      },
      message: `✅ Les-Aides.fr sync completed! Added ${totalAdded}, updated ${totalUpdated} subsidies with ${totalRequests} API requests.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Les-Aides.fr sync error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack?.substring(0, 1000) || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});