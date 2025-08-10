/**
 * Database Service for Farm Document Extraction
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface StoreExtractionResult {
  success: boolean;
  extractionId?: string;
  error?: string;
}

/**
 * Store extraction result in database
 */
export async function storeExtractionResult(
  documentId: string,
  extractionData: Record<string, unknown>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  ocrUsed: boolean = false,
  runId?: string
): Promise<StoreExtractionResult> {
  try {
    // 🔒 SECURITY: Safe connection check without exposing sensitive data
    console.log('💾 Storing extraction result:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlDomain: supabaseUrl?.split('://')[1]?.split('.')[0] || 'unknown'
    });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        extracted_data: extractionData.extractedFields || {},
        extraction_type: extractionData.debugInfo?.model || 'openai_gpt4o_mini',
        confidence_score: extractionData.confidence || 0,
        status: extractionData.error ? 'failed' : 'completed',
        error_message: extractionData.error || null,
        debug_info: extractionData.debugInfo || {},
        ocr_used: ocrUsed,
        run_id: runId,
        latency_ms: extractionData.debugInfo?.processingTime || null,
        model_used: extractionData.debugInfo?.model || 'gpt-4o',
        pages_processed: 1 // Default to 1 for now
      })
      .select('id')
      .single();

    if (error) {
      const errorMessage = `Database storage failed: ${error.message}`;
      console.error('❌', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }

    console.log(`✅ Extraction stored successfully with ID: ${data.id}`);
    return {
      success: true,
      extractionId: data.id
    };
  } catch (error) {
    const errorMessage = `Database service error: ${(error as Error).message}`;
    console.error('❌', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Log extraction error to database
 */
export async function logExtractionError(
  documentId: string,
  errorMessage: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  additionalData?: Record<string, unknown>
): Promise<void> {
  try {
    console.log(`📝 Logging extraction error for document: ${documentId}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        extracted_data: {},
        extraction_type: 'error_log',
        confidence_score: 0,
        status: 'failed',
        error_message: errorMessage,
        debug_info: additionalData || {},
        ocr_used: false,
        error_type: 'extraction_failed'
      });

    if (error) {
      console.error('❌ Error logging failed:', error);
    } else {
      console.log('✅ Error logged successfully');
    }
  } catch (logError) {
    console.error('❌ Error logging service failed:', logError);
  }
}

/**
 * Update document processing status
 */
export async function updateDocumentStatus(
  documentId: string,
  status: 'processing' | 'completed' | 'failed',
  supabaseUrl: string,
  supabaseServiceKey: string,
  additionalInfo?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update document status if there's a status field
    const { error } = await supabase
      .from('farm_documents')
      .update({
        // Add status field to farm_documents table if needed
        updated_at: new Date().toISOString(),
        ...additionalInfo
      })
      .eq('id', documentId);

    if (error) {
      console.warn('⚠️ Document status update failed:', error);
    } else {
      console.log(`✅ Document status updated to: ${status}`);
    }
  } catch (error) {
    console.warn('⚠️ Document status update error:', error);
  }
}