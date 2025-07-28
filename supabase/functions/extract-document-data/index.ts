/**
 * Debug testing function for comprehensive extraction pipeline verification
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractTextFromFile } from './textExtraction.ts';
import { extractFarmDataWithOpenAI } from './openaiService.ts';
import { storeExtractionResult, logExtractionError } from './databaseService.ts';

// CRITICAL: Environment variable names are case-sensitive. MUST use uppercase SCRAPER_RAW_GPT_API
const openAIApiKey = Deno.env.get('SCRAPER_RAW_GPT_API');
const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let documentId: string | undefined;
  let debugLog: any[] = [];
  
  function addDebugLog(step: string, data: any) {
    const logEntry = {
      step,
      timestamp: new Date().toISOString(),
      data
    };
    debugLog.push(logEntry);
    // Only log in development/debug mode
    if (Deno.env.get('DEBUG_LOGGING') === '1' || Deno.env.get('ENVIRONMENT') === 'development') {
      console.log(`🔍 DEBUG [${step}]:`, data);
    }
  }
  
  function validateFileUrl(fileUrl: string): boolean {
    try {
      const url = new URL(fileUrl);
      const allowedDomains = [
        'gvfgvbztagafjykncwto.supabase.co',
        'supabase.co'
      ];
      return allowedDomains.some(domain => url.hostname.endsWith(domain));
    } catch {
      return false;
    }
  }
  
  try {
    addDebugLog('REQUEST_START', { 
      method: req.method, 
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Parse and validate request
    const requestBody = await req.json();
    documentId = requestBody.documentId;
    const { fileUrl, fileName, documentType } = requestBody;
    
    addDebugLog('REQUEST_PARSED', {
      documentId,
      fileUrl,
      fileName,
      documentType
    });

    // Validate required parameters
    if (!documentId || !fileUrl || !fileName) {
      const error = `Missing required parameters: documentId=${documentId}, fileUrl=${fileUrl}, fileName=${fileName}`;
      addDebugLog('VALIDATION_FAILED', { error });
      throw new Error(error);
    }

    // 🔥 FIX: Validate file URL for SSRF prevention
    if (!validateFileUrl(fileUrl)) {
      const error = 'Invalid file URL - only Supabase storage URLs are allowed';
      addDebugLog('URL_VALIDATION_FAILED', { error, fileUrl });
      throw new Error(error);
    }

    // Check environment variables
    addDebugLog('ENVIRONMENT_CHECK', {
      hasOpenAIKey: !!openAIApiKey,
      openAIKeyLength: openAIApiKey?.length || 0,
      supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey?.length || 0
    });

    if (!openAIApiKey) {
      const error = 'SCRAPER_RAW_GPT_API key not configured';
      addDebugLog('OPENAI_KEY_MISSING', { error });
      throw new Error(error);
    }

    // Download document
    addDebugLog('DOWNLOAD_START', { fileUrl });
    const fileResponse = await fetch(fileUrl);
    
    addDebugLog('DOWNLOAD_RESPONSE', {
      ok: fileResponse.ok,
      status: fileResponse.status,
      statusText: fileResponse.statusText,
      contentLength: fileResponse.headers.get('content-length'),
      contentType: fileResponse.headers.get('content-type')
    });

    if (!fileResponse.ok) {
      const error = `Failed to download document: ${fileResponse.status} ${fileResponse.statusText}`;
      addDebugLog('DOWNLOAD_FAILED', { error });
      throw new Error(error);
    }

    // Extract text
    addDebugLog('TEXT_EXTRACTION_START', { fileName });
    const extractionResult = await extractTextFromFile(fileResponse, fileName, openAIApiKey);
    
    addDebugLog('TEXT_EXTRACTION_COMPLETE', {
      textLength: extractionResult.text.length,
      textPreview: extractionResult.text.substring(0, 300),
      debugInfo: extractionResult.debugInfo
    });

    // OpenAI extraction
    addDebugLog('OPENAI_EXTRACTION_START', {
      textLength: extractionResult.text.length,
      textSample: extractionResult.text.substring(0, 200)
    });
    
    // 🔥 FIX: Make OpenAI model configurable
    const openAIModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
    
    const extractedData = await extractFarmDataWithOpenAI(
      extractionResult.text, 
      openAIApiKey, 
      extractionResult.debugInfo,
      openAIModel
    );

    addDebugLog('OPENAI_EXTRACTION_COMPLETE', {
      hasError: !!extractedData.error,
      confidence: extractedData.confidence,
      extractedFields: extractedData.extractedFields,
      detectedLanguage: extractedData.detectedLanguage,
      promptUsed: extractedData.promptUsed,
      rawResponse: extractedData.rawResponse?.substring(0, 500)
    });

    // Database storage
    addDebugLog('DATABASE_STORAGE_START', { documentId });
    
    try {
      await storeExtractionResult(documentId, extractedData, supabaseUrl, supabaseServiceKey);
      addDebugLog('DATABASE_STORAGE_SUCCESS', { documentId });
    } catch (dbError) {
      addDebugLog('DATABASE_STORAGE_FAILED', {
        error: (dbError as Error).message,
        stack: (dbError as Error).stack
      });
      throw dbError;
    }

    // Final success response
    addDebugLog('EXTRACTION_SUCCESS', {
      documentId,
      confidence: extractedData.confidence,
      extractedFieldCount: extractedData.extractedFields?.length || 0
    });

    return new Response(JSON.stringify({
      success: true,
      documentId,
      extractedData,
      debugLog,
      summary: {
        textExtractionMethod: extractionResult.debugInfo.extractionMethod,
        textLength: extractionResult.text.length,
        detectedLanguage: extractedData.detectedLanguage,
        confidence: extractedData.confidence,
        extractedFields: extractedData.extractedFields?.length || 0,
        hasOpenAIUsage: !!extractedData.debugInfo?.openaiUsage
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = (error as Error).message;
    const errorStack = (error as Error).stack;
    
    addDebugLog('EXTRACTION_FAILED', {
      error: errorMessage,
      stack: errorStack,
      documentId
    });

    // Try to log error to database
    if (documentId) {
      try {
        await logExtractionError(
          documentId, 
          errorMessage, 
          supabaseUrl, 
          supabaseServiceKey,
          { debugLog, errorStack }
        );
        addDebugLog('ERROR_LOGGED_TO_DB', { documentId });
      } catch (logError) {
        addDebugLog('ERROR_LOGGING_FAILED', {
          error: (logError as Error).message
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      debugLog,
      stack: errorStack,
      summary: {
        failedAt: debugLog[debugLog.length - 1]?.step || 'unknown',
        totalSteps: debugLog.length,
        hasDocumentId: !!documentId
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});