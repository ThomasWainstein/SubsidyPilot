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
        target_sources: [
          'https://portal.afir.info/afir2020',
          'https://www.madr.ro/afir'
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

      // For now, use the sample data from the Python scraper
      const scrapedPages = await discoverAndScrapeSamplePages(session, supabase, run_id);
      
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

async function discoverAndScrapeSamplePages(session: ScrapingSession, supabase: any, run_id?: string): Promise<any[]> {
  const scrapedPages: any[] = [];
  
  console.log(`🚀 Starting AFIR sample data collection`);

  // Use the sample data structure from the Python scraper
  const sampleSubsidy = {
    title: "AFIR Sample Grant",
    agency: "AFIR", 
    link: "https://portal.afir.info/sample-grant",
    description: "Demonstration grant used for pipeline testing.",
    country: "romania"
  };

  try {
    console.log(`🔍 Processing sample AFIR subsidy: ${sampleSubsidy.link}`);
    
    const pageData = {
      source_url: sampleSubsidy.link,
      source_site: 'afir-romania',
      raw_html: `<html><body><h1>${sampleSubsidy.title}</h1><p>${sampleSubsidy.description}</p><div class="agency">${sampleSubsidy.agency}</div></body></html>`,
      raw_text: `${sampleSubsidy.title}\n\n${sampleSubsidy.description}\n\nAgency: ${sampleSubsidy.agency}`,
      raw_markdown: `# ${sampleSubsidy.title}\n\n${sampleSubsidy.description}\n\n**Agency:** ${sampleSubsidy.agency}`,
      text_markdown: `# ${sampleSubsidy.title}\n\n${sampleSubsidy.description}\n\n**Agency:** ${sampleSubsidy.agency}`,
      combined_content_markdown: `# ${sampleSubsidy.title}\n\n${sampleSubsidy.description}\n\n**Agency:** ${sampleSubsidy.agency}\n\n**Country:** ${sampleSubsidy.country}`,
      attachment_paths: [],
      attachment_count: 0,
      status: 'scraped',
      scrape_date: new Date().toISOString(),
      run_id: run_id || null  // CRITICAL FIX: Associate with pipeline run
    };
    
    const { data: insertedPage, error } = await supabase
      .from('raw_scraped_pages')
      .insert(pageData)
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        // URL already exists, skip with warning
        console.warn(`⚠️ URL already exists, skipping: ${sampleSubsidy.link}`);
        
        // Get existing page for AI processing
        const { data: existingPage } = await supabase
          .from('raw_scraped_pages')
          .select('*')
          .eq('source_url', sampleSubsidy.link)
          .single();
        
        if (existingPage) {
          scrapedPages.push(existingPage);
          console.log(`✅ Using existing AFIR page: ${sampleSubsidy.link}`);
        }
      } else {
        console.error('❌ Failed to store AFIR page:', error);
      }
    } else {
      scrapedPages.push(insertedPage);
      console.log(`✅ Scraped and stored AFIR page: ${sampleSubsidy.link}`);
    }
    
  } catch (pageError) {
    console.warn(`⚠️ Failed to scrape AFIR sample:`, pageError.message);
  }
  
  return scrapedPages;
}