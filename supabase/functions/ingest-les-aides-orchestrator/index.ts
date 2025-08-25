import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapeConfig {
  dry_run?: boolean;
  since?: string;
  limit?: number;
  max_pages?: number;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const config: ScrapeConfig = await req.json().catch(() => ({}))
    const { dry_run = false, limit = 200, max_pages = 10 } = config

    console.log(`🚀 Starting comprehensive les-aides.fr ingestion - dry_run: ${dry_run}, limit: ${limit}`)

    // 1. Clean up any stuck syncs
    const { data: cleanupResult } = await supabase.rpc('cleanup_stuck_syncs')
    if (cleanupResult > 0) {
      console.log(`🧹 Cleaned up ${cleanupResult} stuck sync runs`)
    }

    // 2. Create new sync run
    const { data: syncRun, error: syncRunError } = await supabase
      .from('sync_runs')
      .insert({
        source_code: 'les-aides-fr',
        status: 'running',
        config: { dry_run, limit, max_pages },
        run_type: 'manual'
      })
      .select('id')
      .single()

    if (syncRunError) {
      throw new Error(`Failed to create sync run: ${syncRunError.message}`)
    }

    const runId = syncRun.id
    console.log(`📝 Created sync run: ${runId}`)

    try {
      // 3. Fetch data from les-aides.fr API with comprehensive coverage
      const subsidies = await fetchLesAidesData(limit, max_pages)
      console.log(`📥 Fetched ${subsidies.length} unique subsidies from les-aides.fr`)

      if (subsidies.length === 0) {
        await supabase
          .from('sync_runs')
          .update({
            status: 'completed',
            finished_at: new Date().toISOString(),
            total: 0,
            skipped: 0,
            error_message: 'No subsidies found'
          })
          .eq('id', runId)

        return new Response(JSON.stringify({
          success: true,
          run_id: runId,
          message: 'No subsidies found to process'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 4. Create sync items for tracking
      const syncItems = subsidies.map(subsidy => ({
        run_id: runId,
        external_id: subsidy.id || subsidy.url,
        item_type: 'subsidy',
        status: 'pending',
        item_data: subsidy
      }))

      if (!dry_run) {
        const { error: itemsError } = await supabase
          .from('sync_items')
          .insert(syncItems)

        if (itemsError) {
          console.error('Failed to create sync items:', itemsError)
        }
      }

      // 5. Process subsidies through adapter
      const adapterResponse = await supabase.functions.invoke('adapter-les-aides-fr', {
        body: {
          run_id: runId,
          items: subsidies,
          dry_run
        }
      })

      if (adapterResponse.error) {
        throw new Error(`Adapter failed: ${adapterResponse.error.message}`)
      }

      const adapterResult = adapterResponse.data
      console.log('📊 Adapter result:', adapterResult)

      // 6. Update sync run with results
      await supabase
        .from('sync_runs')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          total: adapterResult.total || subsidies.length,
          inserted: adapterResult.inserted || 0,
          updated: adapterResult.updated || 0,
          skipped: adapterResult.skipped || 0,
          failed: adapterResult.failed || 0
        })
        .eq('id', runId)

      // 7. Update ingestion source last success
      if (!dry_run && (adapterResult.inserted > 0 || adapterResult.updated > 0)) {
        await supabase
          .from('ingestion_sources')
          .update({ 
            last_success_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('code', 'les-aides-fr')
      }

      const result = {
        success: true,
        run_id: runId,
        dry_run,
        summary: {
          fetched: subsidies.length,
          ...adapterResult
        },
        message: dry_run ? 'Dry run completed successfully' : 'Comprehensive sync completed successfully'
      }

      console.log('✅ Orchestration completed:', result)

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      // Update sync run as failed
      await supabase
        .from('sync_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', runId)

      throw error
    }

  } catch (error) {
    console.error('🚨 Orchestration error:', error)
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Les Aides orchestration failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function fetchLesAidesData(limit: number, maxPages: number) {
  const apiKey = Deno.env.get('LES_AIDES_API_KEY')
  if (!apiKey) {
    throw new Error('LES_AIDES_API_KEY environment variable not found')
  }

  console.log(`🔍 Starting comprehensive les-aides.fr data fetch (limit: ${limit})`)

  // First, get reference data to build systematic search scenarios
  const { domains, regions } = await fetchReferenceData(apiKey)
  
  const subsidies = []
  const processedIds = new Set() // Avoid duplicates
  let totalFetched = 0
  let requestCount = 0
  const maxRequests = 80 // Stay well under 720 daily limit

  // Build systematic search scenarios
  const searchScenarios = buildSearchScenarios(domains, regions)
  console.log(`📋 Built ${searchScenarios.length} systematic search scenarios`)

  for (const scenario of searchScenarios) {
    if (totalFetched >= limit || requestCount >= maxRequests) break

    try {
      requestCount++
      
      // Build search parameters according to API documentation
      const params = new URLSearchParams({
        ape: scenario.ape,
        domaine: scenario.domaine.toString(),
        format: 'json'
      })
      
      // Add geographical filters if available
      if (scenario.region) params.append('region', scenario.region.toString())

      const url = `https://api.les-aides.fr/aides/?${params}`
      console.log(`📄 [${requestCount}/${maxRequests}] APE:${scenario.ape} Domain:${scenario.domaine}${scenario.region ? ` Region:${scenario.region}` : ''}`)
      
      const response = await fetch(url, {
        headers: {
          'X-IDC': apiKey,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x64_64; rv:41.0) API les-aides.fr'
        }
      })

      if (!response.ok) {
        console.error(`HTTP ${response.status}: ${response.statusText}`)
        if (response.status === 403) {
          const errorText = await response.text()
          console.error(`API Error: ${errorText.substring(0, 300)}`)
        }
        continue
      }

      const data = await response.json()
      
      // Handle API error responses
      if (data.exception) {
        console.warn(`API exception: ${data.exception}`)
        continue
      }
      
      // Parse les-aides.fr API response format
      if (!data.dispositifs || !Array.isArray(data.dispositifs)) {
        console.log(`No dispositifs found (total available: ${data.nb_dispositifs || 0})`)
        continue
      }

      console.log(`✅ Found ${data.dispositifs.length} subsidies (total available: ${data.nb_dispositifs})`)

      // Process all unique devices from this search
      for (const device of data.dispositifs) {
        if (totalFetched >= limit) break

        const deviceId = device.numero.toString()
        
        // Skip duplicates
        if (processedIds.has(deviceId)) {
          continue
        }
        processedIds.add(deviceId)

        // Fetch full device details 
        let deviceDetails = null
        if (requestCount < maxRequests) {
          deviceDetails = await fetchDeviceDetails(device.numero, data.idr, apiKey)
          requestCount++
        }
        
        const transformedSubsidy = {
          id: deviceId,
          title: device.nom || 'Aide sans titre',
          description: deviceDetails?.objet || device.resume || '',
          url: device.uri || `https://les-aides.fr/aide/${device.numero}`,
          amount: deviceDetails?.montants || '',
          deadline: '', // Available in device details conditions
          organization: deviceDetails?.organisme?.raison_sociale || device.sigle || 'Organisation inconnue',
          region: scenario.region ? regions.find(r => r.region === scenario.region)?.nom : '',
          sector: mapDomainsToSector(device.domaines || []),
          agency: deviceDetails?.organisme?.raison_sociale || device.sigle || '',
          implantation: device.implantation, // E/N/T
          domains: device.domaines || [],
          means: device.moyens || [],
          aps: device.aps || false,
          nouveau: device.nouveau || false,
          validation: device.validation,
          generation: device.generation,
          revision: device.revision,
          raw_api_data: { 
            search_scenario: scenario, 
            device, 
            details: deviceDetails,
            idr: data.idr,
            nb_dispositifs: data.nb_dispositifs
          }
        }

        subsidies.push(transformedSubsidy)
        totalFetched++
      }
      
      // Rate limiting: API allows 720/day = ~30/hour = 1 every 2min
      await new Promise(resolve => setTimeout(resolve, 2500))

    } catch (error) {
      console.error(`Error in scenario APE:${scenario.ape} Domain:${scenario.domaine}:`, error)
      continue
    }
  }

  console.log(`📊 Final result: ${subsidies.length} unique subsidies from ${requestCount} API requests`)
  return subsidies
}

async function fetchReferenceData(apiKey: string) {
  console.log('📚 Fetching reference data from les-aides.fr API...')
  
  const headers = {
    'X-IDC': apiKey,
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x64_64; rv:41.0) API les-aides.fr'
  }

  // Use documented domain values from the API documentation provided
  const domains = [
    {numero: 790, libelle: "Création Reprise"},
    {numero: 793, libelle: "Cession Transmission"},
    {numero: 798, libelle: "Développement commercial"},
    {numero: 288, libelle: "Aéronautique"},
    {numero: 289, libelle: "Agroalimentaire - Nutrition"},
    {numero: 290, libelle: "Agroindustrie"},
    {numero: 336, libelle: "Artisanat"},
    {numero: 341, libelle: "Automobile"},
    {numero: 295, libelle: "BTP matériaux de construction"},
    {numero: 335, libelle: "Economie Sociale et Solidaire"},
    {numero: 293, libelle: "Environnement"},
    {numero: 361, libelle: "Numérique"},
    {numero: 338, libelle: "Tourisme"},
    {numero: 392, libelle: "Logistique"},
    {numero: 297, libelle: "Santé"}
  ]

  // Use documented region values
  const regions = [
    {region: 84, nom: "Auvergne-Rhône-Alpes"},
    {region: 11, nom: "Île-de-France"},
    {region: 32, nom: "Hauts-de-France"},
    {region: 75, nom: "Nouvelle-Aquitaine"},
    {region: 76, nom: "Occitanie"},
    {region: 93, nom: "Provence-Alpes-Côte d'Azur"},
    {region: 44, nom: "Grand Est"},
    {region: 52, nom: "Pays de la Loire"},
    {region: 53, nom: "Bretagne"},
    {region: 28, nom: "Normandie"}
  ]

  console.log(`📚 Using reference data: ${domains.length} domains, ${regions.length} regions`)
  
  return { domains, regions }
}

function buildSearchScenarios(domains: any[], regions: any[]) {
  const scenarios = []
  
  // Major APE sections covering all economic sectors
  const apeSections = [
    'A', // Agriculture, sylviculture et pêche
    'C', // Industrie manufacturière  
    'F', // Construction
    'G', // Commerce
    'I', // Hébergement et restauration
    'J', // Information et communication
    'K', // Activités financières
    'M', // Activités spécialisées, scientifiques et techniques
    'N', // Activités de services administratifs
    'P', // Enseignement
    'Q', // Santé humaine et action sociale
    'R', // Arts, spectacles et activités récréatives
    'S'  // Autres activités de services
  ]
  
  // Key domains to cover different types of aid
  const keyDomains = [790, 793, 798, 288, 289, 290, 336, 341, 295, 335, 293, 361, 338]
  
  // Major regions for geographical diversity
  const majorRegions = [84, 11, 32, 75, 76, 93] // Top 6 regions
  
  // Build comprehensive scenarios
  for (const ape of apeSections) {
    for (const domain of keyDomains) {
      // Base scenario without region
      scenarios.push({ ape, domaine: domain })
      
      // Regional variants for key combinations
      if (scenarios.length < 60) { // Limit to stay under API quotas
        for (const region of majorRegions.slice(0, 2)) {
          scenarios.push({ ape, domaine: domain, region })
        }
      }
    }
  }
  
  // Ensure we don't exceed reasonable limits
  return scenarios.slice(0, 50)
}

function mapDomainsToSector(domains: number[]): string {
  const sectorMap: Record<number, string> = {
    288: 'Aéronautique',
    289: 'Agroalimentaire', 
    290: 'Agroindustrie',
    336: 'Artisanat',
    341: 'Automobile',
    295: 'BTP',
    335: 'ESS',
    293: 'Environnement',
    361: 'Numérique',
    338: 'Tourisme',
    392: 'Logistique',
    297: 'Santé',
    790: 'Création',
    793: 'Transmission',
    798: 'Développement'
  }
  
  if (!domains?.length) return 'Général'
  const sectors = domains.map(d => sectorMap[d]).filter(Boolean)
  return sectors.length > 0 ? sectors.join(', ') : 'Autre'
}

async function fetchDeviceDetails(deviceNumber: number, requestId: number, apiKey: string) {
  try {
    const url = `https://api.les-aides.fr/aide/?requete=${requestId}&dispositif=${deviceNumber}&format=json`
    
    const response = await fetch(url, {
      headers: {
        'X-IDC': apiKey,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x64_64; rv:41.0) API les-aides.fr'
      }
    })

    if (!response.ok) {
      console.warn(`Failed to fetch details for device ${deviceNumber}: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Error fetching device details for ${deviceNumber}:`, error)
    return null
  }
}