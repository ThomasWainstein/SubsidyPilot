import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchHTML, stripToText, canonicalize, looksLikeSubsidyUrl, looksLikeAdminUrl, logEvent, type FetchStat } from '../lib/harvest.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// Feature flags from Group 1
const ENFORCE_DB_INSERT_SUCCESS = Deno.env.get('ENFORCE_DB_INSERT_SUCCESS') !== 'false';
const ENABLE_STRUCTURED_LOGS = Deno.env.get('ENABLE_STRUCTURED_LOGS') !== 'false';

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
    
    const { action = 'scrape', max_pages = 12, run_id, sources = ['apia', 'afir'] } = requestBody;

    if (ENABLE_STRUCTURED_LOGS) {
      logEvent('harvester.ro.start', run_id, { action, max_pages, sources });
    }

    if (action === 'scrape') {
      const session_id = `romania-${Date.now()}`;
      
      // Seed discovery pages (not final targets)
      const apiaSeedUrls = [
        'https://apia.org.ro',
        'https://apia.org.ro/scheme-de-sprijin',
        'https://apia.org.ro/plati-directe'
      ];
      
      const afirSeedUrls = [
        'https://portal.afir.info/pndr-2014-2020-situatia-masurilor',
        'https://portal.afir.info/pnrr-componenta-1-solutii-moderne-pentru-digitalizarea-si-cresterea-competitivitatii-economiei',
        'https://www.madr.ro/afir'
      ];
      
      const allFetches: FetchStat[] = [];
      const candidateUrls = new Set<string>();
      
      // Step 1: Discover candidates from seed pages
      const seedUrls = [
        ...(sources.includes('apia') ? apiaSeedUrls : []),
        ...(sources.includes('afir') ? afirSeedUrls : [])
      ];
      
      for (const seedUrl of seedUrls) {
        logEvent('harvester.ro.discover.fetch.start', run_id, { url: seedUrl });
        const { html, stat } = await fetchHTML(seedUrl);
        allFetches.push(stat);
        logEvent('harvester.ro.discover.fetch.done', run_id, stat);
        
        if (stat.ok) {
          // Extract links with anchor text containing subsidy keywords
          const linkPattern = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
          let match;
          while ((match = linkPattern.exec(html)) !== null) {
            const href = match[1];
            const anchorText = match[2] || '';
            const fullUrl = canonicalize(seedUrl, href);
            
            if (fullUrl && 
                looksLikeSubsidyUrl(fullUrl, 'ro') && 
                !looksLikeAdminUrl(fullUrl, 'ro') &&
                fullUrl.includes('.ro') &&
                (anchorText.toLowerCase().includes('sprijin') || 
                 anchorText.toLowerCase().includes('măsur') ||
                 anchorText.toLowerCase().includes('apel') ||
                 anchorText.toLowerCase().includes('ghid'))) {
              candidateUrls.add(fullUrl);
              logEvent('harvester.ro.candidate.link', run_id, { url: fullUrl, anchor_text: anchorText });
            }
          }
        }
      }
      
      // Step 2: Add some known good subsidy URLs
      const knownSubsidyUrls = [
        'https://apia.org.ro/scheme-de-sprijin-cuplat',
        'https://apia.org.ro/schema-de-plati-pe-suprafata-saps',
        'https://portal.afir.info/submeasure/19.2',
        'https://portal.afir.info/submeasure/4.1'
      ];
      
      knownSubsidyUrls.forEach(url => {
        candidateUrls.add(url);
        logEvent('harvester.ro.candidate.link', run_id, { url, source: 'known_subsidy' });
      });

      // Step 3: Fetch and filter candidates
      const insertedIds: string[] = [];
      let pagesInsertedDb = 0;
      
      for (const candidateUrl of Array.from(candidateUrls).slice(0, max_pages)) {
        logEvent('harvester.ro.page.fetch.start', run_id, { url: candidateUrl });
        const { html, stat } = await fetchHTML(candidateUrl);
        allFetches.push(stat);
        logEvent('harvester.ro.page.fetch.done', run_id, stat);
        
        if (!stat.ok) continue;
        
        const textMarkdown = stripToText(html);
        
        // Eligibility gate
        if (textMarkdown.length < 1000) {
          logEvent('harvester.ro.page.skip.reason', run_id, { url: candidateUrl, reason: 'too_short', length: textMarkdown.length });
          continue;
        }
        
        if (looksLikeAdminUrl(candidateUrl, 'ro')) {
          logEvent('harvester.ro.page.skip.reason', run_id, { url: candidateUrl, reason: 'admin_like' });
          continue;
        }
        
        // Check for subsidy content signals in text
        const subsidySignals = /(sprijin|m[ăa]sur[ăa]|apel|grant|eligibilitate|ghidul|subm[ăa]sur[ăa]|PNDR|PNRR)/i;
        if (!subsidySignals.test(textMarkdown)) {
          logEvent('harvester.ro.page.skip.reason', run_id, { url: candidateUrl, reason: 'no_subsidy_signals' });
          continue;
        }
        
        // Determine source site based on URL
        const sourceSite = candidateUrl.includes('apia.org.ro') ? 'apia-romania' : 'afir-romania';
        
        // Insert into raw_scraped_pages
        const pageData = {
          run_id,
          source_site: sourceSite,
          source_url: candidateUrl,
          raw_html: html,
          raw_text: textMarkdown,
          text_markdown: textMarkdown,
          status: 'scraped'
        };
        
        try {
          const { data, error } = await supabase
            .from('raw_scraped_pages')
            .insert(pageData)
            .select('id')
            .single();
          
          if (error) {
            if (error.code === '23505') {
              logEvent('harvester.ro.page.skip.reason', run_id, { url: candidateUrl, reason: 'duplicate' });
            } else {
              logEvent('harvester.ro.insert.error', run_id, { url: candidateUrl, error: error.message });
            }
          } else {
            insertedIds.push(data.id);
            pagesInsertedDb++;
            logEvent('harvester.ro.insert.success', run_id, { url: candidateUrl, id: data.id, source_site: sourceSite });
          }
        } catch (insertErr) {
          logEvent('harvester.ro.insert.error', run_id, { url: candidateUrl, error: (insertErr as Error).message });
        }
        
        // Respectful delay
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Orphan sweep
      let patchedCount = 0;
      try {
        const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: patchedRows } = await supabase
          .from('raw_scraped_pages')
          .update({ run_id })
          .is('run_id', null)
          .in('source_site', ['apia-romania', 'afir-romania'])
          .gte('created_at', windowStart)
          .select('id');
        patchedCount = patchedRows?.length || 0;
        if (patchedCount > 0) logEvent('harvester.ro.orphans.patched', run_id, { patchedCount });
      } catch (patchErr) {
        logEvent('harvester.ro.orphans.error', run_id, { error: (patchErr as Error).message });
      }

      const finalInsertedDb = pagesInsertedDb + patchedCount;
      logEvent('harvester.ro.insert', run_id, { 
        pages_scraped_returned: candidateUrls.size, 
        pages_inserted_db: finalInsertedDb, 
        inserted_ids: insertedIds 
      });

      return new Response(JSON.stringify({
        success: true,
        session_id,
        pages_scraped_returned: candidateUrls.size,
        pages_inserted_db: finalInsertedDb,
        inserted_ids: insertedIds,
        source_site: sources.includes('apia') && sources.includes('afir') ? 'romania-combined' : (sources.includes('apia') ? 'apia-romania' : 'afir-romania'),
        probe: { fetches: allFetches }
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

// All functions removed and replaced by Group 2 streamlined implementation