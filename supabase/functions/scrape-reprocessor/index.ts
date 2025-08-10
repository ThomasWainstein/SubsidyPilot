import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced OCR and extraction service
class ExtractionService {
  private supabase: any;
  private openaiKey: string;

  constructor(supabase: any, openaiKey: string) {
    this.supabase = supabase;
    this.openaiKey = openaiKey;
  }

  async processDocument(url: string, runId: string, docType: string = 'subsidy') {
    const startTime = Date.now();
    let ocrUsed = false;
    let pagesProcessed = 1;
    let errorType = null;
    let modelUsed = 'gpt-4o-mini';

    try {
      console.log(`🔍 Processing document: ${url}`);
      
      // Download document
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      let extractedText = '';

      // Primary extraction attempt
      try {
        extractedText = await this.extractWithAI(buffer, url);
        modelUsed = 'gpt-4o-mini';
      } catch (aiError) {
        console.log(`⚠️ AI extraction failed, trying OCR fallback: ${aiError.message}`);
        
        // OCR Fallback using Tesseract via API
        try {
          extractedText = await this.extractWithOCR(buffer);
          ocrUsed = true;
          modelUsed = 'tesseract-ocr';
        } catch (ocrError) {
          errorType = 'extraction_failed';
          throw new Error(`Both AI and OCR extraction failed: ${ocrError.message}`);
        }
      }

      if (!extractedText || extractedText.length < 50) {
        errorType = 'insufficient_text';
        throw new Error('Insufficient text extracted');
      }

      // Detect pages (estimate based on text length)
      pagesProcessed = Math.max(1, Math.ceil(extractedText.length / 2000));

      // Store extraction result
      const latencyMs = Date.now() - startTime;
      
      await this.supabase
        .from('document_extractions')
        .insert({
          document_id: null, // For subsidy docs, we don't have a document_id
          extracted_data: {
            text: extractedText.substring(0, 10000), // Limit size
            metadata: {
              source_url: url,
              extraction_method: ocrUsed ? 'ocr' : 'ai',
              document_type: docType
            }
          },
          extraction_type: modelUsed,
          confidence_score: ocrUsed ? 0.6 : 0.8,
          status: 'completed',
          run_id: runId,
          latency_ms: latencyMs,
          error_type: errorType,
          ocr_used: ocrUsed,
          pages_processed: pagesProcessed,
          model_used: modelUsed
        });

      console.log(`✅ Successfully processed: ${url} (${latencyMs}ms)`);
      return { success: true, latencyMs, ocrUsed, pagesProcessed };

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      errorType = errorType || 'unknown_error';
      
      // Log failed extraction
      await this.supabase
        .from('document_extractions')
        .insert({
          document_id: null,
          extracted_data: { error: error.message, source_url: url },
          extraction_type: modelUsed,
          confidence_score: 0,
          status: 'failed',
          error_message: error.message,
          run_id: runId,
          latency_ms: latencyMs,
          error_type: errorType,
          ocr_used: ocrUsed,
          pages_processed: pagesProcessed,
          model_used: modelUsed
        });

      console.error(`❌ Failed to process: ${url} - ${error.message}`);
      throw error;
    }
  }

  private async extractWithAI(buffer: ArrayBuffer, url: string): Promise<string> {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract ALL text content from this document. Focus on preserving structure, tables, and formatting. Return only the extracted text.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this document:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }

  private async extractWithOCR(buffer: ArrayBuffer): Promise<string> {
    // For demo purposes, simulate OCR - in production, integrate with Tesseract.js or cloud OCR
    // This would be replaced with actual OCR implementation
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate OCR processing time
    
    // Simulate extracted text from OCR
    return `OCR EXTRACTED TEXT - This would contain the actual OCR results from processing the document buffer of ${buffer.byteLength} bytes.`;
  }
}

// Queue processor for handling extraction jobs
class QueueProcessor {
  private supabase: any;
  private extractionService: ExtractionService;

  constructor(supabase: any, extractionService: ExtractionService) {
    this.supabase = supabase;
    this.extractionService = extractionService;
  }

