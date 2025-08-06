import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  getStandardizedConfig, 
  validateAIProcessorRequest, 
  OpenAIClient, 
  PerformanceMonitor, 
  BatchProcessor,
  ContentProcessor 
} from '../shared/utils.ts';

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
    const config = getStandardizedConfig();
    console.log('🤖 AI Content Processor Environment Check: ✅ Configuration validated');

    const supabase = createClient(config.supabase_url, config.supabase_service_key);
    const openaiClient = new OpenAIClient(config.openai_primary_key, config.openai_backup_key);

    // Parse and validate request body
    const requestBody = await req.json();
    const { source, session_id, page_ids, quality_threshold } = validateAIProcessorRequest(requestBody);

    console.log('🤖 AI Content Processor starting:', { source, session_id, page_count: page_ids?.length });

    // Get pages to process
    let pagesToProcess;
    if (page_ids && page_ids.length > 0) {
      // Process specific pages
      const { data: pages, error } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .in('id', page_ids)
        .in('status', ['scraped', 'raw']); // Accept both statuses
      
      if (error) throw error;
      pagesToProcess = pages || [];
    } else {
      // Process all unprocessed pages from source
      const query = supabase
        .from('raw_scraped_pages')
        .select('*')
        .in('status', ['scraped', 'raw']); // Accept both scraped and raw status
      
      if (source && source !== 'all') {
        query.eq('source_site', source);
      }
      
      const { data: pages, error } = await query.limit(50); // Process max 50 at a time
      if (error) throw error;
      pagesToProcess = pages || [];
    }

    console.log(`📊 Processing ${pagesToProcess.length} pages`);

    // Process pages in batches for better performance
    const results = await BatchProcessor.processInBatches(
      pagesToProcess,
      async (page) => {
        return PerformanceMonitor.trackOperation(`ProcessPage-${page.id}`, async () => {
          console.log(`🔍 Processing page: ${page.source_url}`);
          
          // Extract structured data using OpenAI
          const extractedData = await extractSubsidyData(page, openaiClient, source);
          
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
              throw new Error(`Insert failed: ${insertError.message}`);
            } else {
              console.log(`✅ Processed and stored: ${extractedData.title}`);
              
              // Update page status
              await supabase
                .from('raw_scraped_pages')
                .update({ status: 'processed' })
                .eq('id', page.id);
              
              return insertedSubsidy;
            }
          } else {
            const confidence = extractedData?.confidence || 0;
            console.warn(`⚠️ Low quality extraction for ${page.source_url}, confidence: ${confidence}`);
            throw new Error(`Low quality extraction (confidence: ${confidence})`);
          }
        }, { page_url: page.source_url, source_site: page.source_site });
      },
      3, // Process 3 pages at a time
      2000 // 2 second delay between batches
    );

    const processedSubsidies = results.filter(r => r !== undefined);
    const failedPages = pagesToProcess.length - processedSubsidies.length;

    // Log processing completion
    if (session_id) {
      await supabase.from('scraper_logs').insert({
        session_id,
        status: 'ai_processed',
        message: `AI processing completed: ${processedSubsidies.length} subsidies created`,
        details: {
          successful: processedSubsidies.length,
      failed: failedPages,
          source: source
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      processed_pages: pagesToProcess.length,
      successful: processedSubsidies.length,
      failed: failedPages,
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

async function extractSubsidyData(page: any, openaiClient: OpenAIClient, source?: string): Promise<any> {
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

  // Optimize content for AI processing
  const content = ContentProcessor.optimizeContentForAI(
    page.combined_content_markdown || 
    page.text_markdown || 
    page.raw_text || 
    'No content available'
  );

  const userPrompt = `Extract subsidy information from this ${source || 'government'} website content:

URL: ${page.source_url}

Content:
${content}`;

  try {
    const result = await openaiClient.extractContent(userPrompt, systemPrompt, {
      model: 'gpt-4o-mini',
      maxTokens: 2000
    });
    
    return result;
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