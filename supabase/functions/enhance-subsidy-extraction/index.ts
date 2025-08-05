import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ENHANCEMENT_PROMPT = `You are an expert agricultural funding analyst tasked with enhancing and validating extracted subsidy data. Review the current extraction and the original content to ensure ALL important information is captured comprehensively.

GOAL: Enhance the current data to include ALL missing details and ensure proper categorization into:
1. PRESENTATION (What the program is about)
2. ELIGIBILITY (Who can apply) 
3. TIMING (When to apply)
4. APPLICATION PROCESS (How to apply)

CURRENT EXTRACTION ISSUES TO FIX:
- Generic titles like "Subsidy Page" or "Agricultural Program" 
- Missing specific funding amounts, percentages, and rates
- Incomplete description/presentation sections
- Vague or missing eligibility criteria
- Incomplete application requirements and document lists
- Missing specific dates, contact information, and portal links

ENHANCEMENT INSTRUCTIONS:
1. Generate a SPECIFIC, DESCRIPTIVE title based on the actual program name, code, and focus area
2. Extract the COMPLETE presentation/description including all policy context, objectives, supported actions, funding rates, and criteria
3. Extract COMPREHENSIVE eligibility information including all beneficiary types, requirements, and restrictions
4. Include ALL application steps, required documents (with exact names), and submission procedures
5. Preserve ALL funding amounts, percentages, dates, and contact information
6. Maintain original language and terminology

RESPOND WITH: Enhanced JSON object with all fields properly filled and comprehensive information preserved.

Provide valid JSON only. Do not include explanations or markdown formatting.`;

async function enhanceSubsidyData(subsidyId: string): Promise<any> {
  console.log(`🔍 Enhancing subsidy data for ID: ${subsidyId}`);
  
  try {
    // Get current subsidy data
    const { data: subsidy, error: subsidyError } = await supabase
      .from('subsidies_structured')
      .select('*')
      .eq('id', subsidyId)
      .single();
      
    if (subsidyError || !subsidy) {
      throw new Error(`Failed to fetch subsidy: ${subsidyError?.message}`);
    }
    
    // Get original raw content if available
    let originalContent = '';
    if (subsidy.raw_log_id) {
      const { data: rawLog } = await supabase
        .from('raw_logs')
        .select('payload')
        .eq('id', subsidy.raw_log_id)
        .single();
        
      if (rawLog?.payload) {
        originalContent = rawLog.payload;
      }
    }
    
    // If no original content, try to get from raw_scraped_pages
    if (!originalContent && subsidy.url) {
      const { data: scrapedPage } = await supabase
        .from('raw_scraped_pages')
        .select('raw_text, raw_html')
        .eq('source_url', subsidy.url)
        .single();
        
      if (scrapedPage) {
        originalContent = scrapedPage.raw_text || scrapedPage.raw_html || '';
      }
    }
    
    if (!originalContent) {
      console.warn(`No original content found for subsidy ${subsidyId}`);
      return subsidy;
    }
    
    console.log(`📄 Found original content: ${originalContent.length} characters`);
    
    // Call OpenAI for enhancement
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: ENHANCEMENT_PROMPT
          },
          {
            role: 'user',
            content: `CURRENT EXTRACTED DATA:
${JSON.stringify(subsidy, null, 2)}

ORIGINAL DOCUMENT CONTENT:
${originalContent.substring(0, 40000)}

Please enhance the extracted data to include ALL missing information and ensure comprehensive coverage of the original content.`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedContent = data.choices[0].message.content;
    
    try {
      const enhancedData = JSON.parse(enhancedContent);
      console.log('✅ Successfully enhanced subsidy data');
      
      // Update the subsidy with enhanced data
      const { error: updateError } = await supabase
        .from('subsidies_structured')
        .update({
          ...enhancedData,
          audit: {
            ...subsidy.audit,
            enhanced_at: new Date().toISOString(),
            enhancement_model: 'gpt-4.1-2025-04-14',
            enhancement_applied: true
          }
        })
        .eq('id', subsidyId);
        
      if (updateError) {
        console.error('❌ Failed to update enhanced data:', updateError);
        throw updateError;
      }
      
      return enhancedData;
    } catch (parseError) {
      console.error('❌ Failed to parse enhanced response:', enhancedContent);
      throw new Error('Failed to parse enhancement result');
    }
  } catch (error) {
    console.error(`❌ Error enhancing subsidy ${subsidyId}:`, error);
    throw error;
  }
}

async function processSubsidyBatch(batchSize: number = 10): Promise<any> {
  console.log(`📋 Processing batch of ${batchSize} subsidies for enhancement`);
  
  try {
    // Find subsidies that need enhancement (generic titles or missing key fields)
    const { data: subsidies, error } = await supabase
      .from('subsidies_structured')
      .select('id, title, description, eligibility, amount')
      .or(`title.ilike.%Subsidy Page%,title.ilike.%Agricultural Program%,title.ilike.%Agricultural Funding Program%,description.is.null,eligibility.is.null`)
      .order('created_at', { ascending: false })
      .limit(batchSize);
      
    if (error) {
      throw error;
    }
    
    if (!subsidies || subsidies.length === 0) {
      return { processed: 0, message: 'No subsidies require enhancement' };
    }
    
    console.log(`🔄 Found ${subsidies.length} subsidies requiring enhancement`);
    
    const results = [];
    let processed = 0;
    let failed = 0;
    
    for (const subsidy of subsidies) {
      try {
        console.log(`📋 Enhancing subsidy ${subsidy.id}`);
        const enhanced = await enhanceSubsidyData(subsidy.id);
        results.push({ id: subsidy.id, status: 'enhanced', enhanced });
        processed++;
      } catch (error) {
        console.error(`❌ Failed to enhance subsidy ${subsidy.id}:`, error);
        results.push({ id: subsidy.id, status: 'failed', error: error.message });
        failed++;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      processed,
      failed,
      total: subsidies.length,
      results
    };
    
  } catch (error) {
    console.error('❌ Error in batch processing:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subsidyId, batchSize } = await req.json();
    
    let result;
    if (subsidyId) {
      // Process single subsidy
      result = await enhanceSubsidyData(subsidyId);
    } else {
      // Process batch
      result = await processSubsidyBatch(batchSize || 10);
    }

    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in enhance-subsidy-extraction function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});