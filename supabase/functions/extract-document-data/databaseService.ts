/**
 * Database service with comprehensive logging and analytics
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface StoreResult {
  success: boolean;
  error?: string;
}

export async function storeExtractionResult(
  documentId: string,
  extractedData: Record<string, unknown>,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<StoreResult> {
  console.log(`💾 Storing extraction result for document: ${documentId}`);
  
  // Debug connection (without exposing sensitive data)
  console.log('🔧 Connection check:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    urlDomain: supabaseUrl?.split('://')[1]?.split('.')[0] || 'unknown'
  });
  
  // Create supabase client with service role key to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Test RLS bypass before insertion
  console.log('🔒 Testing RLS bypass with service role...');
  const { data: testData, error: testError } = await supabase
    .from('document_extractions')
    .select('*')
    .limit(1);
  
  console.log('🔒 RLS test result:', { 
    success: !testError, 
    error: testError?.message,
    canAccess: !!testData 
  });
  
  try {
    const extractionRecord = {
      document_id: documentId,
      extracted_data: extractedData,
      confidence_score: Number(extractedData.confidence || 0),
      status: extractedData.error ? 'failed' : 'completed',
      error_message: extractedData.error || null,
      extraction_type: 'openai_gpt4o_mini',
      
      // Enhanced debug information
      debug_info: {
        extractionTimestamp: new Date().toISOString(),
        detectedLanguage: extractedData.detectedLanguage || 'unknown',
        promptUsed: extractedData.promptUsed || 'unknown',
        extractedFieldCount: Object.keys(extractedData.extractedFields || {}).length,
        
        // Include all debug info from extraction process
        ...(extractedData.debugInfo || {}),
        
        // OpenAI usage tracking
        openaiTokens: extractedData.debugInfo?.openaiUsage?.total_tokens || 0,
        openaiPromptTokens: extractedData.debugInfo?.openaiUsage?.prompt_tokens || 0,
        openaiCompletionTokens: extractedData.debugInfo?.openaiUsage?.completion_tokens || 0,
        
        // Text extraction quality metrics
        textExtractionMethod: extractedData.debugInfo?.extractionMethod || 'unknown',
        libraryUsed: extractedData.debugInfo?.libraryUsed || 'unknown',
        ocrConfidence: extractedData.debugInfo?.ocrConfidence || null,
        textLength: extractedData.debugInfo?.textLength || 0,
        extractionTime: extractedData.debugInfo?.extractionTime || 0,
        
        // Warnings and errors during extraction
        extractionWarnings: extractedData.debugInfo?.warnings || [],
        extractionErrors: extractedData.debugInfo?.errors || []
      }
    };
    
    console.log(`📊 Preparing to insert extraction record:`, {
      documentId: extractionRecord.document_id,
      status: extractionRecord.status,
      confidence: extractionRecord.confidence_score,
      hasError: !!extractionRecord.error_message,
      fieldCount: extractionRecord.debug_info.extractedFieldCount
    });
    
    const { data, error } = await supabase
      .from('document_extractions')
      .insert(extractionRecord)
      .select();

    if (error) {
      console.error('❌ Database insertion failed:', error);
      console.error('📄 Failed record details:', extractionRecord);
      return { success: false, error: `Database insertion failed: ${error.message} (Code: ${error.code})` };
    }
    
    console.log(`✅ Extraction result stored successfully`);
    console.log(`📊 Final analytics:`, {
      extractedFields: Object.keys(extractedData.extractedFields || {}).length,
      confidence: Math.round((extractedData.confidence || 0) * 100),
      language: extractedData.detectedLanguage,
      openaiTokens: extractedData.debugInfo?.openaiUsage?.total_tokens || 0
    });
    
    return { success: true };

  } catch (dbError) {
    const errorMessage = `Failed to store extraction: ${(dbError as Error).message}`;
    console.error('❌ Database storage failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function logExtractionError(
  documentId: string,
  errorMessage: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  debugInfo?: Record<string, unknown>
): Promise<void> {
  console.log(`⚠️ Logging extraction error for document: ${documentId}`);
  console.log(`❌ Error message: ${errorMessage}`);
  
  // Debug connection (without exposing sensitive data)
  console.log('🔧 Error logging connection check:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    urlDomain: supabaseUrl?.split('://')[1]?.split('.')[0] || 'unknown'
  });
  
  // Create supabase client with service role key to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    const errorRecord = {
      document_id: documentId,
      extracted_data: { 
        error: errorMessage,
        errorTimestamp: new Date().toISOString(),
        debugInfo: debugInfo || {}
      },
      confidence_score: 0,
      status: 'failed',
      error_message: errorMessage,
      extraction_type: 'openai_gpt4o_mini',
      debug_info: {
        errorOccurred: true,
        errorType: 'extraction_failure',
        timestamp: new Date().toISOString(),
        ...(debugInfo || {})
      }
    };
    
    const { error } = await supabase
      .from('document_extractions')
      .insert(errorRecord);
    
    if (error) {
      console.error('❌ Failed to log extraction error to database:', error);
      console.error('📄 Failed error record:', errorRecord);
      // Don't throw here - we don't want logging failures to crash the extraction
    } else {
      console.log(`✅ Extraction error logged successfully to database`);
    }
    
  } catch (logError) {
    const errorMessage = `Error logging to database failed: ${(logError as Error).message}`;
    console.error('❌', errorMessage);
    // Don't throw here to avoid masking the original error
  }
}