import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = 'https://gvfgvbztagafjykncwto.supabase.co'
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Rate limiting - check daily quota
async function checkRateLimit(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const { data, error } = await supabase
    .from('api_rate_limits')
    .select('request_count')
    .eq('api_source', 'les-aides-fr')
    .eq('date', today)
    .single()

  if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
    console.log(`⚠️ Rate limit check failed: ${error.message}`)
    return true // Allow on error
  }

  const currentCount = data?.request_count || 0
  const dailyLimit = 720 // Les-Aides.fr daily quota
  
  console.log(`📊 API usage today: ${currentCount}/${dailyLimit}`)
  
  if (currentCount >= dailyLimit) {
    console.log('🚫 Daily quota exceeded, stopping sync')
    return false
  }
  
  return true
}

async function incrementRateLimit(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  
  const { error } = await supabase.rpc('increment_api_rate_count', {
    p_api_source: 'les-aides-fr',
    p_date: today
  })

  if (error) {
    console.log(`⚠️ Failed to update rate limit: ${error.message}`)
  }
}

// Les-Aides.fr API client following exact spec
class LesAidesClient {
  private baseUrl = 'https://api.les-aides.fr'
  private headers: Record<string, string>
  
  constructor() {
    // Try X-IDC first, fallback to Basic auth (per spec)
    const idc = Deno.env.get('LES_AIDES_IDC')?.trim()
    const email = Deno.env.get('LES_AIDES_EMAIL')
    const password = Deno.env.get('LES_AIDES_PASSWORD')
    
    this.headers = {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'User-Agent': 'SubsidyPilot/1.0'
    }
    
    if (idc) {
      this.headers['X-IDC'] = idc
      console.log('🔑 Using X-IDC authentication')
    } else if (email && password) {
      const credentials = btoa(`${email}:${password}`)
      this.headers['Authorization'] = `Basic ${credentials}`
      console.log('🔑 Using Basic authentication')
    } else {
      throw new Error('No authentication credentials found. Set LES_AIDES_IDC or LES_AIDES_EMAIL + LES_AIDES_PASSWORD')
    }
  }

  async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    // Rate limiting
    await incrementRateLimit()
    
    const url = new URL(endpoint, this.baseUrl)
    
    // Handle array parameters with proper syntax (domaine[]=value&domaine[]=value2)
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(`${key}[]`, String(v)))
      } else if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    console.log(`🌐 API Request: ${url.toString()}`)
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.headers
      })
      
      const responseText = await response.text()
      
      if (!response.ok) {
        const errorMsg = `API Error ${response.status}: ${responseText}`
        console.log(`❌ ${errorMsg}`)
        throw new Error(errorMsg)
      }
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`)
      }
      
      console.log(`✅ Success: ${Array.isArray(data) ? data.length + ' items' : 'data received'}`)
      return data
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`)
      throw error
    }
  }
}

// Reference data cache with proper typing
interface ReferenceCache {
  domaines: Array<{numero: number, libelle: string}>
  moyens: Array<{numero: number, libelle: string}>
  naf: Array<{code: string, libelle: string}>
  regions: Array<{numero: string, nom: string}>
  departements: Array<{numero: string, nom: string}>
}

async function loadReferenceData(client: LesAidesClient): Promise<ReferenceCache> {
  console.log('📋 Fetching reference lists...')
  
  const references: ReferenceCache = {
    domaines: [],
    moyens: [],
    naf: [],
    regions: [],
    departements: []
  }

  try {
    // Fetch reference data sequentially with delays to respect rate limits
    references.domaines = await client.makeRequest('/liste/domaines')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    references.moyens = await client.makeRequest('/liste/moyens') 
    await new Promise(resolve => setTimeout(resolve, 500))
    
    references.naf = await client.makeRequest('/liste/naf')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    references.regions = await client.makeRequest('/liste/regions')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    references.departements = await client.makeRequest('/liste/departements')
    
    console.log(`✅ Reference lists loaded successfully`)
    console.log(`📊 Loaded domains: ${references.domaines.length}, moyens: ${references.moyens.length}, NAF: ${references.naf.length}`)
    
    return references
    
  } catch (error) {
    console.error(`❌ Failed to load reference data: ${error.message}`)
    throw error
  }
}

