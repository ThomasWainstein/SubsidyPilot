import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// Site configuration inspired by GitHub scraper
interface SiteConfig {
  base_url: string;
  list_page_pattern: string;
  detail_page_pattern?: string;
  link_selector: string;
  wait_selector: string;
  fallback_wait_selector?: string;
  exclude_url_patterns: string[];
  pagination_type: 'page_number' | 'infinite_scroll' | 'next_button';
  empty_result_indicators: string[];
}

interface HarvesterConfig {
  site_name: string;
  max_pages: number;
  max_urls?: number;
  start_page?: number;
  enable_pagination: boolean;
  respect_delays: boolean;
}

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

const SITE_CONFIGS: Record<string, SiteConfig> = {
  'franceagrimer': {
    base_url: 'https://www.franceagrimer.fr',
    list_page_pattern: 'https://www.franceagrimer.fr/rechercher-une-aide?page={page}',
    detail_page_pattern: 'https://www.franceagrimer.fr/aides/par-programme/aides-de-crises',
    link_selector: 'h3.fr-card__title a[href*="/aides/"], .fr-card h3 a[href*="/aides/"], .fr-card a[href*="/aides/"]',
    wait_selector: 'div#search-results article.fr-card h3.fr-card__title',
    fallback_wait_selector: '.fr-card, .aide-item',
    exclude_url_patterns: ['javascript:', 'mailto:', '#', '/rechercher-une-aide', '/par-programme'],
    pagination_type: 'page_number',
    empty_result_indicators: [
      "Votre recherche n'a retourné aucun résultat",
      "No results found", 
      "Aucun résultat",
      "0 résultat"
    ]
  }
};

// Smart URL Collector implementation inspired by GitHub scraper
class SmartUrlCollector {
  private config: SiteConfig;
  private collectedUrls: Set<string> = new Set();
  private processedPages: number = 0;

  constructor(config: SiteConfig) {
    this.config = config;
  }

  async collectDetailUrls(harvesterConfig: HarvesterConfig): Promise<string[]> {
    console.log(`🔍 Starting smart URL collection for ${harvesterConfig.site_name}`);
    console.log(`📊 Config: max_pages=${harvesterConfig.max_pages}, max_urls=${harvesterConfig.max_urls || 'unlimited'}`);

    // Strategy 1: Try direct crisis aids page for individual subsidies
    await this.collectFromDirectPage();

    // Strategy 2: If we need more URLs, use pagination
    if (harvesterConfig.enable_pagination && this.collectedUrls.size < (harvesterConfig.max_urls || 50)) {
      await this.collectFromPagination(harvesterConfig.start_page || 0, harvesterConfig.max_pages, harvesterConfig.max_urls);
    }

    console.log(`✅ Collection complete: ${this.collectedUrls.size} unique URLs from ${this.processedPages} pages`);
    return Array.from(this.collectedUrls);
  }

  private async collectFromDirectPage(): Promise<void> {
    try {
      const directUrl = 'https://www.franceagrimer.fr/aides/par-programme/aides-de-crises';
      console.log(`📄 Fetching direct crisis aids page: ${directUrl}`);
      
      const response = await fetch(directUrl);
      if (!response.ok) {
        console.warn(`⚠️ Direct page failed: ${response.status}`);
        return;
      }

      const html = await response.text();
      const urls = this.extractUrlsFromHtml(html, directUrl);
      
      console.log(`📊 Found ${urls.length} URLs from direct crisis aids page`);
      urls.forEach(url => this.collectedUrls.add(url));
      
      if (urls.length > 0) {
        this.processedPages++;
      }
    } catch (error) {
      console.error(`❌ Error fetching direct page: ${error.message}`);
    }
  }

