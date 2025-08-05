import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CanonicalSubsidy {
  title: Record<string, string>;
  description: Record<string, string>;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  region: string[];
  categories: string[];
  legal_entities: string[];
  tags: string[];
  eligibility_criteria: Record<string, any>;
  application_docs: Record<string, any>[];
  status: string;
  agency: string;
  source_url: string;
  language: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config = {
      supabase_url: Deno.env.get('NEXT_PUBLIC_SUPABASE_URL'),
      supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      openai_api_key: Deno.env.get('SCRAPER_RAW_GPT_API') || Deno.env.get('OPENAI_API_KEY'),
    };

    if (!config.supabase_url || !config.supabase_service_key || !config.openai_api_key) {
      throw new Error('Missing required configuration');
    }

    const supabase = createClient(config.supabase_url, config.supabase_service_key);
    
    const { source, session_id, page_ids, single_page_id } = await req.json();

    console.log('🤖 AI Content Processor starting:', { source, session_id, page_ids: page_ids?.length });

    let pagesToProcess = [];

    if (single_page_id) {
      // Process single page
      const { data: page, error } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .eq('id', single_page_id)
        .single();
      
      if (error || !page) {
        throw new Error(`Page not found: ${single_page_id}`);
      }
      
      pagesToProcess = [page];
    } else if (page_ids) {
      // Process specific pages
      const { data: pages, error } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .in('id', page_ids);
      
      if (error) {
        throw new Error(`Failed to fetch pages: ${error.message}`);
      }
      
      pagesToProcess = pages || [];
    } else {
      // Process unprocessed pages from source
      const { data: pages, error } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .eq('source_site', source)
        .eq('status', 'scraped')
        .limit(10);
      
      if (error) {
        throw new Error(`Failed to fetch pages: ${error.message}`);
      }
      
      pagesToProcess = pages || [];
    }

    console.log(`📄 Processing ${pagesToProcess.length} pages`);

    const results = [];

    for (const page of pagesToProcess) {
      try {
        console.log(`🔍 Processing page: ${page.source_url}`);

        // Extract structured data using OpenAI
        const extractedData = await extractWithOpenAI(page, config.openai_api_key, source);
        
        if (extractedData) {
          // Store in subsidies table
          const subsidyData = mapToSubsidySchema(extractedData, page);
          
          const { data: storedSubsidy, error: subsidyError } = await supabase
            .from('subsidies')
            .insert(subsidyData)
            .select()
            .single();
          
          if (subsidyError) {
            console.error('❌ Failed to store subsidy:', subsidyError);
          } else {
            console.log(`✅ Stored subsidy: ${storedSubsidy.id}`);
            
            // Update page status
            await supabase
              .from('raw_scraped_pages')
              .update({ status: 'processed' })
              .eq('id', page.id);
            
            results.push({
              page_id: page.id,
              subsidy_id: storedSubsidy.id,
              url: page.source_url,
              success: true
            });
          }
        } else {
          console.warn(`⚠️ No data extracted from: ${page.source_url}`);
          results.push({
            page_id: page.id,
            url: page.source_url,
            success: false,
            error: 'No data extracted'
          });
        }

        // Rate limiting for OpenAI API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (pageError) {
        console.error(`❌ Error processing page ${page.id}:`, pageError);
        results.push({
          page_id: page.id,
          url: page.source_url,
          success: false,
          error: pageError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`📊 Processing complete: ${successCount}/${results.length} successful`);

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ AI Content Processor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function extractWithOpenAI(page: any, apiKey: string, source: string): Promise<any> {
  const systemPrompt = source === 'franceagrimer' ? 
    createFrenchExtractionPrompt() : 
    createRomanianExtractionPrompt();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract agricultural subsidy information from this content:\n\nURL: ${page.source_url}\n\nContent:\n${page.combined_content_markdown || page.raw_text}` }
      ],
      temperature: 0.1,
      max_tokens: 2000
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    return null;
  }

  try {
    // Extract JSON from the response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    } else {
      // Try parsing the entire response as JSON
      return JSON.parse(content);
    }
  } catch (parseError) {
    console.warn('⚠️ Failed to parse OpenAI response as JSON:', parseError);
    return null;
  }
}

function createFrenchExtractionPrompt(): string {
  return `You are an expert at extracting agricultural subsidy information from French government websites, particularly FranceAgriMer content.

Extract structured data from the provided content and return it as valid JSON with the following schema:

{
  "title": "Subsidy title in French",
  "description": "Detailed description in French",
  "amount_min": 1000, // Minimum amount in EUR, null if not specified
  "amount_max": 50000, // Maximum amount in EUR, null if not specified
  "deadline": "2024-12-31", // ISO date format, null if not specified
  "regions": ["Île-de-France", "Nouvelle-Aquitaine"], // French regions
  "categories": ["agriculture", "élevage"], // Sector categories
  "legal_entities": ["EARL", "SCEA", "GFA"], // Eligible legal entity types
  "eligibility_criteria": {
    "min_farm_size": 5, // hectares
    "max_farm_size": 500,
    "organic_certified": false,
    "young_farmer": false,
    "requirements": ["Description of specific requirements"]
  },
  "application_docs": [
    {
      "document_name": "Formulaire de demande",
      "document_url": "https://...",
      "required": true
    }
  ],
  "agency": "FranceAgriMer",
  "funding_type": "grant", // or "loan", "guarantee"
  "sectors": ["viticulture", "céréales"], // Agricultural sectors
  "payment_terms": "Description of payment schedule",
  "co_financing_rate": 50 // Percentage if co-financing required
}

Rules:
- Return only valid JSON
- Convert all amounts to EUR (€)
- Use French region names exactly as they appear
- Include only information that is explicitly stated
- Use null for missing numerical values
- Use empty arrays for missing array values
- Preserve French language in text fields
- Extract document URLs if available`;
}

function createRomanianExtractionPrompt(): string {
  return `You are an expert at extracting agricultural subsidy information from Romanian government websites, particularly AFIR and PNDR content.

Extract structured data and return it as valid JSON with the same schema as French content but adapted for Romanian context:

{
  "title": "Subsidy title in Romanian",
  "description": "Detailed description in Romanian", 
  "amount_min": 1000, // Minimum amount in EUR/RON
  "amount_max": 50000,
  "deadline": "2024-12-31",
  "regions": ["București", "Cluj"], // Romanian counties/regions
  "categories": ["agricultură", "zootehnie"],
  "legal_entities": ["PFA", "SRL", "SA"],
  "eligibility_criteria": {
    "min_farm_size": 1,
    "requirements": ["Romanian specific requirements"]
  },
  "agency": "AFIR",
  "funding_type": "grant",
  "sectors": ["cereale", "legume"],
  "co_financing_rate": 90 // PNDR typically has high co-financing
}

Convert RON to EUR using approximate rate (5 RON = 1 EUR).
Preserve Romanian language in text fields.`;
}

function mapToSubsidySchema(extractedData: any, page: any): any {
  const currentDate = new Date().toISOString();
  
  return {
    code: `AUTO-${Date.now()}`, // Generate unique code
    title: { 
      [extractedData.agency === 'FranceAgriMer' ? 'fr' : 'ro']: extractedData.title 
    },
    description: { 
      [extractedData.agency === 'FranceAgriMer' ? 'fr' : 'ro']: extractedData.description 
    },
    amount_min: extractedData.amount_min,
    amount_max: extractedData.amount_max,
    deadline: extractedData.deadline,
    region: extractedData.regions || [],
    categories: extractedData.categories || [],
    legal_entities: extractedData.legal_entities || [],
    tags: extractedData.sectors || [],
    matching_tags: [...(extractedData.categories || []), ...(extractedData.sectors || [])],
    eligibility_criteria: extractedData.eligibility_criteria || {},
    application_docs: extractedData.application_docs || [],
    status: 'open',
    agency: extractedData.agency,
    funding_type: extractedData.funding_type,
    source_url: page.source_url,
    language: [extractedData.agency === 'FranceAgriMer' ? 'fr' : 'ro'],
    raw_content: {
      scraped_at: currentDate,
      source_page_id: page.id,
      extraction_method: 'openai_gpt4o'
    },
    domain: extractedData.agency === 'FranceAgriMer' ? 'franceagrimer.fr' : 'afir.info',
    scrape_date: currentDate,
    created_at: currentDate,
    updated_at: currentDate
  };
}