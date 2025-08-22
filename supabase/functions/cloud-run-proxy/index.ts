import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

const CLOUD_RUN_BASE_URL = 'https://subsidypilot-form-parser-838836299668.europe-west1.run.app';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace('/functions/v1/cloud-run-proxy', '');
    const targetUrl = `${CLOUD_RUN_BASE_URL}${pathname}${url.search}`;

    console.log(`🚀 Proxying request to: ${targetUrl}`);

    // Forward the request to Cloud Run
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: req.method !== 'GET' ? await req.text() : undefined,
    });

    const data = await response.text();
    
    console.log(`✅ Cloud Run response: ${response.status}`);

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });

  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Proxy failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});