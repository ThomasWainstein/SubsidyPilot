/**
 * Enhanced Document Data Extraction Edge Function
 * Features: Streaming, OCR, Chunking, Retry Logic, Comprehensive Metrics
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseDocument, ParseOptions } from '../lib/documentParsers.ts';

interface ExtractionRequest {
  documentId: string;
  fileUrl: string;
  fileName: string;
  documentType?: string;
  options?: ParseOptions;
  retryAttempt?: number;
}

interface ExtractionResult {
  success: boolean;
  documentId: string;
  extractedData?: any;
  chunks?: string[];
  metadata?: any;
  error?: string;
  processingTime: number;
  extractionId?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced environment validation
function validateEnvironment() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY'];
  const missing = required.filter(key => !Deno.env.get(key));
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  return {
    supabaseUrl: Deno.env.get('SUPABASE_URL')!,
    supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    openaiApiKey: Deno.env.get('OPENAI_API_KEY')!,
    maxFileMB: parseInt(Deno.env.get('MAX_FILE_MB') || '150'),
    maxProcessingMs: parseInt(Deno.env.get('MAX_PROCESSING_MS') || '300000'), // 5 minutes
    ocrEnabled: Deno.env.get('OCR_ENABLED') !== 'false'
  };
}

// Enhanced AI processing with chunking
async function processWithOpenAI(
  chunks: string[], 
  metadata: any, 
  openaiApiKey: string
): Promise<any> {
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
  
  try {
    // Process chunks in batches to respect token limits
    const results = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🤖 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: buildExtractionPrompt(i === 0) // Full instructions for first chunk
            },
            {
              role: 'user',
              content: `Extract structured data from this document chunk:\n\n${chunk}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const extractedData = JSON.parse(result.choices[0].message.content);
      results.push(extractedData);
    }
    
    // Merge results from all chunks
    return mergeExtractionResults(results, metadata);
  } catch (error) {
    console.error('❌ OpenAI processing failed:', error);
    throw error;
  }
}

function buildExtractionPrompt(isFirstChunk: boolean): string {
  if (isFirstChunk) {
    return `You are an expert at extracting structured data from farm and agricultural documents.

Extract the following information and return as JSON:
{
  "farmName": "Farm business name",
  "ownerName": "Owner/operator name", 
  "address": "Full address including postal code",
  "phone": "Phone number",
  "email": "Email address",
  "totalHectares": "Total farm area in hectares",
  "landUseTypes": ["crop1", "crop2"],
  "legalStatus": "Legal form (SRL, PFA, etc)",
  "cnpOrCui": "Tax ID or registration number",
  "country": "Country",
  "department": "Region/department",
  "livestock": {
    "present": true/false,
    "types": ["cattle", "sheep"],
    "counts": {"cattle": 50}
  },
  "certifications": ["organic", "bio"],
  "irrigation": "Method of irrigation",
  "revenue": "Annual revenue or revenue range",
  "confidence": 0.85
}

Extract only fields that are clearly present. Use null for missing data.`;
  } else {
    return `Continue extracting farm data from this additional chunk. 
Merge with previous data, prioritizing the most complete and accurate information.
Return the same JSON structure.`;
  }
}

function mergeExtractionResults(results: any[], metadata: any): any {
  // Merge multiple extraction results, prioritizing non-null values
  const merged: any = {
    extractedFields: {},
    confidence: 0,
    detectedLanguage: metadata.language || 'unknown',
    extractionMethod: 'chunked-ai-processing',
    debugInfo: {
      chunksProcessed: results.length,
      metadata
    }
  };
  
  let totalConfidence = 0;
  let validResults = 0;
  
  // Merge all extracted fields
  for (const result of results) {
    if (result && typeof result === 'object') {
      for (const [key, value] of Object.entries(result)) {
        if (value !== null && value !== undefined && value !== '') {
          if (!merged.extractedFields[key] || 
              (typeof value === 'string' && value.length > (merged.extractedFields[key]?.length || 0))) {
            merged.extractedFields[key] = value;
          }
        }
      }
      
      if (result.confidence) {
        totalConfidence += result.confidence;
        validResults++;
      }
    }
  }
  
  merged.confidence = validResults > 0 ? totalConfidence / validResults : 0.5;
  
  return merged;
}

// Metrics tracking
async function logMetric(
  supabase: any,
  documentId: string,
  operationType: string,
  startTime: number,
  success: boolean,
  errorMessage?: string,
  metadata?: any
) {
  try {
    await supabase
      .from('extraction_metrics')
      .insert({
        document_id: documentId,
        operation_type: operationType,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        success,
        error_message: errorMessage,
        metadata: metadata || {}
      });
  } catch (error) {
    console.warn('⚠️ Failed to log metric:', error);
  }
}

// Enhanced database operations
async function storeExtractionResult(
  supabase: any,
  documentId: string,
  extractionData: any,
  chunks: string[],
  metadata: any,
  idempotencyKey: string
): Promise<{ success: boolean; extractionId?: string; error?: string }> {
  try {
    // Check for existing extraction with same idempotency key
    const { data: existing } = await supabase
      .from('document_extractions')
      .select('id')
      .eq('document_id', documentId)
      .eq('idempotency_key', idempotencyKey)
      .single();
    
    if (existing) {
      console.log('✅ Found existing extraction, returning cached result');
      return { success: true, extractionId: existing.id };
    }
    
    // Store new extraction
    const { data, error } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        extracted_data: extractionData.extractedFields || extractionData,
        text_chunks: chunks,
        chunk_count: chunks.length,
        extraction_type: extractionData.extractionMethod || 'enhanced-pipeline',
        confidence_score: extractionData.confidence || 0,
        status: 'completed',
        ocr_used: metadata.extractionMethod?.includes('ocr') || false,
        processing_time_ms: metadata.processingTime,
        model_version: metadata.extractionMethod,
        idempotency_key: idempotencyKey,
        debug_info: {
          ...extractionData.debugInfo,
          metadata
        }
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    // Update document status
    await supabase
      .from('farm_documents')
      .update({
        processing_status: 'completed',
        file_hash: metadata.hash,
        page_count: metadata.pages,
        language_detected: metadata.language
      })
      .eq('id', documentId);
    
    return { success: true, extractionId: data.id };
  } catch (error) {
    console.error('❌ Database storage failed:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  let documentId: string | undefined;
  
  try {
    // Validate environment
    const env = validateEnvironment();
    
    // Parse request
    const requestData: ExtractionRequest = await req.json();
    documentId = requestData.documentId;
    
    console.log(`🚀 Starting enhanced extraction for document: ${requestData.fileName}`);
    
    // Validate request
    if (!documentId || !requestData.fileUrl || !requestData.fileName) {
      throw new Error('Missing required parameters: documentId, fileUrl, fileName');
    }
    
    // Create Supabase client
    const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey);
    
    // Generate idempotency key
    const idempotencyKey = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${documentId}-${requestData.fileUrl}`)
    ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Start metrics tracking
    const downloadStart = Date.now();
    
    // Download document with streaming
    console.log(`📥 Downloading document: ${requestData.fileUrl}`);
    const response = await fetch(requestData.fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    await logMetric(supabase, documentId, 'download', downloadStart, true, undefined, {
      fileSize: buffer.byteLength,
      contentType: response.headers.get('content-type')
    });
    
    // Check file size limit
    if (buffer.byteLength > env.maxFileMB * 1024 * 1024) {
      throw new Error(`File too large: ${buffer.byteLength} bytes (max: ${env.maxFileMB}MB)`);
    }
    
    // Parse document
    const parseStart = Date.now();
    console.log(`🔍 Parsing document with enhanced pipeline...`);
    
    const parseOptions: ParseOptions = {
      enableOCR: env.ocrEnabled,
      maxChunkSize: 4000,
      overlapSize: 200,
      ocrFallbackThreshold: 0.3,
      ...requestData.options
    };
    
    const parsedDoc = await parseDocument(buffer, requestData.fileName, parseOptions);
    
    await logMetric(supabase, documentId, 'text_extraction', parseStart, true, undefined, {
      method: parsedDoc.metadata.extractionMethod,
      confidence: parsedDoc.metadata.confidence,
      textLength: parsedDoc.text.length,
      chunkCount: parsedDoc.chunks.length
    });
    
    // Process with AI if chunks are available
    let extractionData;
    if (parsedDoc.chunks.length > 0) {
      const aiStart = Date.now();
      console.log(`🤖 Processing ${parsedDoc.chunks.length} chunks with OpenAI...`);
      
      extractionData = await processWithOpenAI(
        parsedDoc.chunks,
        parsedDoc.metadata,
        env.openaiApiKey
      );
      
      await logMetric(supabase, documentId, 'ai_processing', aiStart, true, undefined, {
        chunksProcessed: parsedDoc.chunks.length,
        confidence: extractionData.confidence
      });
    } else {
      extractionData = {
        extractedFields: {},
        confidence: 0.1,
        extractionMethod: 'no-content',
        error: 'No extractable content found'
      };
    }
    
    // Store results
    const storeResult = await storeExtractionResult(
      supabase,
      documentId,
      extractionData,
      parsedDoc.chunks,
      parsedDoc.metadata,
      idempotencyKey
    );
    
    if (!storeResult.success) {
      throw new Error(`Storage failed: ${storeResult.error}`);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Enhanced extraction completed in ${totalTime}ms`);
    
    return new Response(JSON.stringify({
      success: true,
      documentId,
      extractionId: storeResult.extractionId,
      extractedData: extractionData.extractedFields,
      chunks: parsedDoc.chunks.length,
      metadata: {
        ...parsedDoc.metadata,
        totalProcessingTime: totalTime,
        confidence: extractionData.confidence
      },
      summary: {
        textLength: parsedDoc.text.length,
        chunksProcessed: parsedDoc.chunks.length,
        extractionMethod: parsedDoc.metadata.extractionMethod,
        aiConfidence: extractionData.confidence,
        ocrUsed: parsedDoc.metadata.extractionMethod?.includes('ocr')
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const totalTime = Date.now() - startTime;
    
    console.error(`❌ Enhanced extraction failed: ${errorMessage}`);
    
    // Log error metric if we have documentId
    if (documentId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await logMetric(
          supabase,
          documentId,
          'extraction_failed',
          startTime,
          false,
          errorMessage,
          { totalTime }
        );
        
        // Update document status
        await supabase
          .from('farm_documents')
          .update({
            processing_status: 'failed',
            error_details: { error: errorMessage, timestamp: new Date().toISOString() }
          })
          .eq('id', documentId);
      } catch (logError) {
        console.warn('⚠️ Failed to log error:', logError);
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      documentId,
      processingTime: totalTime,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});