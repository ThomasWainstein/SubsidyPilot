import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE = 'https://api.les-aides.fr'

// Account configuration for multi-account testing
interface ApiAccount {
  id: string
  email?: string
  password?: string
  apiKey?: string
}

function getAllAccounts(): ApiAccount[] {
  const accounts: ApiAccount[] = []
  
  // Account 1
  const email1 = Deno.env.get('LES_AIDES_EMAIL')
  const password1 = Deno.env.get('LES_AIDES_PASSWORD')
  const apiKey1 = Deno.env.get('LES_AIDES_API_KEY')
  
  if (email1 && password1) {
    accounts.push({
      id: 'account-1',
      email: email1,
      password: password1,
      apiKey: apiKey1,
    })
  }
  
  // Account 2
  const email2 = Deno.env.get('LES_AIDES_EMAIL_2')
  const password2 = Deno.env.get('LES_AIDES_PASSWORD_2')
  const apiKey2 = Deno.env.get('LES_AIDES_API_KEY_2')
  
  if (email2 && password2) {
    accounts.push({
      id: 'account-2',
      email: email2,
      password: password2,
      apiKey: apiKey2,
    })
  }
  
  // Account 3
  const email3 = Deno.env.get('LES_AIDES_EMAIL_3')
  const password3 = Deno.env.get('LES_AIDES_PASSWORD_3')
  const apiKey3 = Deno.env.get('LES_AIDES_API_KEY_3')
  
  if (email3 && password3) {
    accounts.push({
      id: 'account-3',
      email: email3,
      password: password3,
      apiKey: apiKey3,
    })
  }
  
  return accounts
}

function getAuthHeaders(account: ApiAccount): Record<string,string> {
  const headers: Record<string,string> = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'User-Agent': 'SubsidyPilot/1.0',
  }
  
  if (account.apiKey) {
    headers['X-IDC'] = account.apiKey
  } else if (account.email && account.password) {
    const credentials = btoa(`${account.email}:${account.password}`)
    headers['Authorization'] = `Basic ${credentials}`
  }
  
  return headers
}

async function testApiCall(account: ApiAccount, path: string, params?: Record<string,any>) {
  const url = new URL(path, BASE)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(`${key}[]`, String(v)))
      } else if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  console.log(`🌐 Testing ${account.id}: ${url.toString()}`)
  
  try {
    const response = await fetch(url.toString(), { 
      headers: getAuthHeaders(account), 
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    })
    
    const text = await response.text()
    let data: any = undefined
    
    try { 
      data = JSON.parse(text)
    } catch {
      // Keep original text if not JSON
    }
    
    if (!response.ok) {
      console.log(`❌ ${account.id} Error ${response.status}: ${text}`)
      return { 
        success: false, 
        status: response.status, 
        url: url.toString(), 
        error: data ?? text,
        account: account.id
      }
    }
    
    console.log(`✅ ${account.id} Success ${response.status}: ${Array.isArray(data) ? data.length + ' items' : 'data received'}`)
    return { 
      success: true, 
      status: response.status, 
      url: url.toString(), 
      data,
      account: account.id
    }
    
  } catch (error) {
    console.log(`💥 ${account.id} Request failed: ${error.message}`)
    return { 
      success: false, 
      status: 0, 
      url: url.toString(), 
      error: error.message,
      account: account.id
    }
  }
}