  private async collectFromPagination(startPage: number, maxPages: number, maxUrls?: number): Promise<void> {
    console.log(`📑 Starting pagination from page ${startPage} to ${startPage + maxPages - 1}`);
    
    for (let page = startPage; page < startPage + maxPages; page++) {
      try {
        const pageUrl = this.config.list_page_pattern.replace('{page}', page.toString());
        console.log(`📄 Fetching page ${page}: ${pageUrl}`);
        
        const response = await fetch(pageUrl);
        if (!response.ok) {
          console.warn(`⚠️ Page ${page} failed: ${response.status}`);
          continue;
        }

        const html = await response.text();
        
        // Check for empty results
        if (this.hasEmptyResults(html)) {
          console.log(`📭 Empty results detected on page ${page}, stopping pagination`);
          break;
        }

        const urls = this.extractUrlsFromHtml(html, pageUrl);
        console.log(`📊 Page ${page}: found ${urls.length} URLs`);
        
        if (urls.length === 0) {
          console.log(`📭 No URLs found on page ${page}, stopping pagination`);
          break;
        }

        const initialSize = this.collectedUrls.size;
        urls.forEach(url => this.collectedUrls.add(url));
        const newUrls = this.collectedUrls.size - initialSize;
        
        console.log(`📈 Added ${newUrls} new URLs (total: ${this.collectedUrls.size})`);
        this.processedPages++;

        // Check max_urls limit
        if (maxUrls && this.collectedUrls.size >= maxUrls) {
          console.log(`🎯 Reached max_urls limit (${maxUrls}), stopping pagination`);
          break;
        }

        // Respectful delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error on page ${page}: ${error.message}`);
        continue;
      }
    }
  }

  private extractUrlsFromHtml(html: string, baseUrl: string): string[] {
    const urls: string[] = [];
    
    try {
      // Use regex to extract href attributes matching our selector patterns
      const linkPatterns = [
        /href="([^"]*\/aides\/[^"]*)"[^>]*>/g,
        /href="([^"]*aide[^"]*)"[^>]*>/g
      ];

      for (const pattern of linkPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const href = match[1];
          if (href && this.isValidDetailUrl(href, baseUrl)) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
            urls.push(fullUrl);
          }
        }
      }

      // Remove duplicates
      return Array.from(new Set(urls));
      
    } catch (error) {
      console.error(`❌ Error extracting URLs: ${error.message}`);
      return [];
    }
  }

  private isValidDetailUrl(href: string, baseUrl: string): boolean {
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      return false;
    }

    // Check against exclusion patterns
    for (const pattern of this.config.exclude_url_patterns) {
      if (href.toLowerCase().includes(pattern.toLowerCase())) {
        return false;
      }
    }

    // Must contain '/aides/' and be for specific subsidies
    if (!href.includes('/aides/') || href.includes('/par-programme') || href.includes('/rechercher-une-aide')) {
      return false;
    }

    return true;
  }

  private hasEmptyResults(html: string): boolean {
    const lowercaseHtml = html.toLowerCase();
    return this.config.empty_result_indicators.some(indicator => 
      lowercaseHtml.includes(indicator.toLowerCase())
    );
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment configuration with debugging
    const config = {
      supabase_url: Deno.env.get('SUPABASE_URL'),
      supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      openai_api_key: Deno.env.get('SCRAPPER_RAW_GPT_API'), // Note: existing secret has typo with double P
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
      if (!config.supabase_url) missingVars.push('SUPABASE_URL');
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

      // Discover and scrape subsidy pages using smart collector
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
        pages_discovered: scrapedPages.length,
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
  
  // Use smart URL collection inspired by GitHub scraper
  const config = SITE_CONFIGS['franceagrimer'];
  const collector = new SmartUrlCollector(config);
  
  const harvesterConfig: HarvesterConfig = {
    site_name: 'franceagrimer',
    max_pages: session.extraction_config.max_pages_per_source,
    max_urls: 50, // Reasonable limit
    start_page: 0,
    enable_pagination: true,
    respect_delays: true
  };

  console.log(`🚀 Starting smart discovery with config:`, harvesterConfig);

  // Collect URLs using the smart collector
  const subsidyUrls = await collector.collectDetailUrls(harvesterConfig);
  console.log(`🔗 Smart collection found ${subsidyUrls.length} subsidy URLs`);
  
  // Scrape individual subsidy pages
  for (const url of subsidyUrls) {
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
        if (error.code === '23505') {
          // URL already exists, skip with warning
          console.warn(`⚠️ URL already exists, skipping: ${url}`);
          
          // Get existing page for AI processing
          const { data: existingPage } = await supabase
            .from('raw_scraped_pages')
            .select('*')
            .eq('source_url', url)
            .single();
          
          if (existingPage) {
            scrapedPages.push(existingPage);
            console.log(`✅ Using existing page: ${url}`);
          }
        } else {
          console.error('❌ Failed to store page:', error);
        }
      } else {
        scrapedPages.push(insertedPage);
        console.log(`✅ Scraped and stored: ${url}`);
      }
      
      // Rate limiting to be respectful (inspired by GitHub delays)
      if (harvesterConfig.respect_delays) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (pageError) {
      console.warn(`⚠️ Failed to scrape ${url}:`, pageError.message);
    }
  }
  
  return scrapedPages;
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