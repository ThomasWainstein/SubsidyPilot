import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(part => part);
    const documentId = pathParts[pathParts.length - 2]; // documents/:id/action
    const action = pathParts[pathParts.length - 1];

    console.log(`📡 Document Status API: ${req.method} ${url.pathname}`);
    console.log(`📋 Document ID: ${documentId}, Action: ${action}`);

    if (!documentId || !['retry', 'status'].includes(action)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid endpoint',
        expected: '/documents/:id/retry or /documents/:id/status' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enhanced auth handling with better error messages
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return new Response(JSON.stringify({ 
        error: 'Authorization required',
        details: 'Please provide a valid Bearer token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Set auth context safely
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ 
        error: 'Invalid token format' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create authenticated supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Set user context for RLS
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`👤 Authenticated user: ${user.id}`);

    // Route to appropriate handler
    if (req.method === 'POST' && action === 'retry') {
      return await handleRetry(supabaseClient, documentId, user.id);
    } else if (req.method === 'GET' && action === 'status') {
      return await handleGetStatus(supabaseClient, documentId, user.id);
    }

    return new Response(JSON.stringify({ 
      error: 'Invalid endpoint',
      method: req.method,
      action: action,
      allowed: 'POST /retry or GET /status'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🚨 API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleRetry(supabaseClient: any, documentId: string, userId: string) {
  console.log(`🔄 Processing retry request for document: ${documentId} by user: ${userId}`);

  try {
    // Get document with user validation via RLS
    const { data: document, error: docError } = await supabaseClient
      .from('farm_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('❌ Document not found or access denied:', docError);
      return new Response(JSON.stringify({ 
        error: 'Document not found or access denied',
        documentId 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get latest extraction or create if doesn't exist
    let { data: extraction, error: extractionError } = await supabaseClient
      .from('document_extractions')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (extractionError) {
      console.error('❌ Error fetching extraction:', extractionError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch extraction status',
        details: extractionError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if retry is allowed
    if (extraction && extraction.current_retry >= extraction.max_retries) {
      return new Response(JSON.stringify({ 
        error: 'Maximum retries exceeded',
        maxRetries: extraction.max_retries,
        currentRetries: extraction.current_retry
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if extraction is already in progress
    if (extraction && ['uploading', 'virus_scan', 'extracting', 'ocr', 'ai'].includes(extraction.status_v2)) {
      return new Response(JSON.stringify({ 
        error: 'Extraction already in progress',
        status: extraction.status_v2
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate backoff delay with jitter
    const baseDelay = Math.min(300 * Math.pow(2, extraction?.current_retry || 0), 3600); // Max 1 hour
    const jitter = Math.random() * 30; // Add up to 30 seconds jitter
    const delaySeconds = Math.floor(baseDelay + jitter);

    // Increment retry count and update status
    const { error: retryError } = await supabaseClient.rpc('increment_retry_count', {
      p_extraction_id: extraction?.id,
      p_backoff_seconds: delaySeconds
    });

    if (retryError) {
      console.error('Error incrementing retry count:', retryError);
      return new Response(JSON.stringify({ error: 'Failed to schedule retry' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Reset extraction status to start fresh
    const { error: statusError } = await supabaseClient.rpc('update_extraction_status', {
      p_extraction_id: extraction?.id,
      p_status: 'uploading',
      p_failure_code: null,
      p_failure_detail: null,
      p_progress_metadata: { retry_initiated_at: new Date().toISOString() }
    });

    if (statusError) {
      console.error('Error updating status:', statusError);
    }

    // Trigger extraction with same idempotency key
    const { error: triggerError } = await supabaseClient.functions.invoke('extract-document-data', {
      body: {
        documentId,
        retryAttempt: (extraction?.current_retry || 0) + 1,
        idempotencyKey: extraction?.idempotency_key || `retry-${documentId}-${Date.now()}`
      }
    });

    if (triggerError) {
      console.error('Error triggering extraction:', triggerError);
      return new Response(JSON.stringify({ error: 'Failed to trigger extraction retry' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Retry scheduled for document ${documentId} with ${delaySeconds}s delay`);

    return new Response(JSON.stringify({
      success: true,
      documentId,
      retryAttempt: (extraction?.current_retry || 0) + 1,
      maxRetries: extraction?.max_retries || 3,
      nextRetryAt: new Date(Date.now() + delaySeconds * 1000).toISOString(),
      delaySeconds
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🚨 Retry Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetStatus(supabaseClient: any, documentId: string) {
  console.log(`📊 Getting status for document: ${documentId}`);

  // Get document details
  const { data: document, error: docError } = await supabaseClient
    .from('farm_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    return new Response(JSON.stringify({ error: 'Document not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get latest extraction status
  const { data: extraction, error: extractionError } = await supabaseClient
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (extractionError) {
    console.error('Error fetching extraction:', extractionError);
    return new Response(JSON.stringify({ error: 'Failed to fetch extraction status' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get extraction metrics
  const { data: metrics, error: metricsError } = await supabaseClient
    .from('extraction_metrics')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (metricsError) {
    console.error('Error fetching metrics:', metricsError);
  }

  // Calculate progress percentage
  const progress = calculateProgress(extraction, metrics || []);

  // Determine if retry is available
  const retryable = extraction && 
    extraction.status_v2 === 'failed' && 
    extraction.current_retry < extraction.max_retries &&
    (!extraction.next_retry_at || new Date(extraction.next_retry_at) <= new Date());

  const response = {
    documentId,
    document: {
      filename: document.file_name,
      size: document.file_size,
      mimeType: document.mime_type,
      uploadedAt: document.uploaded_at
    },
    extraction: extraction ? {
      id: extraction.id,
      status: extraction.status_v2,
      step: getStepFromStatus(extraction.status_v2),
      progress: progress.percentage,
      progressDetails: progress.details,
      confidence: extraction.confidence_score,
      lastEventAt: extraction.last_event_at,
      failureCode: extraction.failure_code,
      failureDetail: extraction.failure_detail,
      currentRetry: extraction.current_retry,
      maxRetries: extraction.max_retries,
      nextRetryAt: extraction.next_retry_at,
      tableCount: extraction.table_count || 0,
      processingTimeMs: extraction.processing_time_ms
    } : null,
    retryable,
    metrics: formatMetrics(metrics || []),
    lastUpdated: new Date().toISOString()
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function calculateProgress(extraction: any, metrics: any[]): { percentage: number; details: any } {
  if (!extraction) {
    return { percentage: 0, details: { step: 'pending' } };
  }

  const statusProgress = {
    'uploading': 10,
    'virus_scan': 20,
    'extracting': 40,
    'ocr': 60,
    'ai': 80,
    'completed': 100,
    'failed': 0
  };

  let baseProgress = statusProgress[extraction.status_v2] || 0;

  // Add micro-progress from metadata
  const progressMeta = extraction.progress_metadata || {};
  if (progressMeta.pages_processed && progressMeta.total_pages) {
    const pageProgress = (progressMeta.pages_processed / progressMeta.total_pages) * 20;
    baseProgress = Math.min(baseProgress + pageProgress, 95); // Cap at 95% until complete
  }

  return {
    percentage: Math.round(baseProgress),
    details: {
      step: getStepFromStatus(extraction.status_v2),
      pagesProcessed: progressMeta.pages_processed,
      totalPages: progressMeta.total_pages,
      currentOperation: progressMeta.current_operation
    }
  };
}

function getStepFromStatus(status: string): string {
  const stepMap = {
    'uploading': 'Uploading',
    'virus_scan': 'Virus Scanning',
    'extracting': 'Text Extraction',
    'ocr': 'OCR Processing',
    'ai': 'AI Analysis',
    'completed': 'Complete',
    'failed': 'Failed'
  };
  return stepMap[status] || 'Unknown';
}

function formatMetrics(metrics: any[]): any {
  const summary = {
    totalOperations: metrics.length,
    avgDuration: 0,
    successRate: 0,
    operationBreakdown: {} as Record<string, number>
  };

  if (metrics.length === 0) return summary;

  let totalDuration = 0;
  let successCount = 0;

  metrics.forEach(metric => {
    if (metric.duration_ms) {
      totalDuration += metric.duration_ms;
    }
    if (metric.success) {
      successCount++;
    }
    summary.operationBreakdown[metric.operation_type] = 
      (summary.operationBreakdown[metric.operation_type] || 0) + 1;
  });

  summary.avgDuration = Math.round(totalDuration / metrics.length);
  summary.successRate = Math.round((successCount / metrics.length) * 100);

  return summary;
}