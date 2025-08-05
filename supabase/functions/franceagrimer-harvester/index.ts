import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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

const FRENCH_SELECTORS = {
  title: 'h1.page-title, .aide-title, .dispositif-title, h1',
  amount: '.montant, .budget, .financement-montant, .amount',
  deadline: '.date-limite, .echeance, .periode-depot, .deadline',
  description: '.description, .resume, .objectifs, .content',
  eligibility: '.conditions, .beneficiaires, .eligibilite, .eligible',
  regions: '.zones-eligibles, .territoires, .regions, .zone',
  documents: '.documents a[href$=".pdf"], .telecharger a, a[href*=".pdf"]',
  sectors: '.filieres, .secteurs, .productions, .sector'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment configuration with debugging
    const config = {
      supabase_url: Deno.env.get('NEXT_PUBLIC_SUPABASE_URL'),
      supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      openai_api_key: Deno.env.get('SCRAPER_RAW_GPT_API'),
      backup_api_key: Deno.env.get('OPENAI_API_KEY')
    };

    console.log('🔧 Environment check:', {
      has_supabase_url: !!config.supabase_url,
      has_service_key: !!config.supabase_service_key,
      has_openai_key: !!config.openai_api_key,
      has_backup_key: !!config.backup_api_key,
      url_length: config.supabase_url?.length || 0
    });

    if (!config.supabase_url || !config.supabase_service_key) {
      const missingVars = [];
      if (!config.supabase_url) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!config.supabase_service_key) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
      throw new Error(`Missing required Supabase configuration: ${missingVars.join(', ')}`);
    }

    const supabase = createClient(config.supabase_url, config.supabase_service_key);
    console.log('✅ Supabase client created successfully');

    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body',
        details: parseError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { action = 'scrape', target_urls, max_pages = 10 } = requestBody;

    console.log('🇫🇷 FranceAgriMer Harvester starting:', { action, max_pages });

    if (action === 'scrape') {
      const session_id = `franceagrimer-${Date.now()}`;
      const session: ScrapingSession = {
        session_id,
        target_sources: [
          'https://www.franceagrimer.fr/aides-et-soutiens',
          'https://www.franceagrimer.fr/rechercher-une-aide'
        ],
        extraction_config: {
          preserve_formatting: true,
          extract_documents: true,
          max_pages_per_source: max_pages,
          include_sector_specific: true
        },
        processing_status: 'discovering'
      };

      // Log session start with error handling
      try {
        await supabase.from('scraper_logs').insert({
          session_id,
          status: 'started',
          message: 'FranceAgriMer harvesting session initiated',
          details: { session, target_urls: session.target_sources }
        });
        console.log('✅ Session logged successfully');
      } catch (logError) {
        console.warn('⚠️ Failed to log session start:', logError);
        // Continue execution even if logging fails
      }

      // Discover and scrape subsidy pages
      const scrapedPages = await discoverAndScrapePages(session, supabase);
      
      console.log(`📊 Scraped ${scrapedPages.length} pages from FranceAgriMer`);

      // Trigger AI processing pipeline for scraped content
      if (scrapedPages.length > 0) {
        try {
          await supabase.functions.invoke('ai-content-processor', {
            body: {
              source: 'franceagrimer',
              session_id,
              page_ids: scrapedPages.map(p => p.id)
            }
          });
          console.log('🤖 AI processing pipeline triggered');
        } catch (aiError) {
          console.warn('⚠️ AI processing trigger failed:', aiError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        session_id,
        pages_scraped: scrapedPages.length,
        message: 'FranceAgriMer harvesting completed',
        scraped_pages: scrapedPages
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ FranceAgriMer harvester error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function discoverAndScrapePages(session: ScrapingSession, supabase: any): Promise<any[]> {
  const scrapedPages: any[] = [];
  
  for (const baseUrl of session.target_sources) {
    try {
      console.log(`🔍 Discovering pages from: ${baseUrl}`);
      
      // Enhanced fetch with better headers and error handling
      const response = await fetch(baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        method: 'GET'
      });
      
      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch ${baseUrl}: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const html = await response.text();
      console.log(`📄 Retrieved ${html.length} characters from ${baseUrl}`);
      
      const subsidyUrls = extractSubsidyUrls(html, baseUrl);
      console.log(`🔗 Found ${subsidyUrls.length} subsidy URLs`);
      
      // Scrape individual subsidy pages (limited by max_pages)
      const urlsToScrape = subsidyUrls.slice(0, session.extraction_config.max_pages_per_source);
      
      for (const url of urlsToScrape) {
        try {
          console.log(`🔍 Scraping: ${url}`);
          const pageContent = await scrapeSubsidyPage(url);
          
          const pageData = {
            source_url: url,
            source_site: 'franceagrimer',
            raw_html: pageContent.html,
            raw_text: pageContent.text,
            raw_markdown: pageContent.markdown,
            text_markdown: pageContent.text,
            combined_content_markdown: pageContent.markdown,
            attachment_paths: pageContent.documents || [],
            attachment_count: (pageContent.documents || []).length,
            status: 'scraped',
            scrape_date: new Date().toISOString()
          };
          
          const { data: insertedPage, error } = await supabase
            .from('raw_scraped_pages')
            .insert(pageData)
            .select()
            .single();
          
          if (error) {
            console.error('❌ Failed to store page:', error);
          } else {
            scrapedPages.push(insertedPage);
            console.log(`✅ Scraped and stored: ${url}`);
          }
          
          // Rate limiting to be respectful
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (pageError) {
          console.warn(`⚠️ Failed to scrape ${url}:`, pageError.message);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${baseUrl}:`, error);
    }
  }
  
  return scrapedPages;
}

function extractSubsidyUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  
  // Extract URLs from various patterns common in FranceAgriMer
  const patterns = [
    /href="([^"]*\/aide[^"]*)"/, // Direct aide URLs
    /href="([^"]*\/dispositif[^"]*)"/, // Dispositif URLs  
    /href="([^"]*\/financement[^"]*)"/, // Financement URLs
    /href="([^"]*\.php\?[^"]*aide[^"]*)"/ // Dynamic aide URLs
  ];
  
  patterns.forEach(pattern => {
    const matches = html.matchAll(new RegExp(pattern.source, 'gi'));
    for (const match of matches) {
      const url = match[1];
      if (url && !url.startsWith('#') && !url.startsWith('javascript:')) {
        const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();
        if (!urls.includes(fullUrl)) {
          urls.push(fullUrl);
        }
      }
    }
  });
  
  // Also extract from common list structures
  const listMatches = html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>[^<]*(?:aide|subvention|financement)/gi);
  for (const match of listMatches) {
    const url = match[1];
    if (url && !url.startsWith('#')) {
      const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();
      if (!urls.includes(fullUrl)) {
        urls.push(fullUrl);
      }
    }
  }
  
  return urls.filter(url => url.includes('franceagrimer.fr'));
}

async function scrapeSubsidyPage(url: string): Promise<{html: string, text: string, markdown: string, documents: string[]}> {
  try {
    console.log(`📄 Fetching content from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`📦 Retrieved ${html.length} characters`);
    
    // Extract clean text content
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Convert to markdown-like format for better AI processing
    const markdown = convertHtmlToMarkdown(html);
    
    // Extract document links
    const documents = extractDocumentLinks(html, url);
    console.log(`📎 Found ${documents.length} document links`);
    
    return {
      html,
      text: textContent,
      markdown,
      documents
    };
    
  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error);
    throw error;
  }
}

function convertHtmlToMarkdown(html: string): string {
  let markdown = html;
  
  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  
  // Paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Lists
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1\n');
  
  // Links
  markdown = markdown.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Clean up whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
  
  return markdown;
}

function extractDocumentLinks(html: string, baseUrl: string): string[] {
  const documents: string[] = [];
  
  // Extract PDF and document links
  const docPattern = /<a[^>]+href="([^"]*\.(?:pdf|doc|docx|xls|xlsx))"[^>]*>/gi;
  const matches = html.matchAll(docPattern);
  
  for (const match of matches) {
    const url = match[1];
    if (url) {
      const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();
      documents.push(fullUrl);
    }
  }
  
  return [...new Set(documents)]; // Remove duplicates
}