async function performSearches(client: LesAidesClient, references: ReferenceCache): Promise<any[]> {
  // Check quota before starting
  if (!await checkRateLimit()) {
    throw new Error('Daily quota exceeded before starting searches')
  }

  // Build search strategies using valid domain IDs from reference data
  const searchStrategies: Array<{name: string, params: Record<string, any>}> = []
  
  // Find specific domains by label
  const creationDomain = references.domaines.find(d => d.libelle.toLowerCase().includes('création'))
  const developmentDomain = references.domaines.find(d => d.libelle.toLowerCase().includes('développement'))
  const innovationDomain = references.domaines.find(d => d.libelle.toLowerCase().includes('innovation'))
  
  // Fallback to first few domains if specific ones not found
  const fallbackDomains = references.domaines.slice(0, 3).map(d => d.numero)
  
  if (creationDomain) {
    searchStrategies.push(
      { name: 'Agriculture - Création', params: { ape: 'A', domaine: creationDomain.numero } },
      { name: 'Industrie - Création', params: { ape: 'C', domaine: creationDomain.numero } }
    )
  }
  
  if (developmentDomain) {
    searchStrategies.push(
      { name: 'Agriculture - Développement', params: { ape: 'A', domaine: developmentDomain.numero } },
      { name: 'Services - Développement', params: { ape: 'J', domaine: developmentDomain.numero } }
    )
  }
  
  // Add some multi-domain searches using first available domains
  if (fallbackDomains.length >= 2) {
    searchStrategies.push(
      { name: 'Multi-secteur Agriculture', params: { ape: 'A', domaine: fallbackDomains.slice(0, 2) } },
      { name: 'Multi-secteur Services', params: { ape: 'J', domaine: fallbackDomains.slice(0, 2) } }
    )
  }
  
  // Single domain fallback if no good matches found
  if (searchStrategies.length === 0 && fallbackDomains.length > 0) {
    searchStrategies.push(
      { name: 'Agriculture - Premier domaine', params: { ape: 'A', domaine: fallbackDomains[0] } },
      { name: 'Services - Premier domaine', params: { ape: 'J', domaine: fallbackDomains[0] } }
    )
  }

  const allSubsidies: any[] = []
  const errors: any[] = []
  
  console.log(`🔍 Starting ${searchStrategies.length} search strategies...`)

  for (const [index, strategy] of searchStrategies.entries()) {
    // Check quota before each search
    if (!await checkRateLimit()) {
      console.log('🚫 Daily quota reached, stopping searches')
      break
    }
    
    console.log(`🎯 Strategy ${index + 1}/${searchStrategies.length}: ${strategy.name}`)
    
    try {
      // Add delay between searches
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const searchResult = await client.makeRequest('/aides/', strategy.params)
      
      console.log(`📊 Found ${searchResult.nb_dispositifs || 0} dispositifs`)
      
      if (searchResult.depassement) {
        console.warn(`⚠️ Results truncated due to depassement for ${strategy.name}`)
      }
      
      if (searchResult.dispositifs && Array.isArray(searchResult.dispositifs)) {
        // Process dispositifs and map to subsidy format
        for (const dispositif of searchResult.dispositifs.slice(0, 10)) { // Limit to conserve quota
          try {
            const subsidy = {
              code: `les-aides-${dispositif.numero}`,
              title: { fr: dispositif.nom || 'Untitled' },
              description: { fr: dispositif.resume || '' },
              source_url: dispositif.uri,
              source: 'les-aides-fr',
              country: 'france',
              status: 'open',
              agency: dispositif.sigle || 'les-aides.fr',
              external_id: String(dispositif.numero),
              level: dispositif.implantation === 'E' ? 'european' : 
                     dispositif.implantation === 'N' ? 'national' : 'regional',
              tags: dispositif.domaines ? dispositif.domaines.map((d: number) => `domain-${d}`) : [],
              funding_type: 'grant', // Default for now
              last_synced_at: new Date().toISOString(),
              raw_data: dispositif
            }

            allSubsidies.push(subsidy)
            
          } catch (mappingError) {
            console.error(`Mapping error for dispositif ${dispositif.numero}:`, mappingError)
            errors.push({
              strategy: strategy.name,
              dispositif: dispositif.numero,
              error: mappingError.message
            })
          }
        }
        
        // Log search metadata
        if (searchResult.idr) {
          console.log(`💾 Search IDR: ${searchResult.idr}`)
        }
      }
      
    } catch (error) {
      console.error(`❌ Strategy ${strategy.name} failed:`, error.message)
      errors.push({
        strategy: strategy.name,
        error: error.message
      })
    }
  }

  console.log(`📊 Total subsidies collected: ${allSubsidies.length}`)
  
  if (allSubsidies.length === 0) {
    throw new Error(`No subsidies found. Errors: ${JSON.stringify(errors, null, 2)}`)
  }
  
  return allSubsidies
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting les-aides.fr API sync...')

    // Log sync start
    const { data: logData } = await supabase
      .from('api_sync_logs')
      .insert({
        api_source: 'les-aides-fr',
        sync_type: 'api_sync',
        status: 'running'
      })
      .select()
      .single()

    if (!logData) {
      throw new Error('Failed to create sync log')
    }

    const syncLogId = logData.id

    try {
      // Initialize API client
      const client = new LesAidesClient()
      
      // Load reference data first
      const references = await loadReferenceData(client)
      
      // Clean existing data
      console.log('🧹 Cleaning existing data...')
      await supabase.rpc('safe_data_purge')
      
      // Perform searches
      const allSubsidies = await performSearches(client, references)
      
      // Remove duplicates based on external_id
      const uniqueSubsidies = allSubsidies.filter((subsidy, index, array) => 
        array.findIndex(s => s.external_id === subsidy.external_id) === index
      )

      console.log(`📊 After deduplication: ${uniqueSubsidies.length} unique subsidies`)

      // Insert subsidies into database
      console.log('💾 Inserting subsidies into database...')
      let insertedCount = 0
      let skippedCount = 0

      for (const subsidy of uniqueSubsidies) {
        try {
          const { error: insertError } = await supabase
            .from('subsidies')
            .insert(subsidy)

          if (insertError) {
            console.error('Insert error:', insertError.message)
            skippedCount++
          } else {
            insertedCount++
          }
        } catch (insertError) {
          console.error('Exception during insert:', insertError)
          skippedCount++
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
          errors: skippedCount > 0 ? { 
            skipped: skippedCount,
            reference_lists_loaded: Object.keys(references).length
          } : null
        })
        .eq('id', syncLogId)

      const result = {
        success: true,
        sync_log_id: syncLogId,
        total_found: allSubsidies.length,
        unique_subsidies: uniqueSubsidies.length,
        inserted: insertedCount,
        skipped: skippedCount,
        reference_lists_loaded: Object.keys(references).length
      }

      console.log('🎉 API Sync completed successfully:', result)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } catch (error) {
      console.error('💥 Sync failed:', error)
      
      // Update sync log with failure
      await supabase
        .from('api_sync_logs')
        .update({
          status: 'failed',
          errors: { message: error.message, stack: error.stack },
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLogId)

      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        sync_log_id: syncLogId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

  } catch (error) {
    console.error('🚨 Critical error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})