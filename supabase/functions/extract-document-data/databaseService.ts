/**
 * Database service with comprehensive logging and analytics
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export async function storeExtractionResult(
  documentId: string,
  extractedData: any,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log(`💾 Storing extraction result for document: ${documentId}`);
  
  try {
    const extractionRecord = {
      document_id: documentId,
      extracted_data: extractedData,
      confidence_score: extractedData.confidence || 0,
      status: extractedData.error ? 'failed' : 'completed',
      error_message: extractedData.error || null,
      extraction_type: 'openai_gpt4o_mini',
      
      debug_info: {
        ...extractedData.debugInfo,
        extractionTimestamp: new Date().toISOString(),
        detectedLanguage: extractedData.detectedLanguage,
        promptUsed: extractedData.promptUsed,
        extractedFieldCount: extractedData.extractedFields?.length || 0,
        openaiTokens: extractedData.debugInfo?.openaiUsage?.total_tokens,
      }
    };
    
    const { data, error } = await supabase
      .from('document_extractions')
      .insert(extractionRecord);
    
    if (error) {
      console.error('❌ Failed to store extraction result:', error);
      throw error;
    }
    
    console.log(`✅ Extraction result stored successfully`);
    
  } catch (dbError) {
    console.error('❌ Database storage failed:', dbError);
    throw dbError;
  }
}

export async function logExtractionError(
  documentId: string,
  errorMessage: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  debugInfo?: any
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log(`⚠️ Logging extraction error for document: ${documentId}`);
  
  try {
    const errorRecord = {
      document_id: documentId,
      extracted_data: { 
        error: errorMessage,
        errorTimestamp: new Date().toISOString()
      },
      confidence_score: 0,
      status: 'failed',
      error_message: errorMessage,
      extraction_type: 'openai_gpt4o_mini',
      debug_info: {
        ...debugInfo,
        errorOccurred: true,
        timestamp: new Date().toISOString()
      }
    };
    
    const { error } = await supabase
      .from('document_extractions')
      .insert(errorRecord);
    
    if (error) {
      console.error('❌ Failed to log extraction error:', error);
    } else {
      console.log(`✅ Extraction error logged successfully`);
    }
    
  } catch (logError) {
    console.error('❌ Error logging failed:', logError);
  }
}