async function testAccountHealth(account: ApiAccount) {
  console.log(`🔍 Testing account ${account.id}...`)
  
  const results: any = {
    account_id: account.id,
    auth_configured: !!(account.email && account.password) || !!account.apiKey,
    auth_method: account.apiKey ? 'X-IDC' : 'Basic Auth',
    tests: {}
  }

  // Test 1: Load domains list (auth test)
  console.log(`📋 ${account.id}: Loading domains list...`)
  const domainsTest = await testApiCall(account, '/liste/domaines')
  results.tests.domains = domainsTest
  
  if (!domainsTest.success) {
    console.log(`💥 ${account.id}: Domains test failed`)
    return results
  }

  // Test 2: Basic search with first domain
  const firstDomain = domainsTest.data?.[0]?.numero
  if (firstDomain) {
    console.log(`🔍 ${account.id}: Testing search with domain ${firstDomain}...`)
    const searchTest = await testApiCall(account, '/aides/', { ape: 'A', domaine: firstDomain })
    results.tests.search = {
      ...searchTest,
      params: { ape: 'A', domaine: firstDomain },
      results_count: searchTest.success ? searchTest.data?.nb_dispositifs : 0
    }

    // Test 3: Details fetch if we have results
    if (searchTest.success && searchTest.data?.dispositifs?.length) {
      console.log(`📄 ${account.id}: Testing details fetch...`)
      const idr = searchTest.data.idr
      const numero = searchTest.data.dispositifs[0].numero
      
      const detailsTest = await testApiCall(account, '/aide/', { requete: idr, dispositif: numero })
      results.tests.details = {
        ...detailsTest,
        params: { requete: idr, dispositif: numero }
      }
    }
  }

  return results
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔍 Starting Les-Aides.fr Multi-Account Health Check...')
    
    const accounts = getAllAccounts()
    console.log(`🔧 Found ${accounts.length} configured accounts`)
    
    if (accounts.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No accounts configured',
        accounts_found: 0,
        expected_accounts: 3
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const results: any = { 
      timestamp: new Date().toISOString(),
      total_accounts: accounts.length,
      expected_accounts: 3,
      account_results: [],
      overall_tests: {}
    }

    // Test each account individually
    for (const account of accounts) {
      const accountResult = await testAccountHealth(account)
      results.account_results.push(accountResult)
      
      // Add small delay between accounts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Test shared reference lists with first working account
    const workingAccount = accounts.find(acc => {
      const accountResult = results.account_results.find((r: any) => r.account_id === acc.id)
      return accountResult?.tests?.domains?.success
    })

    if (workingAccount) {
      console.log(`📚 Testing reference lists with ${workingAccount.id}...`)
      const referenceLists = ['moyens', 'naf', 'regions', 'departements']
      results.overall_tests.reference_lists = {}
      
      for (const listType of referenceLists) {
        const listTest = await testApiCall(workingAccount, `/liste/${listType}`)
        results.overall_tests.reference_lists[listType] = {
          success: listTest.success,
          count: listTest.success ? listTest.data?.length : 0,
          error: listTest.success ? null : listTest.error,
          tested_with: workingAccount.id
        }
        
        // Small delay between reference list calls
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    // Calculate overall health
    const workingAccounts = results.account_results.filter((acc: any) => 
      acc.auth_configured && acc.tests.domains?.success
    )
    
    const totalQuotaAvailable = workingAccounts.length * 750 // 750 requests per account per day
    
    const overallSuccess = workingAccounts.length > 0
    
    console.log(`🏁 Health check complete. Working accounts: ${workingAccounts.length}/${accounts.length}`)

    return new Response(JSON.stringify({
      success: overallSuccess,
      summary: {
        total_accounts_configured: accounts.length,
        working_accounts: workingAccounts.length,
        failed_accounts: accounts.length - workingAccounts.length,
        daily_quota_available: totalQuotaAvailable,
        auth_methods_working: workingAccounts.map((acc: any) => `${acc.account_id}: ${acc.auth_method}`),
        search_working: workingAccounts.some((acc: any) => acc.tests.search?.success),
        details_working: workingAccounts.some((acc: any) => acc.tests.details?.success)
      },
      results
    }, null, 2), { 
      status: overallSuccess ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.log(`💥 Health check failed with exception: ${e}`)
    return new Response(JSON.stringify({ 
      success: false,
      error: String(e),
      stack: e instanceof Error ? e.stack : undefined
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
