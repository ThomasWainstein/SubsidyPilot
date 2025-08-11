import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Testing AI processing isolated...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get one page to test with
    console.log('📄 Fetching one page to test...');
    const { data: pages, error: pageError } = await supabase
      .from('raw_scraped_pages')
      .select('*')
      .limit(1);
    
    if (pageError) {
      console.error('❌ Error fetching pages:', pageError);
      throw pageError;
    }
    
    if (!pages || pages.length === 0) {
      console.log('⚠️ No pages found');
      return new Response(JSON.stringify({
        success: false,
        error: 'No pages found'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const page = pages[0];
    console.log(`✅ Got page: ${page.id} from ${page.source_url}`);
    
    const content = page.text_markdown || page.raw_text || page.raw_html || '';
    console.log(`📝 Content length: ${content.length} chars`);
    
    if (content.length < 200) {
      console.log('⚠️ Content too short for processing');
      return new Response(JSON.stringify({
        success: false,
        error: 'Content too short'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Test OpenAI API call
    const openAIApiKey = Deno.env.get('SCRAPPER_RAW_GPT_API') ?? Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.log('❌ No OpenAI API key found');
      return new Response(JSON.stringify({
        success: false,
        error: 'No OpenAI API key'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log('🔑 OpenAI API key found, testing API call...');
    
    const testContent = content.slice(0, 1000); // Use only first 1000 chars for test
    const prompt = `Extract agricultural subsidy information from this text. Return a JSON array.

Text: ${testContent}

Return only valid JSON array, no other text.`;

    console.log('📡 Making OpenAI API call...');
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert at extracting agricultural subsidy information. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    console.log(`📊 OpenAI response status: ${aiResponse.status}`);
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`❌ OpenAI API error: ${errorText}`);
      return new Response(JSON.stringify({
        success: false,
        error: `OpenAI API error: ${aiResponse.status} - ${errorText}`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices[0].message.content;
    console.log(`✅ OpenAI response: ${extractedText?.slice(0, 200)}...`);
    
    // Test JSON parsing
    try {
      const parsed = JSON.parse(extractedText);
      console.log(`✅ JSON parsing successful, items: ${Array.isArray(parsed) ? parsed.length : 'not array'}`);
    } catch (parseError) {
      console.log(`⚠️ JSON parsing failed: ${parseError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'AI processing test completed successfully',
      page_id: page.id,
      content_length: content.length,
      ai_response_length: extractedText?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});