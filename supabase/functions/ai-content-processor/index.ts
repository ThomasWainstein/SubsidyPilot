import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inline utilities for self-contained edge function
function getStandardizedConfig() {
  const config = {
    supabase_url: Deno.env.get('SUPABASE_URL'),
    supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    openai_primary_key: Deno.env.get('SCRAPPER_RAW_GPT_API'),
    openai_backup_key: Deno.env.get('OPENAI_API_KEY')
  };

  if (!config.supabase_url || !config.supabase_service_key) {
    const missing = [];
    if (!config.supabase_url) missing.push('SUPABASE_URL');
    if (!config.supabase_service_key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`Missing required Supabase configuration: ${missing.join(', ')}`);
  }

  return config;
}

function validateAIProcessorRequest(body) {
  const { source = 'all', session_id, page_ids, quality_threshold = 0.7 } = body;
  
  if (!['franceagrimer', 'afir', 'all'].includes(source)) {
    throw new Error('Invalid source. Must be: franceagrimer, afir, or all');
  }
  
  if (quality_threshold < 0 || quality_threshold > 1) {
    throw new Error('quality_threshold must be between 0 and 1');
  }
  
  return { source, session_id, page_ids, quality_threshold };
}

class OpenAIClient {
  constructor(primaryKey, backupKey) {
    this.primaryKey = primaryKey;
    this.backupKey = backupKey;
    if (!primaryKey && !backupKey) {
      throw new Error('At least one OpenAI API key must be provided');
    }
  }

