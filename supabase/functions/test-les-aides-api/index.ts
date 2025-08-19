import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Basic connectivity test started...');
    
    const lesAidesApiKey = Deno.env.get('LES_AIDES_API_KEY') || '711e55108232352685cca98b49777e6b836bfb79';
    console.log(`🔑 Using API key: ${lesAidesApiKey.substring(0, 10)}...`);
    
    // Just test one simple API call first
    const testUrl = 'https://api.les-aides.fr/aides/?format=json';
    console.log(`🔍 Testing: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-IDC': lesAidesApiKey,
        'User-Agent': 'AgriTool-Platform/1.0',
      }
    });
    
    console.log(`📊 Response: ${response.status} ${response.statusText}`);
    console.log(`📋 Headers:`, [...response.headers.entries()]);
    
    const responseText = await response.text();
    console.log(`📄 Response body (first 200 chars): ${responseText.substring(0, 200)}`);
    
    let parsedData = null;
    let parseError = null;
    
    try {
      parsedData = JSON.parse(responseText);
      console.log(`✅ JSON parsed successfully`);
      console.log(`📊 Found ${parsedData.nb_dispositifs || 0} dispositifs`);
    } catch (err) {
      parseError = err.message;
      console.log(`❌ JSON parse failed: ${err.message}`);
    }
    
    const result = {
      success: true,
      message: 'Basic API test completed',
      test_result: {
        url: testUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        bodyPreview: responseText.substring(0, 300),
        nb_dispositifs: parsedData?.nb_dispositifs || null,
        parseError: parseError
      }
    };
    
    console.log('🏁 Test completed successfully');
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Test function error:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Test function failed',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});