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
  run_id?: string;
  target_sources: string[];
  extraction_config: {
    preserve_formatting: boolean;
    extract_documents: boolean;
    max_pages_per_source: number;
    include_sector_specific: boolean;
  };
  processing_status: 'discovering' | 'scraping' | 'processing' | 'complete';
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
      supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    };

    console.log('🔧 AFIR Environment check:', {
      has_supabase_url: !!config.supabase_url,
      has_service_key: !!config.supabase_service_key,
      url_length: config.supabase_url?.length || 0
    });

    if (!config.supabase_url || !config.supabase_service_key) {
      const missingVars = [];
      if (!config.supabase_url) missingVars.push('SUPABASE_URL');
      if (!config.supabase_service_key) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
      throw new Error(`Missing required Supabase configuration: ${missingVars.join(', ')}`);
    }

    const supabase = createClient(config.supabase_url, config.supabase_service_key);
    console.log('✅ AFIR Supabase client created successfully');

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
    
    const { action = 'scrape', max_pages = 5, run_id } = requestBody;

    console.log('🇷🇴 AFIR Romania Harvester starting:', { action, max_pages, run_id });

    if (action === 'scrape') {
      const session_id = `afir-${Date.now()}`;
      const session: ScrapingSession = {
        session_id,
        run_id: run_id,
        target_sources: [
          'https://apia.org.ro/achizitii-publice/',
          'https://www.madr.ro/'
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
          message: 'AFIR Romania harvesting session initiated',
          details: { session, target_sources: session.target_sources, run_id }
        });
        console.log('✅ AFIR Session logged successfully');
      } catch (logError) {
        console.warn('⚠️ Failed to log session start:', logError);
        // Continue execution even if logging fails
      }

      // Use real Romanian procurement data from APIA
      const scrapedPages = await discoverAndScrapeRealPages(session, supabase, run_id);
      
      console.log(`📊 Scraped ${scrapedPages.length} pages from AFIR Romania`);

      return new Response(JSON.stringify({
        success: true,
        session_id,
        pages_scraped: scrapedPages.length,
        pages_discovered: scrapedPages.length,
        message: 'AFIR Romania harvesting completed',
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

async function discoverAndScrapeRealPages(session: ScrapingSession, supabase: any, run_id?: string): Promise<any[]> {
  const scrapedPages: any[] = [];
  
  console.log(`🚀 Starting APIA Romania procurement data collection`);

  // Target the real APIA procurement page
  const targetUrls = [
    'https://apia.org.ro/achizitii-publice/',
    'https://apia.org.ro/achizitii-publice/page/2/',
    'https://apia.org.ro/achizitii-publice/page/3/'
  ];

  for (const url of targetUrls) {
    try {
      console.log(`🔍 Scraping APIA page: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch ${url}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      console.log(`📦 Retrieved ${html.length} characters from ${url}`);
      
      // Extract clean text content
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Convert to markdown format
      const markdown = convertHtmlToMarkdown(html);
      
      // Extract document links (look for PDF, DOC, etc.)
      const documents = extractDocumentLinks(html, url);
      console.log(`📎 Found ${documents.length} document links`);
      
      const pageData = {
        source_url: url,
        source_site: 'apia-romania',
        raw_html: html,
        raw_text: textContent,
        raw_markdown: markdown,
        text_markdown: markdown,
        combined_content_markdown: markdown,
        attachment_paths: documents,
        attachment_count: documents.length,
        status: 'scraped',
        scrape_date: new Date().toISOString(),
        run_id: run_id || null
      };
      
      const { data: insertedPage, error } = await supabase
        .from('raw_scraped_pages')
        .insert(pageData)
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          console.warn(`⚠️ URL already exists, skipping: ${url}`);
          
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
      
      // Rate limiting to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (pageError) {
      console.warn(`⚠️ Failed to scrape ${url}:`, pageError.message);
    }
  }
  
  return scrapedPages;
}

function convertHtmlToMarkdown(html: string): string {
  let markdown = html;
  
  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  
  // Paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
  });
  
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
    let counter = 1;
    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
  });
  
  // Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Strong/Bold
  markdown = markdown.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  
  // Emphasis/Italic
  markdown = markdown.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Clean up whitespace
  markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
  markdown = markdown.replace(/^\s+|\s+$/g, '');
  
  return markdown;
}

function extractDocumentLinks(html: string, baseUrl: string): string[] {
  const documents: string[] = [];
  const docPatterns = [
    /href="([^"]*\.pdf[^"]*)"/gi,
    /href="([^"]*\.docx?[^"]*)"/gi,
    /href="([^"]*\.xlsx?[^"]*)"/gi,
    /href="([^"]*\.zip[^"]*)"/gi,
    /href="([^"]*\.rar[^"]*)"/gi
  ];
  
  for (const pattern of docPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const href = match[1];
      if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
        const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
        documents.push(fullUrl);
      }
    }
  }
  
  return Array.from(new Set(documents)); // Remove duplicates
}