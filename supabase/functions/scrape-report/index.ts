import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Report generation service
class ReportService {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async generateReport(runId: string, format: string = 'json') {
    console.log(`📊 Generating report for run: ${runId}`);

    // Get KPIs using our database function
    const { data: kpis, error: kpiError } = await this.supabase.rpc('scrape_run_kpis', { p_run_id: runId });
    
    if (kpiError) {
      console.error('KPI Error:', kpiError);
      throw new Error(`Failed to fetch KPIs: ${kpiError.message}`);
    }

    // Get top errors breakdown
    const { data: topErrors, error: errorError } = await this.supabase
      .from('document_extractions')
      .select('error_type, count:id')
      .eq('run_id', runId)
      .not('error_type', 'is', null)
      .group('error_type')
      .order('count', { ascending: false })
      .limit(10);

    if (errorError) {
      console.error('Error breakdown error:', errorError);
    }

    // Get worst performing samples (highest latency and failures)
    const { data: worstSamples, error: samplesError } = await this.supabase
      .from('document_extractions')
      .select(`
        id,
        status,
        error_type,
        error_message,
        latency_ms,
        ocr_used,
        pages_processed,
        model_used,
        extracted_data
      `)
      .eq('run_id', runId)
      .order('latency_ms', { ascending: false })
      .limit(20);

    if (samplesError) {
      console.error('Samples error:', samplesError);
    }

    // Get queue status
    const { data: queueStatus, error: queueError } = await this.supabase
      .from('extraction_queue')
      .select('status, count:id')
      .eq('run_id', runId)
      .group('status');

    if (queueError) {
      console.error('Queue status error:', queueError);
    }

    // Get crawl events summary
    const { data: crawlSummary, error: crawlError } = await this.supabase
      .from('crawl_events')
      .select('status, pages_found, documents_found, response_time_ms')
      .eq('run_id', runId);

    if (crawlError) {
      console.error('Crawl summary error:', crawlError);
    }

    // Get run metadata
    const { data: runInfo, error: runError } = await this.supabase
      .from('scrape_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError) {
      console.error('Run info error:', runError);
    }

    const report = {
      runId,
      runInfo: runInfo || {},
      kpis: kpis?.[0] || {},
      topErrors: topErrors || [],
      worstSamples: worstSamples || [],
      queueStatus: queueStatus || [],
      crawlSummary: {
        totalEvents: crawlSummary?.length || 0,
        totalPagesFound: crawlSummary?.reduce((sum, event) => sum + (event.pages_found || 0), 0) || 0,
        totalDocsFound: crawlSummary?.reduce((sum, event) => sum + (event.documents_found || 0), 0) || 0,
        avgResponseTime: crawlSummary?.length > 0 
          ? crawlSummary.reduce((sum, event) => sum + (event.response_time_ms || 0), 0) / crawlSummary.length 
          : 0
      },
      generatedAt: new Date().toISOString()
    };

    if (format === 'csv') {
      return this.generateCSV(report);
    }

    return report;
  }

  private generateCSV(report: any): string {
    const csvRows = [];
    
    // Header
    csvRows.push('Section,Metric,Value');
    
    // KPIs
    const kpis = report.kpis;
    csvRows.push(`KPIs,Total Documents,${kpis.docs_total || 0}`);
    csvRows.push(`KPIs,Successful Documents,${kpis.docs_ok || 0}`);
    csvRows.push(`KPIs,Failed Documents,${kpis.docs_fail || 0}`);
    csvRows.push(`KPIs,Pending Documents,${kpis.docs_pending || 0}`);
    csvRows.push(`KPIs,OCR Usage Rate,${(kpis.ocr_rate * 100).toFixed(2)}%`);
    csvRows.push(`KPIs,Average Latency (ms),${kpis.avg_latency || 0}`);
    csvRows.push(`KPIs,Subsidies Parsed,${kpis.subsidies_parsed || 0}`);
    csvRows.push(`KPIs,Pages Crawled,${kpis.pages_crawled || 0}`);
    csvRows.push(`KPIs,Error Rate,${(kpis.error_rate * 100).toFixed(2)}%`);
    csvRows.push(`KPIs,Completion Rate,${(kpis.completion_rate * 100).toFixed(2)}%`);
    
    // Top Errors
    csvRows.push(''); // Empty row for separation
    csvRows.push('Error Type,Count');
    report.topErrors.forEach((error: any) => {
      csvRows.push(`${error.error_type || 'Unknown'},${error.count || 0}`);
    });
    
    return csvRows.join('\n');
  }

  async getRunsList(limit: number = 50) {
    const { data: runs, error } = await this.supabase
      .from('scrape_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch runs: ${error.message}`);
    }

    return runs || [];
  }

  async retryFailedDocument(extractionId: string) {
    // Get the extraction details
    const { data: extraction, error: fetchError } = await this.supabase
      .from('document_extractions')
      .select('*')
      .eq('id', extractionId)
      .single();

    if (fetchError || !extraction) {
      throw new Error('Extraction not found');
    }

    // Add back to queue for retry
    const { error: insertError } = await this.supabase
      .from('extraction_queue')
      .insert({
        run_id: extraction.run_id,
        document_url: extraction.extracted_data?.metadata?.source_url,
        document_type: extraction.extracted_data?.metadata?.document_type || 'subsidy',
        priority: 9, // High priority for retries
        metadata: {
          retry_of: extractionId,
          original_error: extraction.error_message
        }
      });

    if (insertError) {
      throw new Error(`Failed to queue retry: ${insertError.message}`);
    }

    return { success: true, message: 'Document queued for retry' };
  }
}

// Main edge function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'report';
    const runId = url.searchParams.get('run_id');
    const format = url.searchParams.get('format') || 'json';

    const reportService = new ReportService(supabase);

    if (action === 'report') {
      if (!runId) {
        throw new Error('run_id parameter required');
      }

      const report = await reportService.generateReport(runId, format);

      if (format === 'csv') {
        return new Response(report, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="scrape-report-${runId}.csv"`
          }
        });
      }

      return new Response(JSON.stringify(report), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'runs') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const runs = await reportService.getRunsList(limit);

      return new Response(JSON.stringify({
        success: true,
        runs,
        total: runs.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'retry' && req.method === 'POST') {
      const body = await req.json();
      const { extractionId } = body;

      if (!extractionId) {
        throw new Error('extractionId required');
      }

      const result = await reportService.retryFailedDocument(extractionId);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'health') {
      // Quick health check
      const { data, error } = await supabase
        .from('scrape_runs')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('❌ Error in scrape-report:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});