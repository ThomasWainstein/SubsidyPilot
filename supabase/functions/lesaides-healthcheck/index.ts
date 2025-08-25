import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE = 'https://api.les-aides.fr';

function authHeaders() {
  const idc = Deno.env.get('LES_AIDES_IDC')?.trim();
  const email = Deno.env.get('LES_AIDES_EMAIL');
  const password = Deno.env.get('LES_AIDES_PASSWORD');
  const h: Record<string,string> = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'User-Agent': 'SubsidyPilot/1.0',
  };
  if (idc) h['X-IDC'] = idc; else if (email && password) {
    const b64 = btoa(`${email}:${password}`);
    h['Authorization'] = `Basic ${b64}`;
  }
  return h;
}

async function jget(path: string, params?: Record<string,any>) {
  const q = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k,v]) => {
    if (Array.isArray(v)) v.forEach(x => q.append(`${k}[]`, String(x)));
    else if (v !== undefined && v !== null) q.append(k, String(v));
  });
  const url = `${BASE}${path}${q.toString()?`?${q}`:''}`;
  
  console.log(`🌐 Testing: ${url}`);
  
  const res = await fetch(url, { headers: authHeaders(), method: 'GET' });
  const text = await res.text();
  let body: any = undefined; 
  try { 
    body = JSON.parse(text); 
  } catch {
    // Keep original text if not JSON
  }
  
  if (!res.ok) {
    console.log(`❌ Error ${res.status}: ${text}`);
    return { 
      ok: false, 
      status: res.status, 
      url, 
      headers: Object.fromEntries(res.headers), 
      body: body ?? text 
    };
  }
  
  console.log(`✅ Success ${res.status}: ${Array.isArray(body) ? body.length + ' items' : 'data received'}`);
  return { ok: true, status: res.status, url, body };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting Les-Aides.fr API Health Check...');
    const diagnostics: any = { 
      timestamp: new Date().toISOString(),
      auth_method: null,
      steps: {}
    };

    // Check which auth method we're using
    const idc = Deno.env.get('LES_AIDES_IDC')?.trim();
    const email = Deno.env.get('LES_AIDES_EMAIL');
    const password = Deno.env.get('LES_AIDES_PASSWORD');
    
    if (idc) {
      diagnostics.auth_method = 'X-IDC';
    } else if (email && password) {
      diagnostics.auth_method = 'Basic Auth (email/password)';
    } else {
      diagnostics.auth_method = 'No auth configured';
    }
    
    console.log(`🔑 Auth method: ${diagnostics.auth_method}`);

    // Step 1: Test connectivity and auth via domains list
    console.log('📋 Step 1: Testing auth with /liste/domaines...');
    const domains = await jget('/liste/domaines');
    diagnostics.steps.domains = {
      success: domains.ok,
      status: domains.status,
      url: domains.url,
      count: domains.ok ? domains.body?.length : 0,
      error: domains.ok ? null : domains.body
    };

    if (!domains.ok) {
      console.log('💥 Auth test failed, stopping here');
      return new Response(JSON.stringify({ 
        step: 'domains_auth_failed', 
        diagnostics 
      }, null, 2), { 
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Get a valid domaine ID for testing
    const domaine = domains.body?.[0]?.numero;
    console.log(`🎯 Using domaine ${domaine} (${domains.body?.[0]?.libelle}) for tests`);

    // Step 3: Test basic search - cereal farms + creation domain
    console.log('🔍 Step 2: Testing search /aides/ with known-good params...');
    const search = await jget('/aides/', { ape: '0111Z', domaine });
    diagnostics.steps.search = {
      success: search.ok,
      status: search.status,
      url: search.url,
      params: { ape: '0111Z', domaine },
      results: search.ok ? {
        idr: search.body?.idr,
        nb_dispositifs: search.body?.nb_dispositifs,
        depassement: search.body?.depassement,
        dispositifs_count: search.body?.dispositifs?.length || 0
      } : null,
      error: search.ok ? null : search.body
    };

    // Step 4: If we got results, try fetching one detail
    if (search.ok && search.body?.dispositifs?.length) {
      console.log('📄 Step 3: Testing details fetch /aide/...');
      const idr = search.body.idr;
      const numero = search.body.dispositifs[0].numero;
      
      const details = await jget('/aide/', { requete: idr, dispositif: numero });
      diagnostics.steps.details = {
        success: details.ok,
        status: details.status,
        url: details.url,
        params: { requete: idr, dispositif: numero },
        has_fiche: details.ok && details.body?.ficheDispositif ? true : false,
        error: details.ok ? null : details.body
      };
    } else {
      console.log('⚠️ Skipping details test - no search results');
      diagnostics.steps.details = {
        skipped: 'No search results to test with'
      };
    }

    // Step 5: Test other reference lists
    console.log('📚 Step 4: Testing other reference lists...');
    const otherLists = ['moyens', 'naf', 'regions'];
    diagnostics.steps.reference_lists = {};
    
    for (const listType of otherLists) {
      const result = await jget(`/liste/${listType}`);
      diagnostics.steps.reference_lists[listType] = {
        success: result.ok,
        status: result.status,
        count: result.ok ? result.body?.length : 0,
        error: result.ok ? null : result.body
      };
    }

    const overallSuccess = diagnostics.steps.domains.success && 
                          diagnostics.steps.search.success;
    
    console.log(`🏁 Health check complete. Overall: ${overallSuccess ? 'SUCCESS' : 'FAILED'}`);

    return new Response(JSON.stringify({
      success: overallSuccess,
      summary: {
        auth_working: diagnostics.steps.domains.success,
        search_working: diagnostics.steps.search.success,
        details_working: diagnostics.steps.details?.success || false,
        total_subsidies_found: diagnostics.steps.search?.results?.nb_dispositifs || 0
      },
      diagnostics
    }, null, 2), { 
      status: overallSuccess ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.log(`💥 Health check failed with exception: ${e}`);
    return new Response(JSON.stringify({ 
      error: String(e),
      stack: e instanceof Error ? e.stack : undefined
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
