import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE = 'https://api.les-aides.fr'

function getAuthHeaders(): Record<string,string> {
  const idc = Deno.env.get('LES_AIDES_IDC')?.trim()
  const email = Deno.env.get('LES_AIDES_EMAIL')
  const password = Deno.env.get('LES_AIDES_PASSWORD')
  
  const headers: Record<string,string> = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'User-Agent': 'SubsidyPilot/1.0',
  }
  
  if (idc) {
    headers['X-IDC'] = idc
  } else if (email && password) {
    const credentials = btoa(`${email}:${password}`)
    headers['Authorization'] = `Basic ${credentials}`
  }
  
  return headers
}

async function testApiCall(path: string, params?: Record<string,any>) {
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

  console.log(`🌐 Testing: ${url.toString()}`)
  
  try {
    const response = await fetch(url.toString(), { 
      headers: getAuthHeaders(), 
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
      console.log(`❌ Error ${response.status}: ${text}`)
      return { 
        success: false, 
        status: response.status, 
        url: url.toString(), 
        error: data ?? text 
      }
    }
    
    console.log(`✅ Success ${response.status}: ${Array.isArray(data) ? data.length + ' items' : 'data received'}`)
    return { 
      success: true, 
      status: response.status, 
      url: url.toString(), 
      data 
    }
    
  } catch (error) {
    console.log(`💥 Request failed: ${error.message}`)
    return { 
      success: false, 
      status: 0, 
      url: url.toString(), 
      error: error.message 
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔍 Starting Les-Aides.fr API Health Check...')
    
    const results: any = { 
      timestamp: new Date().toISOString(),
      auth_configured: false,
      tests: {}
    }

    // Check auth configuration
    const idc = Deno.env.get('LES_AIDES_IDC')?.trim()
    const email = Deno.env.get('LES_AIDES_EMAIL')
    const password = Deno.env.get('LES_AIDES_PASSWORD')
    
    if (idc) {
      results.auth_method = 'X-IDC'
      results.auth_configured = true
    } else if (email && password) {
      results.auth_method = 'Basic Auth (email/password)'
      results.auth_configured = true
    } else {
      results.auth_method = 'No auth configured'
      results.auth_configured = false
    }
    
    console.log(`🔑 Auth method: ${results.auth_method}`)

    // Test 1: Load domains list (auth test)
    console.log('📋 Test 1: Loading domains list...')
    const domainsTest = await testApiCall('/liste/domaines')
    results.tests.domains = domainsTest
    
    if (!domainsTest.success) {
      console.log('💥 Domains test failed - stopping here')
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication or domains API failed',
        results
      }, null, 2), { 
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Test 2: Basic search with first domain
    const firstDomain = domainsTest.data?.[0]?.numero
    if (firstDomain) {
      console.log(`🔍 Test 2: Testing search with domain ${firstDomain}...`)
      const searchTest = await testApiCall('/aides/', { ape: 'A', domaine: firstDomain })
      results.tests.search = {
        ...searchTest,
        params: { ape: 'A', domaine: firstDomain },
        results_count: searchTest.success ? searchTest.data?.nb_dispositifs : 0
      }

      // Test 3: Details fetch if we have results
      if (searchTest.success && searchTest.data?.dispositifs?.length) {
        console.log('📄 Test 3: Testing details fetch...')
        const idr = searchTest.data.idr
        const numero = searchTest.data.dispositifs[0].numero
        
        const detailsTest = await testApiCall('/aide/', { requete: idr, dispositif: numero })
        results.tests.details = {
          ...detailsTest,
          params: { requete: idr, dispositif: numero }
        }
      }
    }

    // Test 4: Other reference lists
    console.log('📚 Test 4: Testing other reference lists...')
    const referenceLists = ['moyens', 'naf', 'regions']
    results.tests.reference_lists = {}
    
    for (const listType of referenceLists) {
      const listTest = await testApiCall(`/liste/${listType}`)
      results.tests.reference_lists[listType] = {
        success: listTest.success,
        count: listTest.success ? listTest.data?.length : 0,
        error: listTest.success ? null : listTest.error
      }
    }

    const overallSuccess = results.tests.domains.success && 
                          (results.tests.search?.success || false)
    
    console.log(`🏁 Health check complete. Overall: ${overallSuccess ? 'SUCCESS' : 'FAILED'}`)

    return new Response(JSON.stringify({
      success: overallSuccess,
      summary: {
        auth_configured: results.auth_configured,
        auth_working: results.tests.domains.success,
        search_working: results.tests.search?.success || false,
        details_working: results.tests.details?.success || false,
        total_subsidies_available: results.tests.search?.results_count || 0
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
