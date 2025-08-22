import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action = 'scrape', max_pages = 15, run_id, programs = ['pocu', 'poc', 'por'] } = await req.json();
    
    console.log('🇷🇴 POCU/POC/POR Scraper started', { action, max_pages, programs, run_id });

    if (action === 'scrape') {
      const session_id = `romanian-eu-programs-${Date.now()}`;
      const allPages: any[] = [];
      
      // Define program-specific URLs
      const programUrls = {
        pocu: [
          'https://mfe.gov.ro/presa/comunicate-de-presa/pocu/',
          'https://www.fonduri-ue.ro/pocu-2014',
          'https://www.fondurieuropene.ro/programe/3/programul-operational-capital-uman-pocu-2014-2020'
        ],
        poc: [
          'https://mfe.gov.ro/presa/comunicate-de-presa/poc/',
          'https://www.fonduri-ue.ro/poc-2014',
          'https://www.fondurieuropene.ro/programe/1/programul-operational-competitivitate-poc-2014-2020'
        ],
        por: [
          'https://mfe.gov.ro/presa/comunicate-de-presa/por/',
          'https://www.fonduri-ue.ro/por-2014',
          'https://www.fondurieuropene.ro/programe/7/programul-operational-regional-por-2014-2020'
        ]
      };

      // Scrape each selected program
      for (const program of programs) {
        if (!programUrls[program as keyof typeof programUrls]) continue;
        
        console.log(`📥 Scraping ${program.toUpperCase()} program...`);
        const urls = programUrls[program as keyof typeof programUrls];
        
        for (const url of urls.slice(0, Math.ceil(max_pages / programs.length))) {
          try {
            console.log(`🔄 Fetching: ${url}`);
            
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ro-RO,ro;q=0.8,en;q=0.6'
              }
            });

            if (!response.ok) {
              console.log(`⚠️ Failed to fetch ${url}: ${response.status}`);
              continue;
            }

            const html = await response.text();
            const textContent = extractTextFromHTML(html);
            
            // Check if page contains relevant funding information
            const fundingKeywords = /(fonduri|finanțare|granturi|apel|ghid|măsur[ăa]|proiect|eligibilitate)/i;
            if (textContent.length < 500 || !fundingKeywords.test(textContent)) {
              console.log(`⏭️ Skipping ${url}: insufficient content or no funding keywords`);
              continue;
            }

            // Store in database
            const pageData = {
              run_id,
              source_site: `${program}-romania`,
              source_url: url,
              raw_html: html,
              raw_text: textContent,
              text_markdown: textContent,
              status: 'scraped',
              additional_data: {
                program: program.toUpperCase(),
                scraped_at: new Date().toISOString(),
                content_language: 'ro'
              }
            };

            const { data, error } = await supabase
              .from('raw_scraped_pages')
              .insert(pageData)
              .select('id')
              .single();

            if (error) {
              if (error.code === '23505') {
                console.log(`🔄 Duplicate page skipped: ${url}`);
              } else {
                console.error(`❌ DB insert error for ${url}:`, error.message);
              }
            } else {
              allPages.push({
                id: data.id,
                url,
                program: program.toUpperCase(),
                content_length: textContent.length
              });
              console.log(`✅ Saved ${program.toUpperCase()} page: ${url}`);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (fetchError) {
            console.error(`❌ Error fetching ${url}:`, fetchError);
          }
        }
      }

      // Discover additional links from scraped pages
      console.log('🔍 Discovering additional links...');
      await discoverAdditionalLinks(supabase, run_id, programs, max_pages - allPages.length);

      return new Response(JSON.stringify({
        success: true,
        session_id,
        programs_scraped: programs,
        pages_scraped: allPages.length,
        pages: allPages,
        run_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ POCU/POC scraper error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function extractTextFromHTML(html: string): string {
  // Remove scripts, styles, and other non-content tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return text;
}

async function discoverAdditionalLinks(
  supabase: any,
  runId: string,
  programs: string[],
  remainingSlots: number
): Promise<void> {
  if (remainingSlots <= 0) return;

  // Get recently scraped pages to extract links from
  const { data: recentPages } = await supabase
    .from('raw_scraped_pages')
    .select('raw_html, source_url')
    .eq('run_id', runId)
    .limit(5);

  const discoveredUrls = new Set<string>();
  
  for (const page of recentPages || []) {
    const linkPattern = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    let match;
    
    while ((match = linkPattern.exec(page.raw_html)) !== null) {
      const href = match[1];
      const anchorText = match[2] || '';
      
      // Look for funding-related links
      if (anchorText.toLowerCase().match(/(apel|ghid|măsur[ăa]|proiect|fond|finanțare)/i) &&
          href.includes('.ro') &&
          !href.includes('#') &&
          discoveredUrls.size < remainingSlots) {
        
        const fullUrl = href.startsWith('http') ? href : new URL(href, page.source_url).toString();
        discoveredUrls.add(fullUrl);
      }
    }
  }

  // Scrape discovered URLs
  for (const url of Array.from(discoveredUrls).slice(0, remainingSlots)) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const html = await response.text();
        const textContent = extractTextFromHTML(html);
        
        if (textContent.length > 800) {
          const program = determineProgram(url, textContent);
          
          await supabase
            .from('raw_scraped_pages')
            .insert({
              run_id: runId,
              source_site: `${program}-romania-discovered`,
              source_url: url,
              raw_html: html,
              raw_text: textContent,
              text_markdown: textContent,
              status: 'scraped',
              additional_data: {
                discovered: true,
                program: program,
                scraped_at: new Date().toISOString()
              }
            });
          
          console.log(`🔍 Discovered and scraped: ${url}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.log(`⚠️ Failed to scrape discovered URL ${url}:`, error);
    }
  }
}

function determineProgram(url: string, content: string): string {
  if (url.includes('pocu') || content.toLowerCase().includes('capital uman')) {
    return 'POCU';
  } else if (url.includes('poc') || content.toLowerCase().includes('competitivitate')) {
    return 'POC';
  } else if (url.includes('por') || content.toLowerCase().includes('regional')) {
    return 'POR';
  }
  return 'UNKNOWN';
}