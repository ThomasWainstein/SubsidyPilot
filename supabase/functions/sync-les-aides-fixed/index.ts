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

// Account configuration and rotation management
interface ApiAccount {
  id: string
  email?: string
  password?: string
  apiKey?: string
  requestsUsed: number
  dailyLimit: number
  lastResetDate: string
  isActive: boolean
}

class MultiAccountManager {
  private accounts: ApiAccount[] = []
  private currentAccountIndex = 0
  
  constructor() {
    // Initialize all three accounts
    this.initializeAccounts()
  }
  
  private initializeAccounts(): void {
    const today = new Date().toDateString()
    
    // Account 1
    const email1 = Deno.env.get('LES_AIDES_EMAIL')
    const password1 = Deno.env.get('LES_AIDES_PASSWORD')
    const apiKey1 = Deno.env.get('LES_AIDES_API_KEY')
    
    if (email1 && password1) {
      this.accounts.push({
        id: 'account-1',
        email: email1,
        password: password1,
        apiKey: apiKey1,
        requestsUsed: 0,
        dailyLimit: 750,
        lastResetDate: today,
        isActive: true
      })
    }
    
    // Account 2
    const email2 = Deno.env.get('LES_AIDES_EMAIL_2')
    const password2 = Deno.env.get('LES_AIDES_PASSWORD_2')
    const apiKey2 = Deno.env.get('LES_AIDES_API_KEY_2')
    
    if (email2 && password2) {
      this.accounts.push({
        id: 'account-2',
        email: email2,
        password: password2,
        apiKey: apiKey2,
        requestsUsed: 0,
        dailyLimit: 750,
        lastResetDate: today,
        isActive: true
      })
    }
    
    // Account 3
    const email3 = Deno.env.get('LES_AIDES_EMAIL_3')
    const password3 = Deno.env.get('LES_AIDES_PASSWORD_3')
    const apiKey3 = Deno.env.get('LES_AIDES_API_KEY_3')
    
    if (email3 && password3) {
      this.accounts.push({
        id: 'account-3',
        email: email3,
        password: password3,
        apiKey: apiKey3,
        requestsUsed: 0,
        dailyLimit: 750,
        lastResetDate: today,
        isActive: true
      })
    }
    
    console.log(`🔧 Initialized ${this.accounts.length} API accounts`)
    this.logAccountStatus()
  }
  
  private resetDailyCountsIfNeeded(): void {
    const today = new Date().toDateString()
    
    for (const account of this.accounts) {
      if (account.lastResetDate !== today) {
        account.requestsUsed = 0
        account.lastResetDate = today
        account.isActive = true
        console.log(`🔄 Reset daily count for ${account.id}`)
      }
    }
  }
  
  private logAccountStatus(): void {
    console.log('📊 Account Status:')
    for (const account of this.accounts) {
      console.log(`   ${account.id}: ${account.requestsUsed}/${account.dailyLimit} requests (${account.isActive ? 'Active' : 'Quota exceeded'})`)
    }
    
    const totalUsed = this.accounts.reduce((sum, acc) => sum + acc.requestsUsed, 0)
    const totalLimit = this.accounts.reduce((sum, acc) => sum + acc.dailyLimit, 0)
    console.log(`📈 Total usage: ${totalUsed}/${totalLimit} requests`)
  }
  
  getCurrentAccount(): ApiAccount | null {
    this.resetDailyCountsIfNeeded()
    
    // Find next available account starting from current index
    for (let i = 0; i < this.accounts.length; i++) {
      const index = (this.currentAccountIndex + i) % this.accounts.length
      const account = this.accounts[index]
      
      if (account.isActive && account.requestsUsed < account.dailyLimit) {
        this.currentAccountIndex = index
        return account
      }
    }
    
    console.log('🚫 All accounts have reached their daily quota')
    return null
  }
  
  recordRequest(success: boolean = true): void {
    const account = this.accounts[this.currentAccountIndex]
    if (account) {
      account.requestsUsed++
      
      if (account.requestsUsed >= account.dailyLimit) {
        account.isActive = false
        console.log(`⚠️ Account ${account.id} has reached daily quota`)
        
        // Try to switch to next account
        const nextAccount = this.getCurrentAccount()
        if (nextAccount && nextAccount.id !== account.id) {
          console.log(`🔄 Switched to ${nextAccount.id}`)
        }
      }
    }
    
    this.logAccountStatus()
  }
  
  getTotalAvailableRequests(): number {
    this.resetDailyCountsIfNeeded()
    return this.accounts.reduce((sum, acc) => 
      sum + (acc.isActive ? acc.dailyLimit - acc.requestsUsed : 0), 0
    )
  }
  
  hasAvailableAccount(): boolean {
    return this.getCurrentAccount() !== null
  }
}

// Enhanced Les-Aides.fr API client with multi-account support
class LesAidesClient {
  private baseUrl = 'https://api.les-aides.fr'
  private accountManager: MultiAccountManager
  
  constructor() {
    this.accountManager = new MultiAccountManager()
  }
  
