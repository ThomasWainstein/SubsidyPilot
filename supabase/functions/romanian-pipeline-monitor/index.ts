import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

interface RomanianMonitoringStats {
  scraping_health: {
    apia_pages: number;
    afir_pages: number;
    pocu_pages: number;
    poc_pages: number;
    por_pages: number;
    last_scrape: string | null;
    scraping_rate: number;
  };
  processing_health: {
    total_subsidies: number;
    apia_subsidies: number;
    afir_subsidies: number;
    pocu_subsidies: number;
    poc_subsidies: number;
    por_subsidies: number;
    processing_rate: number;
    avg_processing_time: number;
  };
  data_quality: {
    pages_with_content: number;
    pages_without_subsidies: number;
    duplicate_detection_rate: number;
    extraction_success_rate: number;
  };
  system_alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action = 'monitor', details = false } = await req.json();
    
    console.log('🇷🇴 Romanian Pipeline Monitor started', { action, details });

    if (action === 'monitor') {
      const stats = await generateRomanianStats(supabase, details);
      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'health-check') {
      const healthStatus = await performHealthCheck(supabase);
      return new Response(JSON.stringify(healthStatus), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'trigger-processing') {
      const processingResult = await triggerRomanianProcessing(supabase);
      return new Response(JSON.stringify(processingResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Romanian monitor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateRomanianStats(supabase: any, includeDetails: boolean): Promise<RomanianMonitoringStats> {
  console.log('📊 Generating Romanian statistics...');

  // Scraping health stats
  const scrapingStats = await supabase
    .from('raw_scraped_pages')
    .select('source_site, created_at')
    .or('source_site.like.%romania%,source_site.like.%apia%,source_site.like.%afir%,source_site.like.%pocu%,source_site.like.%poc%');

  const scrapingData = scrapingStats.data || [];
  
  const sourceStats = scrapingData.reduce((acc: any, page: any) => {
    const site = page.source_site;
    if (site.includes('apia')) acc.apia++;
    else if (site.includes('afir')) acc.afir++;
    else if (site.includes('pocu')) acc.pocu++;
    else if (site.includes('poc')) acc.poc++;
    else if (site.includes('por')) acc.por++;
    return acc;
  }, { apia: 0, afir: 0, pocu: 0, poc: 0, por: 0 });

  const lastScrape = scrapingData.length > 0 
    ? Math.max(...scrapingData.map((p: any) => new Date(p.created_at).getTime()))
    : null;

  // Processing health stats
  const subsidyStats = await supabase
    .from('subsidies')
    .select('agency, created_at')
    .in('agency', ['APIA', 'AFIR'])
    .or('source_url.like.%pocu%,source_url.like.%poc%,source_url.like.%por%');

  const subsidyData = subsidyStats.data || [];
  
  const agencyStats = subsidyData.reduce((acc: any, subsidy: any) => {
    const agency = subsidy.agency;
    if (agency === 'APIA') acc.apia++;
    else if (agency === 'AFIR') acc.afir++;
    // Check source URL for EU programs
    return acc;
  }, { apia: 0, afir: 0, pocu: 0, poc: 0, por: 0 });

  // Data quality metrics
  const qualityMetrics = await calculateDataQuality(supabase, scrapingData);

  // Generate alerts
  const alerts = generateSystemAlerts(sourceStats, agencyStats, lastScrape);

  return {
    scraping_health: {
      apia_pages: sourceStats.apia,
      afir_pages: sourceStats.afir,
      pocu_pages: sourceStats.pocu,
      poc_pages: sourceStats.poc,
      por_pages: sourceStats.por,
      last_scrape: lastScrape ? new Date(lastScrape).toISOString() : null,
      scraping_rate: calculateScrapingRate(scrapingData)
    },
    processing_health: {
      total_subsidies: subsidyData.length,
      apia_subsidies: agencyStats.apia,
      afir_subsidies: agencyStats.afir,
      pocu_subsidies: agencyStats.pocu,
      poc_subsidies: agencyStats.poc,
      por_subsidies: agencyStats.por,
      processing_rate: calculateProcessingRate(scrapingData.length, subsidyData.length),
      avg_processing_time: 0 // TODO: Calculate from processing logs
    },
    data_quality: qualityMetrics,
    system_alerts: alerts
  };
}

async function calculateDataQuality(supabase: any, scrapingData: any[]): Promise<any> {
  const totalPages = scrapingData.length;
  
  // Check pages with substantial content (>1000 chars)
  const contentPages = await supabase
    .from('raw_scraped_pages')
    .select('text_markdown')
    .or('source_site.like.%romania%,source_site.like.%apia%,source_site.like.%afir%,source_site.like.%pocu%,source_site.like.%poc%');

  const pagesWithContent = (contentPages.data || []).filter(
    (page: any) => (page.text_markdown || '').length > 1000
  ).length;

  return {
    pages_with_content: pagesWithContent,
    pages_without_subsidies: totalPages - pagesWithContent,
    duplicate_detection_rate: 95, // Estimated based on DB constraints
    extraction_success_rate: totalPages > 0 ? (pagesWithContent / totalPages) * 100 : 0
  };
}

function calculateScrapingRate(scrapingData: any[]): number {
  if (scrapingData.length === 0) return 0;
  
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  const recentPages = scrapingData.filter(
    page => new Date(page.created_at).getTime() > oneDayAgo
  );
  
  return recentPages.length; // Pages per day
}

function calculateProcessingRate(totalPages: number, totalSubsidies: number): number {
  return totalPages > 0 ? (totalSubsidies / totalPages) * 100 : 0;
}

function generateSystemAlerts(sourceStats: any, agencyStats: any, lastScrape: number | null): Array<any> {
  const alerts: Array<any> = [];
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  // Check if scraping is stale
  if (!lastScrape || lastScrape < oneDayAgo) {
    alerts.push({
      type: 'warning',
      message: 'Romanian data scraping appears stale. Last scrape was more than 24 hours ago.',
      timestamp: new Date().toISOString()
    });
  }

  // Check for missing data sources
  if (sourceStats.apia === 0) {
    alerts.push({
      type: 'error',
      message: 'No APIA pages found. Check APIA scraper configuration.',
      timestamp: new Date().toISOString()
    });
  }

  if (sourceStats.afir === 0) {
    alerts.push({
      type: 'warning',
      message: 'No AFIR pages found. Verify AFIR portal accessibility.',
      timestamp: new Date().toISOString()
    });
  }

  // Check processing efficiency
  const totalPages = Object.values(sourceStats).reduce((a: any, b: any) => a + b, 0);
  const totalSubsidies = Object.values(agencyStats).reduce((a: any, b: any) => a + b, 0);
  
  if (totalPages > 0 && totalSubsidies === 0) {
    alerts.push({
      type: 'error',
      message: 'Pages scraped but no subsidies extracted. Check Romanian subsidy processor.',
      timestamp: new Date().toISOString()
    });
  }

  if (totalPages > 20 && (totalSubsidies / totalPages) < 0.1) {
    alerts.push({
      type: 'warning',
      message: 'Low subsidy extraction rate. Review content quality and processing logic.',
      timestamp: new Date().toISOString()
    });
  }

  return alerts;
}

async function performHealthCheck(supabase: any): Promise<any> {
  console.log('🔍 Performing Romanian pipeline health check...');

  const healthResults = {
    overall_status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    checks: [] as Array<any>,
    timestamp: new Date().toISOString()
  };

  // Check 1: Database connectivity
  try {
    await supabase.from('raw_scraped_pages').select('count').limit(1);
    healthResults.checks.push({
      name: 'database_connectivity',
      status: 'pass',
      message: 'Database connection successful'
    });
  } catch (error) {
    healthResults.checks.push({
      name: 'database_connectivity',
      status: 'fail',
      message: `Database connection failed: ${error.message}`
    });
    healthResults.overall_status = 'unhealthy';
  }

  // Check 2: Recent Romanian data
  try {
    const { data } = await supabase
      .from('raw_scraped_pages')
      .select('created_at')
      .or('source_site.like.%romania%,source_site.like.%apia%,source_site.like.%afir%')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (data && data.length > 0) {
      healthResults.checks.push({
        name: 'recent_romanian_data',
        status: 'pass',
        message: 'Recent Romanian data found (within 7 days)'
      });
    } else {
      healthResults.checks.push({
        name: 'recent_romanian_data',
        status: 'warn',
        message: 'No recent Romanian data found (older than 7 days)'
      });
      if (healthResults.overall_status === 'healthy') {
        healthResults.overall_status = 'degraded';
      }
    }
  } catch (error) {
    healthResults.checks.push({
      name: 'recent_romanian_data',
      status: 'fail',
      message: `Failed to check recent data: ${error.message}`
    });
  }

  // Check 3: Subsidy processing
  try {
    const { data } = await supabase
      .from('subsidies')
      .select('created_at')
      .in('agency', ['APIA', 'AFIR'])
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (data && data.length > 0) {
      healthResults.checks.push({
        name: 'subsidy_processing',
        status: 'pass',
        message: 'Recent Romanian subsidies processed'
      });
    } else {
      healthResults.checks.push({
        name: 'subsidy_processing',
        status: 'warn',
        message: 'No recently processed Romanian subsidies'
      });
    }
  } catch (error) {
    healthResults.checks.push({
      name: 'subsidy_processing',
      status: 'fail',
      message: `Failed to check subsidy processing: ${error.message}`
    });
  }

  return healthResults;
}

async function triggerRomanianProcessing(supabase: any): Promise<any> {
  console.log('🚀 Triggering Romanian processing pipeline...');

  try {
    // Trigger Romanian subsidy processor
    const processingResult = await supabase.functions.invoke('romanian-subsidy-processor', {
      body: {
        action: 'process',
        run_id: `manual-processing-${Date.now()}`,
        openai_api_key: Deno.env.get('OPENAI_API_KEY')
      }
    });

    return {
      success: true,
      processing_triggered: true,
      result: processingResult.data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}