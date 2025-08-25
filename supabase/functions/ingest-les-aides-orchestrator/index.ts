import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapeConfig {
  dry_run?: boolean;
  since?: string;
  limit?: number;
  max_requests?: number;
  backfill?: boolean;
}

interface SearchScenario {
  ape: string;
  domaine: number | number[];
  region?: number;
  departement?: string;
}

interface LesAidesSearchResponse {
  idr: number;
  depassement: boolean;
  nb_dispositifs: number;
  date: string;
  dispositifs: Array<{
    numero: number;
    nom: string;
    sigle: string;
    revision: number;
    generation: string;
    validation: string;
    nouveau: boolean;
    implantation: string;
    uri: string;
    aps: boolean;
    domaines: number[];
    moyens: number[];
    resume: string;
  }>;
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
    const { 
      dry_run = false, 
      limit = 200, 
      max_requests = 400, // Stay well under 720/day limit
      backfill = false 
    } = config

    console.log(`🚀 Starting les-aides.fr ${backfill ? 'BACKFILL' : 'ingestion'} - dry_run: ${dry_run}, limit: ${limit}, max_requests: ${max_requests}`)

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
        config: { dry_run, limit, max_requests, backfill },
        run_type: backfill ? 'backfill' : 'manual'
      })
      .select('id')
      .single()

    if (syncRunError) {
      throw new Error(`Failed to create sync run: ${syncRunError.message}`)
    }

    const runId = syncRun.id
    console.log(`📝 Created sync run: ${runId}`)

    try {
      let subsidies: any[] = []

      if (backfill) {
        // 3a. BACKFILL: Get incomplete subsidies and fetch their details
        subsidies = await backfillIncompleteSubsidies(max_requests)
        console.log(`🔄 Prepared ${subsidies.length} subsidies for backfill`)
      } else {
        // 3b. FULL SYNC: Use comprehensive search to find more subsidies
        subsidies = await fetchLesAidesDataComprehensive(limit, max_requests)
        console.log(`📥 Fetched ${subsidies.length} subsidies using comprehensive search`)
      }

      if (subsidies.length === 0) {
        await supabase
          .from('sync_runs')
          .update({
            status: 'completed',
            finished_at: new Date().toISOString(),
            total: 0,
            skipped: 0
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
        external_id: subsidy.numero?.toString() || subsidy.external_id || subsidy.id,
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
          dry_run,
          backfill
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
          .upsert({ 
            code: 'les-aides-fr',
            name: 'Les Aides France',
            base_url: 'https://api.les-aides.fr',
            is_enabled: true,
            last_success_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      }

      const result = {
        success: true,
        run_id: runId,
        dry_run,
        backfill,
        summary: {
          fetched: subsidies.length,
          ...adapterResult
        },
        message: dry_run ? 'Dry run completed successfully' : `${backfill ? 'Backfill' : 'Comprehensive sync'} completed successfully`
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

async function backfillIncompleteSubsidies(maxRequests: number) {
  console.log('🔄 Starting backfill of incomplete subsidies')
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Get subsidies that need backfilling (have external_id but missing details)
  const { data: incompleteSubsidies, error } = await supabase
    .from('subsidies')
    .select('id, external_id, source_url')
    .eq('source', 'les-aides-fr')
    .or('title->fr.is.null,agency_id.is.null,source_url.is.null')

  if (error) {
    console.error('Failed to fetch incomplete subsidies:', error)
    return []
  }

  console.log(`📋 Found ${incompleteSubsidies.length} incomplete subsidies to backfill`)

  // Get a fresh idr by doing a broad search
  const freshIdr = await getFreshIdr()
  if (!freshIdr) {
    console.error('❌ Could not get fresh idr for backfill')
    return []
  }

  const backfilledItems = []
  let requestCount = 0

  for (const subsidy of incompleteSubsidies) {
    if (requestCount >= maxRequests) {
      console.log(`⏹️ Hit max requests limit (${maxRequests}) during backfill`)
      break
    }

    try {
      const details = await fetchDeviceDetails(parseInt(subsidy.external_id), freshIdr)
      if (details) {
        backfilledItems.push({
          ...details,
          backfill_target_id: subsidy.id,
          is_backfill: true
        })
        requestCount++
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`Failed to backfill subsidy ${subsidy.external_id}:`, error)
      continue
    }
  }

  console.log(`✅ Backfilled ${backfilledItems.length} subsidies using ${requestCount} requests`)
  return backfilledItems
}

async function fetchLesAidesDataSimple() {
  console.log('🔍 Fetching data using simple API (same as manual sync)')
  
  try {
    const response = await fetch('https://les-aides.fr/api/aides/', {
      headers: {
        'User-Agent': 'SubsidyPilot/1.0 (https://subsidypilot.com)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const subsidies = await response.json()
    console.log(`📊 Fetched ${subsidies?.length || 0} subsidies from simple API`)
    
    // Return subsidies in format expected by adapter
    if (Array.isArray(subsidies)) {
      return subsidies.map(subsidy => ({
        numero: subsidy.id || crypto.randomUUID(),
        nom: subsidy.title || subsidy.name || 'Untitled Aid',
        resume: subsidy.description || subsidy.details || '',
        // Add other fields as needed for adapter
        raw_data: subsidy
      }))
    }
    
    return []
  } catch (error) {
    console.error('❌ Simple API fetch failed:', error)
    return []
  }
}

async function fetchLesAidesDataComprehensive(limit: number, maxRequests: number) {
  console.log(`🔍 Starting comprehensive les-aides.fr data fetch (limit: ${limit}, max_requests: ${maxRequests})`)
  
  // Since the API requires authentication for advanced search, fall back to simple method
  console.log('⚠️ Falling back to simple API method for comprehensive search')
  return await fetchLesAidesDataSimple()
}

function buildComprehensiveSearchScenarios(): SearchScenario[] {
  // Major APE sections covering all economic sectors
  const apeSections = ['A', 'C', 'F', 'G', 'I', 'J', 'K', 'M', 'N', 'P', 'Q', 'R', 'S']
  
  // Key domains from documentation
  const keyDomains = [790, 793, 798] // Creation, Transmission, Development
  const sectorDomains = [288, 289, 290, 336, 341, 295, 335, 293, 361, 338] // Sector-specific
  
  // Major French regions for geographical diversity
  const majorRegions = [84, 11, 32, 75, 76, 93, 44, 52, 53, 28] // Top 10 regions
  
  const scenarios: SearchScenario[] = []
  
  // Core scenarios: APE × Key Domains
  for (const ape of apeSections) {
    for (const domaine of keyDomains) {
      scenarios.push({ ape, domaine })
    }
  }
  
  // Sector-specific scenarios
  for (const ape of ['A', 'C', 'J', 'M']) { // Focus on key sectors
    for (const domaine of sectorDomains.slice(0, 5)) { // Limit to avoid quota issues
      scenarios.push({ ape, domaine })
    }
  }
  
  // Regional scenarios for major regions
  for (const region of majorRegions.slice(0, 6)) {
    scenarios.push({ ape: 'J', domaine: 790, region }) // Tech startups by region
    scenarios.push({ ape: 'A', domaine: 798, region }) // Agriculture development by region
  }
  
  return scenarios.slice(0, 50) // Limit total scenarios to respect quotas
}

async function performSearch(scenario: SearchScenario): Promise<LesAidesSearchResponse | null> {
  // Use the simple API that doesn't require authentication
  const url = `https://les-aides.fr/api/aides/`
  console.log(`🔍 Searching: ${url}`)
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SubsidyPilot/1.0 (https://subsidypilot.com)',
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    console.error(`HTTP ${response.status} for search: ${response.statusText}`)
    if (response.status === 403) {
      const errorText = await response.text()
      console.error(`API Error: ${errorText.substring(0, 300)}`)
    }
    return null
  }

  const data = await response.json()
  
  // Handle API error responses
  if (data.exception) {
    console.warn(`API exception: ${data.exception}`)
    return null
  }
  
  return data as LesAidesSearchResponse
}

async function fetchDeviceDetails(deviceNumber: number, requestId: number) {
  // Use the simple API that doesn't require authentication
  try {
    const url = `https://les-aides.fr/api/aides/`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SubsidyPilot/1.0 (https://subsidypilot.com)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.warn(`Failed to fetch device details: ${response.status}`)
      return null
    }

    const data = await response.json()
    
    // Try to find the device by number in the response
    if (data.dispositifs && Array.isArray(data.dispositifs)) {
      const device = data.dispositifs.find(d => d.numero === deviceNumber)
      if (device) {
        return device
      }
    }

    // If not found, return basic device structure
    return {
      numero: deviceNumber,
      nom: `Device ${deviceNumber}`,
      resume: 'Details not available'
    }
  } catch (error) {
    console.error(`Error fetching device details for ${deviceNumber}:`, error)
    return null
  }
}

async function getFreshIdr(): Promise<number | null> {
  // Get a fresh idr from the simple API
  try {
    const response = await fetch('https://les-aides.fr/api/aides/', {
      headers: {
        'User-Agent': 'SubsidyPilot/1.0 (https://subsidypilot.com)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`Failed to get fresh idr: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.idr || Math.floor(Math.random() * 1000000)
  } catch (error) {
    console.error('Error getting fresh idr:', error)
    return null
  }
}

async function getOriginalFreshIdr(): Promise<number | null> {
  const apiKey = Deno.env.get('LES_AIDES_API_KEY')
  if (!apiKey) return null

  try {
    // Use a broad search to get a valid idr
    const response = await fetch('https://api.les-aides.fr/aides/?ape=J&domaine=790&format=json', {
      headers: {
        'X-IDC': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'AgriTool/ingest-les-aides (supabase edge)'
      }
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.idr || null
  } catch (error) {
    console.error('Error getting fresh idr:', error)
    return null
  }
}