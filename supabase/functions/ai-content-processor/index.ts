import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingRequest {
  source?: string;
  session_id?: string;
  page_ids?: string[];
  quality_threshold?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment configuration
    const config = {
      supabase_url: Deno.env.get('SUPABASE_URL'),
      supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      openai_api_key: Deno.env.get('SCRAPPER_RAW_GPT_API'), // Note: using existing secret with typo
      backup_api_key: Deno.env.get('OPENAI_API_KEY')
    };

    console.log('🤖 AI Content Processor Environment Check:', {
      has_supabase_url: !!config.supabase_url,
      has_service_key: !!config.supabase_service_key,
      has_openai_key: !!config.openai_api_key,
      has_backup_key: !!config.backup_api_key
    });

    if (!config.supabase_url || !config.supabase_service_key) {
      throw new Error('Missing required Supabase configuration');
    }

    if (!config.openai_api_key && !config.backup_api_key) {
      throw new Error('Missing OpenAI API key configuration');
    }

    const supabase = createClient(config.supabase_url, config.supabase_service_key);
    const openai_key = config.openai_api_key || config.backup_api_key;

    const requestBody: ProcessingRequest = await req.json();
    const { source, session_id, page_ids, quality_threshold = 0.7 } = requestBody;

    console.log('🤖 AI Content Processor starting:', { source, session_id, page_count: page_ids?.length });

    // Get pages to process
    let pagesToProcess;
    if (page_ids && page_ids.length > 0) {
      // Process specific pages
      const { data: pages, error } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .in('id', page_ids)
        .eq('status', 'scraped');
      
      if (error) throw error;
      pagesToProcess = pages || [];
    } else {
      // Process all unprocessed pages from source
      const query = supabase
        .from('raw_scraped_pages')
        .select('*')
        .eq('status', 'scraped');
      
      if (source && source !== 'all') {
        query.eq('source_site', source);
      }
      
      const { data: pages, error } = await query.limit(50); // Process max 50 at a time
      if (error) throw error;
      pagesToProcess = pages || [];
    }

    console.log(`📊 Processing ${pagesToProcess.length} pages`);

    const processedSubsidies: any[] = [];
    const failedPages: any[] = [];

    for (const page of pagesToProcess) {
      try {
        console.log(`🔍 Processing page: ${page.source_url}`);
        
        // Extract structured data using OpenAI
        const extractedData = await extractSubsidyData(page, openai_key, source);
        
        if (extractedData && extractedData.confidence >= quality_threshold) {
          // Store in subsidies_structured table
          const { data: insertedSubsidy, error: insertError } = await supabase
            .from('subsidies_structured')
            .insert({
              raw_log_id: page.id,
              url: page.source_url,
              title: extractedData.title,
              description: extractedData.description,
              amount: extractedData.amount,
              deadline: extractedData.deadline,
              eligibility: extractedData.eligibility,
              program: extractedData.program,
              agency: extractedData.agency,
              region: extractedData.regions || [],
              sector: extractedData.sectors || [],
              language: extractedData.language || [getLanguageFromSource(source)],
              scrape_date: page.scrape_date,
              source_url_verified: page.source_url
            })
            .select()
            .single();
          
          if (insertError) {
            console.error('❌ Failed to insert structured subsidy:', insertError);
            failedPages.push({ page_id: page.id, error: insertError.message });
          } else {
            processedSubsidies.push(insertedSubsidy);
            console.log(`✅ Processed and stored: ${extractedData.title}`);
            
            // Update page status
            await supabase
              .from('raw_scraped_pages')
              .update({ status: 'processed' })
              .eq('id', page.id);
          }
        } else {
          console.warn(`⚠️ Low quality extraction for ${page.source_url}, confidence: ${extractedData?.confidence || 0}`);
          failedPages.push({ page_id: page.id, error: 'Low quality extraction' });
        }
        
      } catch (error) {
        console.error(`❌ Failed to process page ${page.id}:`, error);
        failedPages.push({ page_id: page.id, error: error.message });
      }
    }

    // Log processing completion
    if (session_id) {
      await supabase.from('scraper_logs').insert({
        session_id,
        status: 'ai_processed',
        message: `AI processing completed: ${processedSubsidies.length} subsidies created`,
        details: {
          successful: processedSubsidies.length,
          failed: failedPages.length,
          source: source
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      processed_pages: pagesToProcess.length,
      successful: processedSubsidies.length,
      failed: failedPages.length,
      subsidies: processedSubsidies.map(s => ({
        id: s.id,
        title: s.title,
        url: s.url
      })),
      failed_pages: failedPages
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

async function extractSubsidyData(page: any, openaiKey: string, source?: string): Promise<any> {
  const language = getLanguageFromSource(source);
  
  const systemPrompt = `You are an expert at extracting structured subsidy information from government websites.
Extract the following information from the provided text and return it as JSON:

{
  "title": "Exact title of the subsidy/grant",
  "description": "Clear, concise description of what the subsidy supports",
  "amount": [array of numbers representing funding amounts],
  "deadline": "Application deadline if mentioned (YYYY-MM-DD format)",
  "eligibility": "Who can apply and requirements",
  "program": "Program or scheme name",
  "agency": "Government agency providing the funding", 
  "regions": ["array", "of", "eligible", "regions"],
  "sectors": ["array", "of", "eligible", "sectors"],
  "language": ["${language}"],
  "confidence": 0.9
}

Focus on accuracy. If information is not clearly stated, use null for that field.
Set confidence between 0.0-1.0 based on how clear and complete the extraction is.`;

  const userPrompt = `Extract subsidy information from this ${source || 'government'} website content:

URL: ${page.source_url}

Content:
${page.raw_text?.substring(0, 8000) || page.combined_content_markdown?.substring(0, 8000)}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0].message.content;
    
    // Parse JSON response
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No valid JSON found in response');
    }
    
  } catch (error) {
    console.error('❌ OpenAI extraction failed:', error);
    return {
      title: page.source_url.split('/').pop()?.replace(/-/g, ' ') || 'Unknown Subsidy',
      description: page.raw_text?.substring(0, 500) || 'No description available',
      confidence: 0.2
    };
  }
}

function getLanguageFromSource(source?: string): string {
  switch (source) {
    case 'franceagrimer':
      return 'fr';
    case 'afir':
      return 'ro';
    default:
      return 'en';
  }
}