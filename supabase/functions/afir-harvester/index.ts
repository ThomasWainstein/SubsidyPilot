import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROMANIAN_SELECTORS = {
  title: 'h1, .title, .masura-title, .program-title',
  amount: '.valoare, .finantare, .suma, .buget',
  deadline: '.termen, .deadline, .data-limita, .scadenta',
  description: '.descriere, .obiective, .continut, .detalii',
  eligibility: '.conditii, .eligibilitate, .cerinte, .criterii',
  regions: '.judete, .regiuni, .zone-eligibile, .arii',
  documents: 'a[href$=".pdf"], a[href*="formular"], a[href*="cerere"]',
  sectors: '.domenii, '.sectoare', '.activitati', '.filiere'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config = {
      supabase_url: Deno.env.get('NEXT_PUBLIC_SUPABASE_URL'),
      supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      openai_api_key: Deno.env.get('SCRAPER_RAW_GPT_API'),
      backup_api_key: Deno.env.get('OPENAI_API_KEY')
    };

    if (!config.supabase_url || !config.supabase_service_key) {
      throw new Error('Missing required Supabase configuration');
    }

    const supabase = createClient(config.supabase_url, config.supabase_service_key);
    
    const { action = 'scrape', target_urls, max_pages = 10 } = await req.json();

    console.log('🇷🇴 AFIR Harvester starting:', { action, max_pages });

    if (action === 'scrape') {
      const session_id = `afir-${Date.now()}`;
      const target_sources = target_urls || [
        'https://www.afir.info/sesiune_finantare',
        'https://www.afir.info/masuri', 
        'https://www.madr.ro/pndr-2014-2020',
        'https://ampro.ro/fonduri-europene'
      ];

      // Log session start
      await supabase.from('scraper_logs').insert({
        session_id,
        status: 'started',
        message: 'AFIR/Romanian harvesting session initiated',
        details: { target_sources, max_pages }
      });

      // Discover and scrape Romanian subsidy pages
      const scrapedPages = await discoverRomanianPages(target_sources, max_pages, supabase);
      
      console.log(`📊 Scraped ${scrapedPages.length} pages from Romanian sources`);

      // Trigger AI processing pipeline
      if (scrapedPages.length > 0) {
        try {
          await supabase.functions.invoke('ai-content-processor', {
            body: {
              source: 'afir',
              session_id,
              page_ids: scrapedPages.map(p => p.id)
            }
          });
          console.log('🤖 AI processing pipeline triggered for Romanian content');
        } catch (aiError) {
          console.warn('⚠️ AI processing trigger failed:', aiError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        session_id,
        pages_scraped: scrapedPages.length,
        message: 'Romanian harvesting completed',
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
    console.error('❌ AFIR harvester error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function discoverRomanianPages(sources: string[], maxPages: number, supabase: any): Promise<any[]> {
  const scrapedPages: any[] = [];
  
  for (const baseUrl of sources) {
    try {
      console.log(`🔍 Discovering Romanian pages from: ${baseUrl}`);
      
      const response = await fetch(baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8'
        }
      });
      
      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch ${baseUrl}: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const subsidyUrls = extractRomanianSubsidyUrls(html, baseUrl);
      
      console.log(`📄 Found ${subsidyUrls.length} Romanian subsidy URLs`);
      
      // Scrape individual subsidy pages (limited by maxPages)
      const urlsToScrape = subsidyUrls.slice(0, Math.floor(maxPages / sources.length));
      
      for (const url of urlsToScrape) {
        try {
          const pageContent = await scrapeRomanianPage(url);
          
          const pageData = {
            source_url: url,
            source_site: 'afir',
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
            console.error('❌ Failed to store Romanian page:', error);
          } else {
            scrapedPages.push(insertedPage);
            console.log(`✅ Scraped and stored Romanian page: ${url}`);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (pageError) {
          console.warn(`⚠️ Failed to scrape Romanian page ${url}:`, pageError);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing Romanian source ${baseUrl}:`, error);
    }
  }
  
  return scrapedPages;
}

function extractRomanianSubsidyUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  
  // Romanian-specific URL patterns
  const patterns = [
    /href="([^"]*masura[^"]*)"/, // Măsură URLs
    /href="([^"]*submasura[^"]*)"/, // Submăsură URLs
    /href="([^"]*finantare[^"]*)"/, // Finanțare URLs
    /href="([^"]*pndr[^"]*)"/, // PNDR URLs
    /href="([^"]*program[^"]*)"/, // Program URLs
    /href="([^"]*\.php\?[^"]*masura[^"]*)"/, // Dynamic măsură URLs
    /href="([^"]*cerere[^"]*)"/, // Cerere (application) URLs
    /href="([^"]*ghid[^"]*)"/ // Ghid (guide) URLs
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
  
  // Extract from Romanian content patterns
  const contentMatches = html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>[^<]*(?:măsura|finanțare|cerere|subvenție|fond)/gi);
  for (const match of contentMatches) {
    const url = match[1];
    if (url && !url.startsWith('#')) {
      const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();
      if (!urls.includes(fullUrl)) {
        urls.push(fullUrl);
      }
    }
  }
  
  return urls.filter(url => 
    url.includes('afir.info') || 
    url.includes('madr.ro') || 
    url.includes('ampro.ro') ||
    url.includes('fonduri-ue.ro')
  );
}

async function scrapeRomanianPage(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const html = await response.text();
  
  // Extract text content with Romanian character preservation
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Convert to markdown with Romanian formatting
  const markdown = convertRomanianHtmlToMarkdown(html);
  
  // Extract Romanian document links
  const documents = extractRomanianDocumentLinks(html, url);
  
  return {
    html,
    text: textContent,
    markdown,
    documents
  };
}

function convertRomanianHtmlToMarkdown(html: string): string {
  let markdown = html;
  
  // Headers with Romanian diacritics preservation
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
  
  // Tables (common in Romanian administrative content)
  markdown = markdown.replace(/<td[^>]*>(.*?)<\/td>/gi, '| $1 ');
  markdown = markdown.replace(/<tr[^>]*>(.*?)<\/tr>/gi, '$1|\n');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Clean up whitespace while preserving Romanian text formatting
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
  
  return markdown;
}

function extractRomanianDocumentLinks(html: string, baseUrl: string): string[] {
  const documents: string[] = [];
  
  // Extract PDF and Romanian document patterns
  const docPatterns = [
    /<a[^>]+href="([^"]*\.(?:pdf|doc|docx|xls|xlsx))"[^>]*>/gi,
    /<a[^>]+href="([^"]*formular[^"]*)"[^>]*>/gi, // Formulare
    /<a[^>]+href="([^"]*cerere[^"]*)"[^>]*>/gi, // Cereri
    /<a[^>]+href="([^"]*ghid[^"]*)"[^>]*>/gi // Ghiduri
  ];
  
  docPatterns.forEach(pattern => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const url = match[1];
      if (url) {
        const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();
        documents.push(fullUrl);
      }
    }
  });
  
  return [...new Set(documents)]; // Remove duplicates
}