import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!openAIApiKey) {
  throw new Error('OpenAI API key not found');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source, run_id, quality_threshold = 0.4 } = await req.json();
    
    console.log(`🤖 Starting AI content processing for run: ${run_id}`);
    
    // Get raw scraped pages for this run
    const { data: pages, error: fetchError } = await supabase
      .from('raw_scraped_pages')
      .select('*')
      .eq('run_id', run_id);

    if (fetchError) {
      console.error('Error fetching pages:', fetchError);
      throw fetchError;
    }

    console.log(`📄 Found ${pages?.length || 0} pages to process`);

    let successful = 0;
    let failed = 0;

    for (const page of pages || []) {
      try {
        console.log(`🔍 Processing page: ${page.source_url}`);
        
        // Extract subsidy information using OpenAI
        const extractedData = await extractSubsidyData(page);
        
        if (extractedData && extractedData.length > 0) {
          // Store in subsidies_structured table
          const { error: insertError } = await supabase
            .from('subsidies_structured')
            .insert(extractedData.map(subsidy => ({
              ...subsidy,
              url: page.source_url,
              run_id: run_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })));

          if (insertError) {
            console.error(`Error inserting subsidies for ${page.source_url}:`, insertError);
            failed++;
          } else {
            console.log(`✅ Extracted ${extractedData.length} subsidies from ${page.source_url}`);
            successful += extractedData.length;
          }
        } else {
          console.log(`⚠️ No subsidies found in ${page.source_url}`);
        }

      } catch (error) {
        console.error(`Error processing page ${page.source_url}:`, error);
        failed++;
      }
    }

    console.log(`🎯 AI processing completed: ${successful} subsidies created, ${failed} errors`);

    return new Response(JSON.stringify({
      successful,
      failed,
      pages_processed: pages?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI content processing error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      successful: 0,
      failed: 1 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function extractSubsidyData(page: any) {
  try {
    const content = page.text_markdown || page.raw_text || page.raw_html;
    
    if (!content || content.length < 100) {
      console.log(`⚠️ Insufficient content in ${page.source_url}`);
      return [];
    }

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
${content.slice(0, 8000)}

Return only valid JSON array, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
    
    try {
      const subsidies = JSON.parse(extractedText);
      return Array.isArray(subsidies) ? subsidies : [subsidies];
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw AI response:', extractedText);
      return [];
    }

  } catch (error) {
    console.error('Error in extractSubsidyData:', error);
    return [];
  }
}