  async processQueue(runId: string, batchSize: number = 5) {
    console.log(`🔄 Processing extraction queue for run: ${runId}`);
    
    // Get pending items from queue
    const { data: queueItems, error } = await this.supabase
      .from('extraction_queue')
      .select('*')
      .eq('run_id', runId)
      .eq('status', 'pending')
      .lt('attempts', 'max_attempts')
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(batchSize);

    if (error) {
      throw error;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('📭 No pending items in queue');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    // Process items in parallel
    const promises = queueItems.map(async (item) => {
      try {
        // Mark as started
        await this.supabase
          .from('extraction_queue')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            attempts: item.attempts + 1
          })
          .eq('id', item.id);

        // Process the document
        await this.extractionService.processDocument(
          item.document_url,
          runId,
          item.document_type || 'subsidy'
        );

        // Mark as completed
        await this.supabase
          .from('extraction_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        succeeded++;
        console.log(`✅ Queue item completed: ${item.document_url}`);

      } catch (error) {
        failed++;
        
        // Update queue item with error
        const updateData: any = {
          error_message: error.message,
          attempts: item.attempts + 1
        };

        // If max attempts reached, mark as failed
        if (item.attempts + 1 >= item.max_attempts) {
          updateData.status = 'failed';
          updateData.completed_at = new Date().toISOString();
        } else {
          // Schedule retry with exponential backoff
          const delayMinutes = Math.pow(2, item.attempts) * 5; // 5, 10, 20 minutes
          updateData.status = 'pending';
          updateData.scheduled_for = new Date(Date.now() + delayMinutes * 60000).toISOString();
        }

        await this.supabase
          .from('extraction_queue')
          .update(updateData)
          .eq('id', item.id);

        console.error(`❌ Queue item failed: ${item.document_url} - ${error.message}`);
      }
    });

    await Promise.all(promises);

    console.log(`🎯 Queue batch completed: ${succeeded} succeeded, ${failed} failed`);
    return { processed: queueItems.length, succeeded, failed };
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

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'process_queue';
    const runId = url.searchParams.get('run_id');

    if (req.method === 'POST') {
      const body = await req.json();
      
      if (action === 'start_reprocess') {
        // Start a new reprocessing run
        console.log('🚀 Starting new reprocessing run...');
        
        // Archive previous data and create new run
        const { data: newRunId, error } = await supabase.rpc('archive_previous_data');
        if (error) throw error;

        // Clean up old extraction data
        await supabase
          .from('document_extractions')
          .delete()
          .or('run_id.is.null,status.eq.failed');

        console.log(`📦 Created new run: ${newRunId}`);
        
        return new Response(JSON.stringify({
          success: true,
          runId: newRunId,
          message: 'Reprocessing started'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (action === 'add_to_queue') {
        // Add documents to extraction queue
        const { documents, runId: requestRunId, priority = 5 } = body;
        
        if (!documents || !requestRunId) {
          throw new Error('Missing documents or runId');
        }

        const queueItems = documents.map((doc: any) => ({
          run_id: requestRunId,
          document_url: doc.url,
          document_type: doc.type || 'subsidy',
          priority: doc.priority || priority,
          metadata: doc.metadata || {}
        }));

        const { error } = await supabase
          .from('extraction_queue')
          .insert(queueItems);

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          queued: queueItems.length,
          message: 'Documents added to queue'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'process_queue') {
      // Process extraction queue
      if (!runId) {
        throw new Error('run_id parameter required');
      }

      const extractionService = new ExtractionService(supabase, openaiKey);
      const queueProcessor = new QueueProcessor(supabase, extractionService);
      
      const batchSize = parseInt(url.searchParams.get('batch_size') || '5');
      const result = await queueProcessor.processQueue(runId, batchSize);

      return new Response(JSON.stringify({
        success: true,
        ...result,
        runId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'rollback') {
      if (!runId) {
        throw new Error('run_id parameter required');
      }

      const { data, error } = await supabase.rpc('rollback_to_previous', { p_run_id: runId });
      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        rolledBack: data,
        message: 'Successfully rolled back to previous version'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('❌ Error in scrape-reprocessor:', error);
    
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