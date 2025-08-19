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
    console.log('🧪 Testing Les-Aides.fr API directly...');
    
    const lesAidesApiKey = Deno.env.get('LES_AIDES_API_KEY') || '711e55108232352685cca98b49777e6b836bfb79';
    console.log(`🔑 Using API key: ${lesAidesApiKey.substring(0, 10)}...`);
    
    // Test multiple simple API calls
    const testCalls = [
      { name: 'Basic call', url: 'https://api.les-aides.fr/aides/?format=json' },
      { name: 'APE A', url: 'https://api.les-aides.fr/aides/?ape=A&format=json' },
      { name: 'APE M', url: 'https://api.les-aides.fr/aides/?ape=M&format=json' },
    ];
    
    const results = [];
    
    for (const testCall of testCalls) {
      console.log(`🔍 Testing: ${testCall.name} - ${testCall.url}`);
      
      try {
        const response = await fetch(testCall.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-IDC': lesAidesApiKey,
            'User-Agent': 'AgriTool-Platform/1.0',
          }
        });
        
        console.log(`📊 Response: ${response.status} ${response.statusText}`);
        console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log(`📄 Response body (first 300 chars): ${responseText.substring(0, 300)}`);
        
        let parsedData = null;
        try {
          parsedData = JSON.parse(responseText);
          console.log(`✅ JSON parsed successfully`);
          if (parsedData.nb_dispositifs !== undefined) {
            console.log(`📊 Found ${parsedData.nb_dispositifs} dispositifs`);
          }
        } catch (parseError) {
          console.log(`❌ JSON parse failed: ${parseError.message}`);
        }
        
        results.push({
          name: testCall.name,
          url: testCall.url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          bodyPreview: responseText.substring(0, 500),
          parsedData: parsedData ? {
            nb_dispositifs: parsedData.nb_dispositifs,
            idr: parsedData.idr,
            depassement: parsedData.depassement
          } : null,
          parseError: parsedData ? null : 'Failed to parse JSON'
        });
        
      } catch (fetchError) {
        console.error(`❌ Fetch error for ${testCall.name}:`, fetchError.message);
        results.push({
          name: testCall.name,
          url: testCall.url,
          error: fetchError.message
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('🏁 Test completed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'API test completed',
      results: results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Test function error:', error.message);
    return new Response(JSON.stringify({
      error: 'Test function failed',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});