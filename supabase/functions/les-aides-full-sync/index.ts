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
    const startTime = Date.now();
    
    const sessionId = `les-aides-sync-${Date.now()}`;
    console.log(`📋 Session ID: ${sessionId}`);
    console.log(`🔑 Using IDC: ${lesAidesApiKey.substring(0, 10)}...${lesAidesApiKey.substring(-10)}`);
    
    // Official Les-Aides.fr API endpoints from documentation
    const baseApiUrl = 'https://api.les-aides.fr';
    const searchEndpoint = '/aides/';
    const ficheEndpoint = '/aide/';
    
    // Agricultural domains to search (from documentation)
    const agriculturalDomains = [
      790, // Création Reprise
      793, // Cession Transmission  
      798, // Développement commercial
    ];
    
    // Agricultural APE codes (from NAF nomenclature)
    const agriculturalApes = [
      'A',     // Agriculture, sylviculture et pêche (broad category)
      '01',    // Culture et production animale, chasse et services annexes
      '0111Z', // Culture de céréales
      '0112Z', // Culture du riz
      '0113Z', // Culture de légumes, melons, racines
      '0116Z', // Culture de plantes à fibres
      '0121Z', // Culture de la vigne
      '0141Z', // Élevage de vaches laitières
      '0142Z', // Élevage d'autres bovins et de buffles
      '0143Z', // Élevage de chevaux et d'autres équidés
      '0144Z', // Élevage de chameaux et d'autres camélidés
      '0145Z', // Élevage d'ovins et de caprins
      '0146Z', // Élevage de porcins
      '0147Z', // Élevage de volailles
    ];
    
    let totalRequests = 0;
    const requestLimit = 100; // Stay well under the 720 daily limit
    
    console.log(`🎯 Will search ${agriculturalDomains.length} domains × ${agriculturalApes.length} APE codes`);
    console.log(`📊 Estimated requests: ${agriculturalDomains.length * agriculturalApes.length} (limit: ${requestLimit})`);
    
    // Search for aids across different domain/APE combinations
    for (const domain of agriculturalDomains) {
      for (const ape of agriculturalApes) {
        if (totalRequests >= requestLimit) {
          console.log(`⚠️ Reached request limit (${requestLimit}), stopping to avoid API quota`);
          break;
        }
        
        console.log(`🔍 Searching domain ${domain} + APE ${ape}...`);
        
        try {
          // Build search URL with parameters
          const searchParams = new URLSearchParams({
            ape: ape,
            domaine: domain.toString(),
            format: 'json'
          });
          
          const searchUrl = `${baseApiUrl}${searchEndpoint}?${searchParams.toString()}`;
          console.log(`📡 Making search request: ${searchUrl}`);
          
          const searchResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip',
              'X-IDC': lesAidesApiKey, // Using X-IDC as documented
              'User-Agent': 'AgriTool-Platform/1.0 API les-aides.fr',
            }
          });
          
          totalRequests++;
          console.log(`📊 Search response: ${searchResponse.status} ${searchResponse.statusText}`);
          
          if (searchResponse.status === 401) {
            console.error('❌ Authentication failed - check IDC key');
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
              console.log(`📋 Error details:`, errorData);
              
              if (errorData.exception?.includes('APE') || errorData.exception?.includes('domaine')) {
                console.log(`⚠️ Invalid parameter combination: domain ${domain} + APE ${ape}, skipping...`);
                continue; // Skip this combination and try next
              }
            } catch (parseError) {
              console.log('Could not parse error response');
            }
            continue;
          }
          
          if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error(`❌ HTTP ${searchResponse.status}: ${errorText.substring(0, 200)}`);
            continue;
          }
          
          const searchData: LesAidesResponse = await searchResponse.json();
          
          console.log(`✅ Search successful for domain ${domain} + APE ${ape}:`);
          console.log(`📊 Found ${searchData.nb_dispositifs} dispositifs (depassement: ${searchData.depassement})`);
          console.log(`📋 IDR: ${searchData.idr}`);
          
          if (searchData.nb_dispositifs === 0) {
            console.log('⚠️ No dispositifs found for this combination');
            continue;
          }
          
          if (searchData.depassement) {
            console.log('⚠️ Too many results (>200), should refine search criteria');
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
                  search_context: { domain, ape, idr: searchData.idr }
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
                    region: dispositif.implantation === 'N' ? 'National' : 
                           dispositif.implantation === 'E' ? 'European' : 'Territorial'
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
          console.error(`❌ Search error for domain ${domain} + APE ${ape}:`, searchError.message);
          errorCount++;
        }
        
        if (totalRequests >= requestLimit) break;
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