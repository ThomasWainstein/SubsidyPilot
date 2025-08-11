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

// === FranceAgriMer URL helpers (detail vs hub/listing) ===
const FR_DETAIL_RE =
  /^https?:\/\/(www\.)?franceagrimer\.fr\/aides\/(?!par-|rechercher-une-aide)([^?#]+)$/i;
const FR_HUB_RE = /\/aides\/par-|\/rechercher-une-aide/i;

function canonicalAidUrl(baseUrl: string, href: string): string | null {
  try {
    const u = new URL(href, baseUrl);
    // normalize: strip hash & tracking
    u.hash = '';
    u.searchParams.forEach((_, k) => {
      if (k.toLowerCase().startsWith('utm_')) u.searchParams.delete(k);
    });
    const s = decodeURI(u.toString());
    if (FR_HUB_RE.test(s)) return null;          // hub/listing
    if (!FR_DETAIL_RE.test(s)) return null;      // not a detail fiche
    return s;
  } catch {
    return null;
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
    
    const { action = 'scrape', max_pages = 10, run_id, mode = 'list+direct' } = requestBody;

    if (ENABLE_STRUCTURED_LOGS) {
      logEvent('harvester.fr.start', run_id, { action, max_pages, mode });
    }

    if (action === 'scrape') {
      const session_id = `franceagrimer-${Date.now()}`;
      
      // Discovery set: List pages + optional direct seeds
let listUrls = Array.from({ length: Math.max(1, Math.min(10, max_pages)) }, (_, i) =>
        `https://www.franceagrimer.fr/rechercher-une-aide?page=${i}`
      );
const seenListUrls = new Set<string>(listUrls);
      
      const directSeeds = [
        'https://www.franceagrimer.fr/aides/dispositif-dassurance-recolte-fruits-2024',
        'https://www.franceagrimer.fr/aides/aide-au-stockage-prive-de-viande-bovine-2024',
        'https://www.franceagrimer.fr/aides/aide-exceptionnelle-aux-apiculteurs-2024'
      ];

const allFetches: FetchStat[] = [];
const candidateUrls = new Set<string>();
// Preload recent existing URLs to avoid re-scraping duplicates
let existingSet = new Set<string>();
try {
  const { data: existing } = await supabase
    .from('raw_scraped_pages')
    .select('source_url')
    .eq('source_site', 'franceagrimer')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
  existingSet = new Set((existing ?? []).map((r: { source_url: string }) => r.source_url));
} catch (_) {
  // non-fatal
}

// Step 1: Discover candidates from list pages (with in-run pagination)
for (let idx = 0; idx < listUrls.length && idx < max_pages; idx++) {
  const listUrl = listUrls[idx];
  logEvent('harvester.fr.list.fetch.start', run_id, { url: listUrl });
  const { html, stat } = await fetchHTML(listUrl);
  allFetches.push(stat);
  logEvent('harvester.fr.list.fetch.done', run_id, stat);
  
  if (stat.ok) {
    // Extract links and keep only fiche detail pages
    const linkPattern = /href="([^"]*\/aides?\/[^\
    let match;
    while ((match = linkPattern.exec(html)) !== null) {
      const full = canonicalAidUrl(listUrl, match[1]);
      if (!full) continue; // drops hubs/listings and non-detail
      if (!existingSet.has(full)) {
        candidateUrls.add(full);
        logEvent('harvester.fr.candidate.link', run_id, { url: full });
      } else {
        logEvent('harvester.fr.candidate.skip', run_id, { url: full, reason: 'duplicate_existing' });
      }
    }

    // Simple pagination discovery for /rechercher-une-aide
    const nextRel = html.match(/<a[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<a[^>]+aria-label=["']Page suivante["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/href=["']([^"']*rechercher-une-aide[^"']*page=\d+[^"']*)["']/i);
    if (nextRel) {
      const nextUrl = canonicalize(listUrl, nextRel[1]);
      if (nextUrl && !seenListUrls.has(nextUrl) && listUrls.length < max_pages) {
        listUrls.push(nextUrl);
        seenListUrls.add(nextUrl);
        logEvent('harvester.fr.pagination', run_id, { next: nextUrl });
      }
    }
  }
}

// Add direct seeds to candidates (skip if seen)
for (const url of directSeeds) {
  if (!existingSet.has(url)) {
    candidateUrls.add(url);
    logEvent('harvester.fr.candidate.link', run_id, { url, source: 'direct_seed' });
  } else {
    logEvent('harvester.fr.candidate.skip', run_id, { url, source: 'direct_seed', reason: 'duplicate_existing' });
  }
}

      // Step 2: Fetch and filter candidates
      const insertedIds: string[] = [];
      let pagesInsertedDb = 0;
      
      for (const candidateUrl of Array.from(candidateUrls).slice(0, max_pages)) {
        logEvent('harvester.fr.page.fetch.start', run_id, { url: candidateUrl });
        const { html, stat } = await fetchHTML(candidateUrl);
        allFetches.push(stat);
        logEvent('harvester.fr.page.fetch.done', run_id, stat);
        
        if (!stat.ok) continue;
        
const textMarkdown = stripToText(html);

        // Enforce detail page URL pattern (avoid hubs/listings)
        const isDetailUrl = FR_DETAIL_RE.test(candidateUrl);
        if (!isDetailUrl) {
          logEvent('harvester.fr.page.skip.reason', run_id, { url: candidateUrl, reason: 'hub_or_listing' });
          continue;
        }
        
        // Eligibility gate (lower threshold; some fiches are concise)
        if (textMarkdown.length < 400) {
          logEvent('harvester.fr.page.skip.reason', run_id, { url: candidateUrl, reason: 'too_short', length: textMarkdown.length });
          continue;
        }
        
        if (looksLikeAdminUrl(candidateUrl, 'fr')) {
          logEvent('harvester.fr.page.skip.reason', run_id, { url: candidateUrl, reason: 'admin_like' });
          continue;
        }
        
        if (!looksLikeSubsidyUrl(candidateUrl, 'fr')) {
          logEvent('harvester.fr.page.skip.reason', run_id, { url: candidateUrl, reason: 'not_subsidy' });
          continue;
        }
        
        // Heuristic markers for "fiche aide" content
        const ficheMarkers = /Éligibilit|Bénéficiair|Montant|Calendrier|Date limite|D[ée]p[oô]t|Pi[eè]ces\s+à\s+fournir|T[ée]l[ée]charger/i;
        if (!ficheMarkers.test(textMarkdown)) {
          logEvent('harvester.fr.page.skip.reason', run_id, { url: candidateUrl, reason: 'not_fiche_page' });
          continue;
        }
        
        // Insert into raw_scraped_pages
        const pageData = {
          run_id,
          source_site: 'franceagrimer',
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
              logEvent('harvester.fr.page.skip.reason', run_id, { url: candidateUrl, reason: 'duplicate' });
            } else {
              logEvent('harvester.fr.insert.error', run_id, { url: candidateUrl, error: error.message });
            }
          } else {
            insertedIds.push(data.id);
            pagesInsertedDb++;
            logEvent('harvester.fr.insert.success', run_id, { url: candidateUrl, id: data.id });
          }
        } catch (insertErr) {
          logEvent('harvester.fr.insert.error', run_id, { url: candidateUrl, error: (insertErr as Error).message });
        }
        
        // Respectful delay
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Orphan sweep
      let patchedCount = 0;
      try {
        const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: patchedRows } = await supabase
          .from('raw_scraped_pages')
          .update({ run_id })
          .is('run_id', null)
          .eq('source_site', 'franceagrimer')
          .gte('created_at', windowStart)
          .select('id');
        patchedCount = patchedRows?.length || 0;
        if (patchedCount > 0) logEvent('harvester.fr.orphans.patched', run_id, { patchedCount });
      } catch (patchErr) {
        logEvent('harvester.fr.orphans.error', run_id, { error: (patchErr as Error).message });
      }

      const finalInsertedDb = pagesInsertedDb + patchedCount;
      
      // Determine success based on actual pages inserted
      const harvestSuccess = finalInsertedDb > 0;
      let failureReason = null;
      
      if (!harvestSuccess) {
        // Analyze failure reason for better observability
        const totalFetches = allFetches.length;
        const successfulFetches = allFetches.filter(f => f.ok).length;
        const totalCandidates = candidateUrls.size;
        
        if (successfulFetches === 0) {
          failureReason = 'NETWORK_FAILURE';
        } else if (totalCandidates === 0) {
          failureReason = 'SELECTOR_MISS';
        } else if (candidateUrls.size > 0 && finalInsertedDb === 0) {
          failureReason = 'CONTENT_TOO_SMALL_OR_DB_FAIL';
        } else {
          failureReason = 'UNKNOWN';
        }
        
        logEvent('harvester.fr.failure', run_id, { 
          reason: failureReason,
          total_fetches: totalFetches,
          successful_fetches: successfulFetches,
          candidates_found: totalCandidates,
          pages_inserted: finalInsertedDb
        });
      }
      
      logEvent('harvester.fr.insert', run_id, { 
        pages_scraped_returned: candidateUrls.size, 
        pages_inserted_db: finalInsertedDb, 
        inserted_ids: insertedIds,
        success: harvestSuccess,
        failure_reason: failureReason
      });

      return new Response(JSON.stringify({
        success: harvestSuccess,
        session_id,
        pages_scraped_returned: candidateUrls.size,
        pages_inserted_db: finalInsertedDb,
        inserted_ids: insertedIds,
        source_site: 'franceagrimer',
        failure_reason: failureReason,
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

// All functions removed and replaced by Group 2 streamlined implementation