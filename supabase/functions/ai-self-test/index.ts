import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { run_id } = await req.json();
    
    console.log(`🧪 AI Self-Test for run ${run_id}`);

    // Get one good page for testing
    const { data: testPage } = await supabase
      .from('raw_scraped_pages')
      .select('*')
      .eq('run_id', run_id)
      .gte('length(coalesce(text_markdown,raw_text,raw_html))', 1000)
      .limit(1)
      .single();

    if (!testPage) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No test page found' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test AI extraction on one page
    const content = testPage.text_markdown || testPage.raw_text || testPage.raw_html;
    
    const prompt = `Extract agricultural subsidy information from this French text. Return a JSON array of subsidies found.

For each subsidy, extract:
- title: The name/title of the subsidy program
- description: A detailed description of what the subsidy covers
- eligibility: Who is eligible and requirements
- deadline: Application deadline if mentioned (format: YYYY-MM-DD)
- funding_type: Type of funding (grant, loan, etc.)
- agency: The agency providing the subsidy
- sector: Agricultural sector (fruits, vegetables, livestock, etc.)
- region: Geographic region if specified

Text to analyze:
${content.slice(0, 4000)}

Return only valid JSON array, no other text.`;

    console.log(`🤖 Testing AI extraction on page: ${testPage.source_url}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are an expert at extracting agricultural subsidy information from French government documents. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const extractedText = aiResponse.choices[0].message.content;
    
    let extractedData;
    let parseError = null;
    try {
      extractedData = JSON.parse(extractedText);
      if (!Array.isArray(extractedData)) {
        extractedData = [extractedData];
      }
    } catch (e) {
      parseError = e.message;
      extractedData = [];
    }

    // Try to insert one subsidy as a test
    let insertSuccess = false;
    let insertError = null;
    
    if (extractedData.length > 0) {
      try {
        const testSubsidy = {
          ...extractedData[0],
          url: testPage.source_url,
          run_id: run_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('subsidies_structured')
          .insert(testSubsidy);
        
        if (error) {
          insertError = error.message;
        } else {
          insertSuccess = true;
        }
      } catch (e) {
        insertError = e.message;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      test_page: {
        url: testPage.source_url,
        content_length: content.length
      },
      ai_response: {
        raw_output: extractedText,
        parsed_data: extractedData,
        parse_error: parseError,
        subsidies_found: extractedData.length
      },
      database_test: {
        insert_success: insertSuccess,
        insert_error: insertError
      },
      api_usage: {
        tokens_used: aiResponse.usage?.total_tokens || 0,
        model: 'gpt-4.1-2025-04-14'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI self-test error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});