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
  const baseUrl = 'https://les-aides.fr/api/aides'
  const subsidies = []
  let page = 1
  let hasMore = true

  console.log(`🔍 Fetching from les-aides.fr API (limit: ${limit}, maxPages: ${maxPages})`)

  while (hasMore && page <= maxPages && subsidies.length < limit) {
    try {
      const url = `${baseUrl}?page=${page}&limit=${Math.min(50, limit - subsidies.length)}`
      console.log(`📄 Fetching page ${page}: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SubsidyPilot/1.0 (+https://subsidypilot.com)',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404 && page > 1) {
          // No more pages
          console.log('📄 Reached end of pages (404)')
          break
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Handle different response formats
      let pageSubsidies = []
      if (Array.isArray(data)) {
        pageSubsidies = data
      } else if (data.aides && Array.isArray(data.aides)) {
        pageSubsidies = data.aides
      } else if (data.results && Array.isArray(data.results)) {
        pageSubsidies = data.results
      } else {
        console.warn(`Unexpected API response format on page ${page}:`, Object.keys(data))
        break
      }

      if (pageSubsidies.length === 0) {
        console.log('📄 No more subsidies found')
        break
      }

      // Transform API data to our format
      const transformedSubsidies = pageSubsidies.map(item => ({
        id: item.id || item.slug || item.url,
        title: item.titre || item.title || item.name || 'Untitled',
        description: item.description || item.summary || '',
        url: item.url || item.lien || `https://les-aides.fr/aide/${item.id || item.slug}`,
        amount: item.montant || item.amount || item.budget,
        deadline: item.date_limite || item.deadline || item.echeance,
        organization: item.organisme || item.organization || item.porteur,
        region: item.region || item.territoire,
        sector: item.secteur || item.sector || item.thematique
      }))

      subsidies.push(...transformedSubsidies)
      console.log(`📄 Page ${page}: Added ${transformedSubsidies.length} subsidies (total: ${subsidies.length})`)
      
      page++
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`Error fetching page ${page}:`, error)
      
      if (page === 1) {
        // If first page fails, try fallback scraping
        console.log('🔄 Trying fallback scraping method')
        return await fallbackScraping(limit)
      }
      
      // For subsequent pages, continue with what we have
      console.log(`⚠️ Failed to fetch page ${page}, continuing with ${subsidies.length} subsidies`)
      break
    }
  }

  console.log(`📊 Final result: ${subsidies.length} subsidies from ${page - 1} pages`)
  return subsidies.slice(0, limit)
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