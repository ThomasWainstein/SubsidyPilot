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
    const { dry_run = false, limit = 100, max_pages = 10 } = config

    console.log(`🚀 Starting les-aides.fr ingestion - dry_run: ${dry_run}, limit: ${limit}`)

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
      // 3. Fetch data from les-aides.fr API  
      const subsidies = await fetchLesAidesData(limit, max_pages)
      console.log(`📥 Fetched ${subsidies.length} subsidies from les-aides.fr`)

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
        message: dry_run ? 'Dry run completed successfully' : 'Sync completed successfully'
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

  const baseUrl = 'https://api.les-aides.fr/aides/'
  const subsidies = []
  let totalFetched = 0

  console.log(`🔍 Fetching from les-aides.fr API (limit: ${limit})`)

  // Define multiple search scenarios to get diverse subsidies
  const searchScenarios = [
    { ape: 'A', domaine: 790 }, // Agriculture - Création Reprise
    { ape: 'C', domaine: 798 }, // Manufacturing - Développement commercial  
    { ape: 'G', domaine: 793 }, // Commerce - Cession Transmission
    { ape: 'J', domaine: 790 }, // Information - Création Reprise
    { ape: 'M', domaine: 798 }, // Services - Développement commercial
    { ape: 'N', domaine: 790 }, // Admin services - Création Reprise
  ]

  for (const scenario of searchScenarios) {
    if (totalFetched >= limit) break

    try {
      // Build search parameters
      const params = new URLSearchParams({
        ape: scenario.ape,
        domaine: scenario.domaine.toString(),
        format: 'json'
      })

      const url = `${baseUrl}?${params}`
      console.log(`📄 Searching with APE: ${scenario.ape}, Domain: ${scenario.domaine}`)
      
      const response = await fetch(url, {
        headers: {
          'X-IDC': apiKey,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:41.0) API les-aides.fr'
        }
      })

      if (!response.ok) {
        console.error(`HTTP ${response.status} for scenario ${JSON.stringify(scenario)}: ${response.statusText}`)
        continue
      }

      const data = await response.json()
      console.log(`📊 API Response keys:`, Object.keys(data))
      
      // Parse les-aides.fr API response format
      if (!data.dispositifs || !Array.isArray(data.dispositifs)) {
        console.warn(`No dispositifs found for scenario ${JSON.stringify(scenario)}`)
        continue
      }

      const deviceCount = Math.min(data.dispositifs.length, Math.floor(limit / searchScenarios.length))
      const selectedDevices = data.dispositifs.slice(0, deviceCount)
      
      console.log(`📄 Found ${data.dispositifs.length} subsidies, taking ${selectedDevices.length}`)

      // Transform API data to our format
      for (const device of selectedDevices) {
        if (totalFetched >= limit) break

        // Fetch full device details
        const deviceDetails = await fetchDeviceDetails(device.numero, data.idr, apiKey)
        
        const transformedSubsidy = {
          id: device.numero.toString(),
          title: device.nom || 'Untitled',
          description: deviceDetails?.objet || device.resume || '',
          url: device.uri || `https://les-aides.fr/aide/${device.numero}`,
          amount: deviceDetails?.montants || '',
          deadline: '', // Not available in basic search
          organization: device.sigle || '',
          region: '', // Varies by search location
          sector: '', // Determined by APE code
          agency: device.sigle,
          implantation: device.implantation, // E/N/T
          domains: device.domaines || [],
          means: device.moyens || [],
          aps: device.aps || false,
          nouveau: device.nouveau || false,
          validation: device.validation,
          generation: device.generation,
          revision: device.revision,
          raw_api_data: { search_scenario: scenario, device, details: deviceDetails }
        }

        subsidies.push(transformedSubsidy)
        totalFetched++
      }
      
      // Rate limiting between searches
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.error(`Error fetching scenario ${JSON.stringify(scenario)}:`, error)
      continue
    }
  }

  console.log(`📊 Final result: ${subsidies.length} subsidies from ${searchScenarios.length} scenarios`)
  return subsidies
}

async function fetchDeviceDetails(deviceNumber: number, requestId: number, apiKey: string) {
  try {
    const url = `https://api.les-aides.fr/aide/?requete=${requestId}&dispositif=${deviceNumber}&format=json`
    
    const response = await fetch(url, {
      headers: {
        'X-IDC': apiKey,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:41.0) API les-aides.fr'
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

async function fallbackScraping(limit: number) {
  console.log('🕷️ Starting fallback scraping')
  
  try {
    const response = await fetch('https://les-aides.fr/aides', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SubsidyPilot/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    
    // Simple HTML parsing for subsidy cards
    const subsidies = []
    const cardRegex = /<div[^>]*class="[^"]*aide[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    const titleRegex = /<h[2-4][^>]*>(.*?)<\/h[2-4]>/i
    const linkRegex = /href="([^"]*aide[^"]*)"/i
    
    let match
    while ((match = cardRegex.exec(html)) !== null && subsidies.length < limit) {
      const cardHtml = match[1]
      const titleMatch = cardHtml.match(titleRegex)
      const linkMatch = cardHtml.match(linkRegex)
      
      if (titleMatch && linkMatch) {
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim()
        const url = linkMatch[1].startsWith('http') ? linkMatch[1] : `https://les-aides.fr${linkMatch[1]}`
        
        subsidies.push({
          id: url.split('/').pop() || `scraped-${subsidies.length}`,
          title,
          description: '',
          url,
          amount: '',
          deadline: '',
          organization: '',
          region: '',
          sector: ''
        })
      }
    }
    
    console.log(`🕷️ Fallback scraping found ${subsidies.length} subsidies`)
    return subsidies
    
  } catch (error) {
    console.error('Fallback scraping failed:', error)
    return []
  }
}