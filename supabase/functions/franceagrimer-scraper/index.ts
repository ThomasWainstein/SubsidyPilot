import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration using existing repository secrets only
const config = {
  supabase_url: Deno.env.get('NEXT_PUBLIC_SUPABASE_URL'),
  supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  openai_api_key: Deno.env.get('OPENAI_API_KEY'),
  scraper_gpt_key: Deno.env.get('SCRAPER_RAW_GPT_API'),
  backup_gpt_key: Deno.env.get('SCRAPPER_RAW_GPT_API'),
};

const supabase = createClient(
  config.supabase_url ?? '',
  config.supabase_service_key ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// French-specific selectors for FranceAgriMer
const FRENCH_SELECTORS = {
  title: 'h1.page-title, .aide-title, .dispositif-title, h1',
  amount: '.montant, .budget, .financement-montant, .funding-amount',
  deadline: '.date-limite, .echeance, .periode-depot, .deadline',
  description: '.description, .resume, .objectifs, .content-main p',
  eligibility: '.conditions, .beneficiaires, .eligibilite, .eligibility-criteria',
  regions: '.zones-eligibles, .territoires, .regions',
  documents: '.documents a[href$=".pdf"], .telecharger a, .fr-link--download',
  sectors: '.filieres, .secteurs, .productions'
};

interface ScrapingSession {
  session_id: string;
  target_sources: string[];
  extraction_config: {
    preserve_formatting: boolean;
    extract_documents: boolean;
    max_pages_per_source: number;
    include_sector_specific: boolean;
  };
  processing_status: 'discovering' | 'scraping' | 'processing' | 'complete';
}

class FrenchAIProcessor {
  private primaryKey = config.scraper_gpt_key;
  private backupKey = config.openai_api_key;
  private tertiaryKey = config.backup_gpt_key;

  async processContent(content: string, sourceUrl: string): Promise<any> {
    const keys = [this.primaryKey, this.backupKey, this.tertiaryKey].filter(Boolean);
    
    for (const key of keys) {
      try {
        return await this.extractWithKey(content, key!, sourceUrl);
      } catch (error) {
        console.log(`Key failed, trying next...`, error);
        continue;
      }
    }
    throw new Error('All AI processing keys failed');
  }

  private async extractWithKey(content: string, apiKey: string, sourceUrl: string): Promise<any> {
    const prompt = `
Extract French agricultural subsidy information from this content. Output valid JSON only:

{
  "title": "exact title in French",
  "description": "detailed description in French",
  "amount_eur": [min, max] or single number or null,
  "deadline_iso": "YYYY-MM-DD" or null,
  "eligible_regions": ["region1", "region2"] or null,
  "eligibility_criteria": "detailed criteria in French",
  "sectors": ["agriculture", "viticulture", etc.],
  "documents": [{"name": "doc name", "url": "full url"}],
  "agency": "FranceAgriMer",
  "country": "france",
  "source_url": "${sourceUrl}",
  "program": "program name if available",
  "funding_type": "grant/loan/subsidy",
  "application_method": "how to apply description"
}

French content to process:
${content.substring(0, 8000)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a French agricultural subsidy extraction expert. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content_text = data.choices[0].message.content;
    
    try {
      return JSON.parse(content_text);
    } catch (error) {
      console.error('Failed to parse AI response:', content_text);
      throw new Error('Invalid JSON response from AI');
    }
  }
}

async function scrapeUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    throw error;
  }
}

async function extractSubsidyUrls(html: string, baseUrl: string): Promise<string[]> {
  // Simple URL extraction for FranceAgriMer aide pages
  const urlPattern = /href="([^"]*\/aides\/[^"]+)"/g;
  const urls: string[] = [];
  let match;

  while ((match = urlPattern.exec(html)) !== null) {
    const url = match[1];
    const fullUrl = url.startsWith('http') ? url : `https://www.franceagrimer.fr${url}`;
    urls.push(fullUrl);
  }

  return [...new Set(urls)]; // Remove duplicates
}

async function logScrapingActivity(sessionId: string, status: string, message: string, details: any = {}) {
  await supabase
    .from('scraper_logs')
    .insert({
      session_id: sessionId,
      status,
      message,
      details,
    });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { maxPages = 10, dryRun = false } = await req.json().catch(() => ({}));
    const sessionId = `franceagrimer-${Date.now()}`;
    
    console.log(`Starting FranceAgriMer scraping session: ${sessionId}`);
    
    await logScrapingActivity(sessionId, 'started', 'FranceAgriMer scraping session started', {
      maxPages,
      dryRun
    });

    const processor = new FrenchAIProcessor();
    const results: any[] = [];
    
    // Start with main directory
    const mainUrl = 'https://www.franceagrimer.fr/aides-et-soutiens';
    console.log(`Scraping main directory: ${mainUrl}`);
    
    const mainHtml = await scrapeUrl(mainUrl);
    const subsidyUrls = await extractSubsidyUrls(mainHtml, mainUrl);
    
    console.log(`Found ${subsidyUrls.length} subsidy URLs`);
    
    // Process each subsidy URL
    for (let i = 0; i < Math.min(subsidyUrls.length, maxPages); i++) {
      const url = subsidyUrls[i];
      
      try {
        console.log(`Processing subsidy ${i + 1}/${Math.min(subsidyUrls.length, maxPages)}: ${url}`);
        
        const html = await scrapeUrl(url);
        const extractedData = await processor.processContent(html, url);
        
        if (!dryRun) {
          // Store in database
          const { data, error } = await supabase
            .from('subsidies_structured')
            .insert({
              url: extractedData.source_url,
              title: extractedData.title,
              description: extractedData.description,
              amount: extractedData.amount_eur ? [extractedData.amount_eur].flat() : null,
              deadline: extractedData.deadline_iso,
              region: extractedData.eligible_regions,
              sector: extractedData.sectors,
              agency: extractedData.agency,
              eligibility: extractedData.eligibility_criteria,
              program: extractedData.program,
              funding_type: extractedData.funding_type,
              application_method: extractedData.application_method,
              documents: extractedData.documents || [],
              language: 'fr',
            });

          if (error) {
            console.error('Database insert error:', error);
            await logScrapingActivity(sessionId, 'error', `Failed to insert subsidy: ${error.message}`, {
              url,
              error: error.message
            });
          } else {
            console.log(`Successfully inserted subsidy: ${extractedData.title}`);
          }
        }
        
        results.push(extractedData);
        
        // Brief delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Failed to process ${url}:`, error);
        await logScrapingActivity(sessionId, 'error', `Failed to process URL: ${url}`, {
          url,
          error: error.message
        });
        continue;
      }
    }

    await logScrapingActivity(sessionId, 'completed', `FranceAgriMer scraping completed`, {
      totalProcessed: results.length,
      successfulInserts: results.length,
      dryRun
    });

    return new Response(JSON.stringify({
      success: true,
      sessionId,
      totalUrls: subsidyUrls.length,
      processed: results.length,
      results: dryRun ? results : results.slice(0, 5), // Return first 5 for preview
      message: `Successfully processed ${results.length} FranceAgriMer subsidies`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('FranceAgriMer scraper error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'Failed to complete FranceAgriMer scraping'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});