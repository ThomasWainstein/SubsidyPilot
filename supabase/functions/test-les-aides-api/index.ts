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
    console.log('🧪 Domain discovery test started...');
    console.log('🧪 Environment check - Function executing at:', new Date().toISOString());
    
    const lesAidesApiKey = Deno.env.get('LES_AIDES_API_KEY') || '711e55108232352685cca98b49777e6b836bfb79';
    console.log(`🔑 API key length: ${lesAidesApiKey.length}`);
    console.log(`🔑 API key format: ${lesAidesApiKey.substring(0, 10)}...${lesAidesApiKey.substring(-10)}`);
    console.log(`🔑 API key is hex: ${/^[0-9a-f]+$/i.test(lesAidesApiKey)}`);
    
    // Try different domain codes to find which ones work
    const testCalls = [
      { name: 'Test domain 11', url: 'https://api.les-aides.fr/aides/?ape=A&domaine[]=11&format=json' },
      { name: 'Test domain 20', url: 'https://api.les-aides.fr/aides/?ape=A&domaine[]=20&format=json' },
      { name: 'Test domain 30', url: 'https://api.les-aides.fr/aides/?ape=A&domaine[]=30&format=json' },
      { name: 'Test domain 50', url: 'https://api.les-aides.fr/aides/?ape=A&domaine[]=50&format=json' },
      { name: 'Test domain 100', url: 'https://api.les-aides.fr/aides/?ape=A&domaine[]=100&format=json' }
    ];
    
    const results = [];
    let foundWorking = false;
    
    for (const testCall of testCalls) {
      console.log(`🔍 ${testCall.name}: ${testCall.url}`);
      
      try {
        const response = await fetch(testCall.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-IDC': lesAidesApiKey,
            'User-Agent': 'AgriTool-Platform/1.0',
          }
        });
        
        console.log(`📊 ${testCall.name} Response: ${response.status} ${response.statusText}`);
        
        const responseText = await response.text();
        console.log(`📄 ${testCall.name} Body preview: ${responseText.substring(0, 200)}`);
        
        let parsedData = null;
        try {
          parsedData = JSON.parse(responseText);
          if (parsedData.nb_dispositifs !== undefined) {
            console.log(`📊 ${testCall.name} Found: ${parsedData.nb_dispositifs} dispositifs`);
          }
        } catch (e) {
          console.log(`❌ ${testCall.name} JSON parse failed`);
        }
        
        results.push({
          name: testCall.name,
          url: testCall.url,
          status: response.status,
          statusText: response.statusText,
          bodyPreview: responseText.substring(0, 300),
          nb_dispositifs: parsedData?.nb_dispositifs || null,
          success: response.status === 200
        });
        
        // If we find a working one, note it and continue testing a few more
        if (response.status === 200) {
          console.log(`🎉 SUCCESS! Found working domain configuration: ${testCall.name}`);
          foundWorking = true;
        }
        
      } catch (fetchError) {
        console.error(`❌ ${testCall.name} fetch error:`, fetchError.message);
        results.push({
          name: testCall.name,
          url: testCall.url,
          error: fetchError.message
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Return results
    const result = {
      success: true,
      message: foundWorking ? 'Found working domain codes!' : 'No working domain codes found',
      test_results: results,
      working_configs: results.filter(r => r.success),
      summary: {
        total_tested: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success && !r.error).length,
        errors: results.filter(r => r.error).length
      }
    };
    
    console.log('🏁 Domain testing completed');
    console.log(`📊 Results: ${result.summary.successful}/${result.summary.total_tested} working`);
    
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