  async extractContent(content, systemPrompt, options = {}) {
    const keys = [this.primaryKey, this.backupKey].filter(Boolean);
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: content }
            ],
            temperature: options.temperature || 0.1,
            max_tokens: options.maxTokens || 2000
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          if (!content) throw new Error('No content in OpenAI response');
          
          try {
            // Try to parse the entire content first
            const fullContent = content.trim();
            if (fullContent.startsWith('{') && fullContent.endsWith('}')) {
              return JSON.parse(fullContent);
            }
            
            // Extract JSON block from markdown formatting
            const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonStr = jsonMatch[1] || jsonMatch[0];
              return JSON.parse(jsonStr);
            } else {
              throw new Error('No valid JSON found in response');
            }
          } catch (parseError) {
            console.error('❌ Failed to parse OpenAI response:', content.substring(0, 500));
            console.error('Parse error:', parseError.message);
            throw new Error(`Invalid JSON response from OpenAI: ${parseError.message}`);
          }
        } else if (response.status === 429 && i < keys.length - 1) {
          console.warn(`⚠️ Rate limited on key ${i + 1}, trying next...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        } else {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      } catch (error) {
        if (i === keys.length - 1) {
          throw error;
        }
        console.warn(`⚠️ OpenAI key ${i + 1} failed, trying backup:`, error.message);
      }
    }
    
    throw new Error('All OpenAI keys failed');
  }
}

class PerformanceMonitor {
  static async trackOperation(operationName, fn, metadata = {}) {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${operationName} completed:`, {
        duration: `${duration}ms`,
        status: 'success',
        ...metadata
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${operationName} failed:`, {
        duration: `${duration}ms`,
        error: error.message,
        status: 'failed',
        ...metadata
      });
      throw error;
    }
  }
}

class BatchProcessor {
  static async processInBatches(items, processor, batchSize = 3, delayBetweenBatches = 1000) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
      
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.warn('⚠️ Batch item failed:', result.reason);
        }
      }
      
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
}

class ContentProcessor {
  static optimizeContentForAI(content, maxLength = 8000) {
    if (content.length <= maxLength) {
      return content;
    }
    
    const sections = content.split(/\n\n+/);
    const prioritized = sections
      .filter(section => section.length > 50)
      .sort((a, b) => {
        const keyTerms = ['aide', 'subvention', 'financement', 'măsura', 'finanțare', 'eligible', 'amount', 'deadline', 'présentation', 'pour qui', 'comment', 'documents'];
        const aScore = keyTerms.reduce((score, term) => score + (a.toLowerCase().includes(term) ? 1 : 0), 0);
        const bScore = keyTerms.reduce((score, term) => score + (b.toLowerCase().includes(term) ? 1 : 0), 0);
        return bScore - aScore;
      });
    
    let result = '';
    for (const section of prioritized) {
      if (result.length + section.length + 2 <= maxLength) {
        result += section + '\n\n';
      } else {
        break;
      }
    }
    
    return result.trim();
  }
}

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
        .in('id', page_ids);
      
      if (error) throw error;
      pagesToProcess = pages || [];
    } else {
      // Process all unprocessed pages from source
      const query = supabase
        .from('raw_scraped_pages')
        .select('*')
        .eq('status', 'scraped'); // Only process 'scraped' status, not 'processed'
      
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
          
          // Extract structured data using OpenAI with verbatim extraction
          const extractedData = await extractSubsidyDataVerbatim(page, openaiClient, source);
          
          if (extractedData && extractedData.confidence >= quality_threshold) {
            try {
              // Insert directly into subsidies_structured with verbatim content
              const { data: insertedSubsidy, error: insertError } = await supabase
                .from('subsidies_structured')
                .insert({
                  url: page.source_url,
                  title: extractedData.title,
                  description: extractedData.description,
                  presentation: extractedData.presentation,
                  eligibility: extractedData.eligibility,
                  application_process: extractedData.application_process,
                  deadlines: extractedData.deadlines,
                  amounts: extractedData.amounts,
                  amount: extractedData.amount,
                  deadline: extractedData.deadline ? extractedData.deadline : null,
                  program: extractedData.program,
                  agency: extractedData.agency,
                  region: extractedData.regions || [],
                  sector: extractedData.sectors || [],
                  extracted_documents: extractedData.document_urls || [],
                  document_count: extractedData.document_count || 0,
                  verbatim_extraction: true,
                  language: getLanguageFromSource(source),
                  scrape_date: page.scrape_date,
                  audit: {
                    extraction_confidence: extractedData.confidence,
                    extraction_timestamp: new Date().toISOString(),
                    source_processor: 'ai-content-processor-v3-verbatim-enhanced',
                    verbatim_extraction: true,
                    documents_found: extractedData.document_count || 0
                  }
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
            } catch (dbError) {
              console.error('❌ Database operation failed:', dbError);
              throw dbError;
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

async function extractSubsidyDataVerbatim(page: any, openaiClient: OpenAIClient, source?: string): Promise<any> {
  const language = getLanguageFromSource(source);
  
  // Clean HTML entities and extract readable text
  let cleanText = page.raw_text || page.text_markdown || page.combined_content_markdown || '';
  
  // Comprehensive HTML entity decoding for French characters
  cleanText = cleanText
    .replace(/&agrave;/g, 'à')
    .replace(/&acirc;/g, 'â')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&euml;/g, 'ë')
    .replace(/&icirc;/g, 'î')
    .replace(/&iuml;/g, 'ï')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&ucirc;/g, 'û')
    .replace(/&uuml;/g, 'ü')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&rsquo;/g, ''')
    .replace(/&lsquo;/g, ''')
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  const systemPrompt = `You are an expert at extracting VERBATIM content from French government subsidy pages. Your job is to preserve the exact French text as it appears, not to translate or summarize.

CRITICAL INSTRUCTIONS:
1. Extract and preserve original French text exactly as written - NEVER translate
2. Look for document URLs and files (PDF, DOCX, Excel, etc.)
3. Preserve French government terminology exactly
4. Copy section headers and content verbatim
5. Find ALL documents in "Documents associés" or "Documents annexes" sections

Extract the following information and return ONLY valid JSON:

{
  "title": "EXACT title from the page (preserve original French)",
  "description": "VERBATIM first key description paragraph",
  "presentation": "Complete 'Présentation' section text VERBATIM if found",
  "eligibility": "Complete 'Pour qui ?' or eligibility section VERBATIM if found", 
  "application_process": "Complete 'Comment ?' or application process text VERBATIM if found",
  "deadlines": "EXACT deadline text as written (e.g. 'La téléprocédure de dépôt des demandes d'avance est close')",
  "amounts": "EXACT funding amount text as written (e.g. 'enveloppe globale de 75M€')",
  "amount": [extract numeric values only if clearly stated],
  "deadline": "Parse date to YYYY-MM-DD format only if clear date found",
  "program": "Official program name VERBATIM",
  "agency": "Government agency name VERBATIM (e.g. 'FranceAgriMer')",
  "regions": ["exact region names as written"],
  "sectors": ["exact sector names from page"],
  "document_urls": ["ALL document URLs found - PDFs, forms, Excel files, etc."],
  "document_count": 0,
  "verbatim_extraction": true,
  "confidence": 0.9
}

DOCUMENT EXTRACTION PRIORITY:
- Find ALL PDF links (.pdf files)
- Excel files (.xlsx, .xls)
- Forms and applications
- "Décision", "Protocole", "FAQ" documents
- Look in "Documents associés" sections
- Count total documents found

VERBATIM TEXT PRESERVATION RULES:
- Copy French text EXACTLY as it appears - DO NOT translate
- Preserve official terminology: "téléprocédure", "campagnes", "dispositif", etc.
- Keep dates in original format: "du 17/07/2025 au 08/09/2025"
- Maintain French phrases exactly: "Dans le cadre du Plan de souveraineté..."
- Preserve section headers exactly: "Présentation", "Pour qui ?", "Comment ?"
- Keep funding amounts as written: "enveloppe globale de 75M€"

NEVER create generic descriptions - always use the actual French text from the page.
If a section is not found, return null or empty string, do not make up content.`;

  // Optimize content for AI processing with better context preservation
  const optimizedContent = ContentProcessor.optimizeContentForAI(cleanText, 12000);
  
  const userPrompt = `Extract subsidy information from this French government website content.

CRITICAL: Use VERBATIM French text - do not translate or summarize!

URL: ${page.source_url}

Content:
${optimizedContent}

Focus on extracting:
1. EXACT French text from sections like "Présentation", "Pour qui ?", "Comment ?"
2. All document URLs (PDFs, forms, Excel files, etc.)
3. Precise dates and amounts as written
4. Official French terminology exactly as it appears
5. Document links from "Documents associés" sections

Return structured JSON with verbatim French content.`;

  try {
    const result = await openaiClient.extractContent(userPrompt, systemPrompt, {
      model: 'gpt-4o-mini',
      maxTokens: 2500
    });
    
    // Ensure document_count matches document_urls length
    if (result.document_urls && Array.isArray(result.document_urls)) {
      result.document_count = result.document_urls.length;
    }
    
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