  private getAuthHeaders(account: ApiAccount): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'User-Agent': 'SubsidyPilot/1.0'
    }
    
    if (account.apiKey) {
      headers['X-IDC'] = account.apiKey
    } else if (account.email && account.password) {
      const credentials = btoa(`${account.email}:${account.password}`)
      headers['Authorization'] = `Basic ${credentials}`
    }
    
    return headers
  }

  async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const account = this.accountManager.getCurrentAccount()
    
    if (!account) {
      throw new Error(`No available accounts. Total requests available: ${this.accountManager.getTotalAvailableRequests()}`)
    }
    
    const url = new URL(endpoint, this.baseUrl)
    
    // Handle array parameters with proper syntax (domaine[]=value&domaine[]=value2)
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(`${key}[]`, String(v)))
      } else if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    console.log(`🌐 API Request (${account.id}): ${url.toString()}`)
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getAuthHeaders(account),
        signal: AbortSignal.timeout(30000)
      })
      
      const responseText = await response.text()
      
      if (!response.ok) {
        const errorMsg = `API Error ${response.status}: ${responseText}`
        console.log(`❌ ${errorMsg}`)
        
        // Record the request attempt
        this.accountManager.recordRequest(false)
        
        // If quota exceeded, try next account
        if (response.status === 403 && responseText.includes('Quota journalier')) {
          console.log(`💡 Quota exceeded for ${account.id}, trying next account...`)
          
          // Force account switch and retry once
          const nextAccount = this.accountManager.getCurrentAccount()
          if (nextAccount && nextAccount.id !== account.id) {
            console.log(`🔄 Retrying with ${nextAccount.id}...`)
            return this.makeRequest(endpoint, params) // Recursive retry with new account
          }
        }
        
        throw new Error(errorMsg)
      }
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`)
      }
      
      // Record successful request
      this.accountManager.recordRequest(true)
      
      console.log(`✅ Success: ${Array.isArray(data) ? data.length + ' items' : 'data received'}`)
      return data
      
    } catch (error) {
      if (!error.message.includes('API Error')) {
        // Only record network/other errors, not API errors (already recorded above)
        this.accountManager.recordRequest(false)
      }
      
      console.log(`❌ Request failed: ${error.message}`)
      throw error
    }
  }
  
  getAccountStatus(): any {
    return {
      totalAccounts: this.accountManager['accounts'].length,
      availableRequests: this.accountManager.getTotalAvailableRequests(),
      accountDetails: this.accountManager['accounts'].map(acc => ({
        id: acc.id,
        requestsUsed: acc.requestsUsed,
        dailyLimit: acc.dailyLimit,
        isActive: acc.isActive
      }))
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
    await new Promise(resolve => setTimeout(resolve, 200))
    
    references.moyens = await client.makeRequest('/liste/moyens') 
    await new Promise(resolve => setTimeout(resolve, 200))
    
    references.naf = await client.makeRequest('/liste/naf')
    await new Promise(resolve => setTimeout(resolve, 200))
    
    references.regions = await client.makeRequest('/liste/regions')
    await new Promise(resolve => setTimeout(resolve, 200))
    
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
  // Check available requests across all accounts
  if (!client.getAccountStatus().availableRequests) {
    throw new Error('No API requests available across all accounts')
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
  console.log(`📊 Available requests across all accounts: ${client.getAccountStatus().availableRequests}`)

  for (const [index, strategy] of searchStrategies.entries()) {
    // Check if we still have available accounts
    if (!client.getAccountStatus().availableRequests) {
      console.log('🚫 No more API requests available across all accounts, stopping searches')
      break
    }
    
    console.log(`🎯 Strategy ${index + 1}/${searchStrategies.length}: ${strategy.name}`)
    
    try {
      // Add delay between searches
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const searchResult = await client.makeRequest('/aides/', strategy.params)
      
      console.log(`📊 Found ${searchResult.nb_dispositifs || 0} dispositifs`)
      
      if (searchResult.depassement) {
        console.warn(`⚠️ Results truncated due to depassement for ${strategy.name}`)
      }
      
      if (searchResult.dispositifs && Array.isArray(searchResult.dispositifs)) {
        // Process dispositifs and map to subsidy format
        for (const dispositif of searchResult.dispositifs.slice(0, 15)) { // Increased limit since we have more quota
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
  console.log(`🏁 Final account status:`)
  console.log(JSON.stringify(client.getAccountStatus(), null, 2))
  
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
    console.log('🚀 Starting les-aides.fr API sync with multi-account support...')

    // Log sync start
    const { data: logData } = await supabase
      .from('api_sync_logs')
      .insert({
        api_source: 'les-aides-fr',
        sync_type: 'api_sync',
        status: 'running'
      })
      .select()
      .maybeSingle()

    if (!logData) {
      throw new Error('Failed to create sync log')
    }

    const syncLogId = logData.id

    try {
      // Initialize API client with multi-account support
      const client = new LesAidesClient()
      
      // Log initial account status
      console.log('📊 Initial account status:')
      console.log(JSON.stringify(client.getAccountStatus(), null, 2))
      
      // Load reference data first
      const references = await loadReferenceData(client)
      
      // Clean existing data (simplified approach)
      console.log('🧹 Cleaning existing data...')
      const { error: deleteError } = await supabase
        .from('subsidies')
        .delete()
        .eq('source', 'les-aides-fr')
      
      if (deleteError) {
        console.log('⚠️ Warning: Could not delete existing data:', deleteError.message)
      }
      
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

      // Get final account statistics
      const accountStats = client.getAccountStatus()

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
            reference_lists_loaded: Object.keys(references).length,
            account_stats: accountStats
          } : { account_stats: accountStats }
        })
        .eq('id', syncLogId)

      const result = {
        success: true,
        sync_log_id: syncLogId,
        total_found: allSubsidies.length,
        unique_subsidies: uniqueSubsidies.length,
        inserted: insertedCount,
        skipped: skippedCount,
        reference_lists_loaded: Object.keys(references).length,
        account_statistics: accountStats
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