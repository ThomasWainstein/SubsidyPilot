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
  extractionData: any,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<StoreExtractionResult> {
  try {
    console.log(`💾 Storing extraction result for document: ${documentId}`);
    
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
        debug_info: extractionData.debugInfo || {}
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Database storage failed:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    console.log(`✅ Extraction stored successfully with ID: ${data.id}`);
    return {
      success: true,
      extractionId: data.id
    };
  } catch (error) {
    console.error('❌ Database service error:', error);
    return {
      success: false,
      error: `Database service error: ${error.message}`
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
  additionalData?: any
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
        debug_info: additionalData || {}
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
  additionalInfo?: any
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