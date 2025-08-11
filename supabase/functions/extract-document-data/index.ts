/**
 * Debug testing function for comprehensive extraction pipeline verification
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractTextFromFile } from './textExtraction.ts';
import { extractFarmDataWithOpenAI } from './openaiService.ts';
import { storeExtractionResult, logExtractionError } from './databaseService.ts';
import { tryLocalExtraction } from './lib/localExtraction.ts';
import { integrateTableExtraction, detectAndMergeMultiPageTables, validateTableQuality } from './tableIntegration.ts';

// Enhanced environment diagnostics and validation
function validateEnvironment() {
  // 🔒 SECURITY: Sanitized environment logging - no sensitive data exposed
  console.log('🔧 Environment Check for extract-document-data:', {
    hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
    hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
    hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
    // 🔒 Safe: Only show count, not actual variable names
    envVarCount: Object.keys(Deno.env.toObject()).filter(k => 
      k.startsWith('SUPABASE') || k.startsWith('OPENAI')
    ).length
  });

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
    const missingVars = [];
    if (!openAIApiKey) missingVars.push('OPENAI_API_KEY');
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    
    console.error('❌ Missing environment variables:', {
      OPENAI_API_KEY: openAIApiKey ? '[SET]' : '[MISSING]',
      SUPABASE_URL: supabaseUrl ? '[SET]' : '[MISSING]',
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? '[SET]' : '[MISSING]'
    });
    
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return { openAIApiKey, supabaseUrl, supabaseServiceKey };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables first
    const { openAIApiKey, supabaseUrl, supabaseServiceKey } = validateEnvironment();

  let documentId: string | undefined;
  let debugLog: any[] = [];
  
  function addDebugLog(step: string, data: any) {
    const logEntry = {
      step,
      timestamp: new Date().toISOString(),
      data
    };
    debugLog.push(logEntry);
    // SECURITY: Only log in development/debug mode - never in production
    const isDebugMode = Deno.env.get('DEBUG_LOGGING') === '1' && Deno.env.get('ENVIRONMENT') === 'development';
    if (isDebugMode) {
      // SECURITY: Sanitize sensitive data before logging
      const sanitizedData = typeof data === 'object' && data !== null 
        ? Object.fromEntries(
            Object.entries(data).map(([key, value]) => [
              key,
              key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('password')
                ? '[REDACTED]'
                : value
            ])
          )
        : data;
      console.log(`🔍 DEBUG [${step}]:`, sanitizedData);
    }
  }
  
  // Simple language detection function
  function detectDocumentLanguage(text: string): string {
    const sample = text.slice(0, 1000).toLowerCase();
    
    // Romanian
    if (/\b(și|cu|de|la|în|pe|pentru|din|este|sunt|avea|face|agricultura|fermă)\b/.test(sample)) {
      return 'ro';
    }
    
    // French  
    if (/\b(et|de|le|la|les|des|du|avec|pour|dans|sur|être|avoir|agriculture|ferme)\b/.test(sample)) {
      return 'fr';
    }
    
    // Spanish
    if (/\b(y|de|el|la|los|las|del|con|para|en|por|ser|estar|tener|agricultura|granja)\b/.test(sample)) {
      return 'es';
    }
    
    // Default to English
    return 'en';
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
    // Support both parameter naming conventions
    const fileUrl = requestBody.fileUrl || requestBody.documentUrl;
    const fileName = requestBody.fileName || requestBody.documentName;
    const documentType = requestBody.documentType;
    
    addDebugLog('REQUEST_PARSED', {
      documentId,
      fileUrl,
      fileName,
      documentType,
      originalParams: requestBody
    });

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!documentId || !uuidRegex.test(documentId)) {
      const error = 'Extraction requires a valid UUID for document_id';
      addDebugLog('DOCUMENT_ID_VALIDATION_FAILED', { documentId, error });
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required parameters
    if (!fileUrl || !fileName) {
      const error = `Missing required parameters: fileUrl=${fileUrl}, fileName=${fileName}`;
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
    const supabaseDomain = (() => {
      try {
        return new URL(supabaseUrl).hostname;
      } catch {
        return 'invalid-url';
      }
    })();

    // 🔒 SECURITY: Minimal environment check - no sensitive data logged
    addDebugLog('ENVIRONMENT_CHECK', {
      hasOpenAIKey: !!openAIApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      supabaseDomain: new URL(supabaseUrl).hostname
    });

    if (!openAIApiKey) {
      const error = 'OPENAI_API_KEY not configured';
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

    // ===== PHASE D: ADVANCED TABLE EXTRACTION =====
    // Check if Phase D is enabled
    const ENABLE_PHASE_D = Deno.env.get('ENABLE_PHASE_D') === 'true';
    addDebugLog('PHASE_D_CHECK', { enabled: ENABLE_PHASE_D });
    
    let tableIntegrationResult;
    let detectedLanguage = 'en'; // Default language
    
    if (ENABLE_PHASE_D) {
      // Get file buffer for table extraction
      addDebugLog('PHASE_D_TABLE_EXTRACTION_START', { fileName });
      const fileBuffer = await fileResponse.clone().arrayBuffer();
      
      try {
        // Initial language detection from any available text
        const tempExtractionResult = await extractTextFromFile(fileResponse.clone(), fileName, openAIApiKey);
        detectedLanguage = detectDocumentLanguage(tempExtractionResult.text);
        
        // Run Phase D table extraction with AI post-processing
        tableIntegrationResult = await integrateTableExtraction(
          fileBuffer,
          fileName, 
          detectedLanguage,
          openAIApiKey
        );
        
        addDebugLog('PHASE_D_TABLE_EXTRACTION_SUCCESS', {
          tablesFound: tableIntegrationResult.tableMetrics.totalTables,
          tableQuality: tableIntegrationResult.tableMetrics.tableQualityScore,
          subsidyFieldsFound: tableIntegrationResult.tableMetrics.subsidyFieldsFound,
          processingTime: tableIntegrationResult.tableMetrics.extractionTime + tableIntegrationResult.tableMetrics.postProcessingTime
        });
        
      } catch (tableError) {
        console.warn('⚠️ Phase D table extraction failed:', tableError);
        addDebugLog('PHASE_D_TABLE_EXTRACTION_FAILED', {
          error: tableError.message,
          fallbackToTextOnly: true
        });
        
        // Continue with text-only extraction
        tableIntegrationResult = null;
      }
    } else {
      addDebugLog('PHASE_D_DISABLED', { reason: 'ENABLE_PHASE_D not set to true' });
      tableIntegrationResult = null;
    }

    // Extract text (enhanced with table content if available)
    addDebugLog('TEXT_EXTRACTION_START', { fileName });
    const extractionResult = await extractTextFromFile(fileResponse, fileName, openAIApiKey);
    
    // If we have table results, enhance the text with structured table content
    if (tableIntegrationResult) {
      extractionResult.text = extractionResult.text + '\n\n' + tableIntegrationResult.enrichedText;
      extractionResult.debugInfo = {
        ...extractionResult.debugInfo,
        tablesFound: tableIntegrationResult.tableMetrics.totalTables,
        tableQualityScore: tableIntegrationResult.tableMetrics.tableQualityScore,
        phaseD: true
      };
    }
    
    // 🔍 CRITICAL DEBUG: Log extraction result details
    console.log(`🔍 EXTRACTION RESULT: Text length = ${extractionResult.text.length}`);
    console.log(`🔍 EXTRACTION RESULT: Text preview = "${extractionResult.text.substring(0, 300)}"`);
    console.log(`🔍 EXTRACTION RESULT: Debug info =`, extractionResult.debugInfo);
    
    addDebugLog('TEXT_EXTRACTION_COMPLETE', {
      textLength: extractionResult.text.length,
      textPreview: extractionResult.text.substring(0, 300),
      debugInfo: extractionResult.debugInfo,
      tableEnhanced: !!tableIntegrationResult
    });

    // Try local extraction first
    addDebugLog('LOCAL_EXTRACTION_START', {
      textLength: extractionResult.text.length,
      documentType: documentType || 'other'
    });
    
    const localExtractionResult = await tryLocalExtraction(
      extractionResult.text,
      documentType || 'other',
      0.7 // confidence threshold
    );
    
    addDebugLog('LOCAL_EXTRACTION_COMPLETE', {
      success: !localExtractionResult.errorMessage,
      confidence: localExtractionResult.overallConfidence,
      extractedFieldCount: localExtractionResult.extractedFields.length,
      fallbackRecommended: localExtractionResult.fallbackRecommended,
      processingTime: localExtractionResult.processingTime
    });

    let extractedData;
    let extractionMethod = 'local';

    // Use local extraction if confidence is high enough
    if (!localExtractionResult.fallbackRecommended && !localExtractionResult.errorMessage) {
      // Convert local extraction result to expected format
      extractedData = {
        extractedFields: localExtractionResult.extractedFields.reduce((acc, field) => {
          acc[field.field] = field.value;
          return acc;
        }, {} as Record<string, string>),
        confidence: localExtractionResult.overallConfidence,
        detectedLanguage: 'unknown', // Local extraction doesn't detect language yet
        promptUsed: 'local-rule-based-extraction',
        debugInfo: {
          extractionMethod: 'local',
          localProcessingTime: localExtractionResult.processingTime,
          modelUsed: localExtractionResult.modelUsed
        }
      };
      addDebugLog('USING_LOCAL_EXTRACTION', { confidence: extractedData.confidence });
    } else {
      // Fallback to OpenAI extraction
      addDebugLog('FALLBACK_TO_OPENAI', {
        reason: localExtractionResult.errorMessage || 'Low confidence',
        localConfidence: localExtractionResult.overallConfidence
      });
      
      extractionMethod = 'openai_fallback';
      
      // 🔥 FIX: Make OpenAI model configurable
      const openAIModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-2025-04-14';
      
      extractedData = await extractFarmDataWithOpenAI(
        extractionResult.text, 
        openAIApiKey, 
        extractionResult.debugInfo,
        openAIModel
      );
      
      // Add local extraction attempt info to debug
      extractedData.debugInfo = {
        ...extractedData.debugInfo,
        localExtractionAttempted: true,
        localExtractionResult: localExtractionResult
      };
    }

    addDebugLog('OPENAI_EXTRACTION_COMPLETE', {
      hasError: !!extractedData.error,
      confidence: extractedData.confidence,
      extractedFields: extractedData.extractedFields,
      detectedLanguage: extractedData.detectedLanguage,
      promptUsed: extractedData.promptUsed,
      rawResponse: extractedData.rawResponse?.substring(0, 500)
    });

    // Database storage with Phase D table data
    addDebugLog('DATABASE_STORAGE_START', { documentId });
    
    const storeResult = await storeExtractionResult(
      documentId,
      extractedData,
      supabaseUrl,
      supabaseServiceKey,
      extractionResult.debugInfo.ocrUsed || false,
      undefined, // run_id - will be set later when we have batch processing
      tableIntegrationResult // Phase D table data
    );

    if (!storeResult.success) {
      const errorMessage = storeResult.error || 'Unknown database error';
      addDebugLog('DATABASE_STORAGE_FAILED', {
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({
          error: errorMessage,
          documentId
        }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }

    addDebugLog('DATABASE_STORAGE_SUCCESS', { documentId });

    // Trigger document classification after successful extraction
    addDebugLog('CLASSIFICATION_START', { documentId });
    try {
      const classificationResponse = await fetch(`${supabaseUrl}/functions/v1/classify-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          documentId,
          extractedText: extractionResult.text,
          fileName,
          userSelectedCategory: documentType || 'other'
        })
      });

      if (classificationResponse.ok) {
        const classificationResult = await classificationResponse.json();
        addDebugLog('CLASSIFICATION_SUCCESS', classificationResult);
      } else {
        const error = await classificationResponse.text();
        addDebugLog('CLASSIFICATION_FAILED', { error });
      }
    } catch (classificationError) {
      const errorMessage = `Classification failed: ${(classificationError as Error).message}`;
      addDebugLog('CLASSIFICATION_ERROR', {
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      // Classification error is not fatal - continue with extraction
      console.warn('⚠️', errorMessage, 'continuing with extraction');
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
        extractedFields: Object.keys(extractedData.extractedFields || {}).length,
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

    // 🔧 IMPROVED: Better error handling - try to log error to database
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
        const logErrorMessage = `Error logging failed: ${(logError as Error).message}`;
        addDebugLog('ERROR_LOGGING_FAILED', {
          originalError: errorMessage,
          logError: logErrorMessage,
          timestamp: new Date().toISOString()
        });
        console.error('❌', logErrorMessage);
      }
    }
    
    // 🔧 IMPROVED: Return proper HTTP error responses instead of throwing
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      debugLog,
      documentId,
      summary: {
        failedAt: debugLog[debugLog.length - 1]?.step || 'unknown',
        totalSteps: debugLog.length,
        hasDocumentId: !!documentId,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  } catch (error) {
    console.error('❌ Critical error in extract-document-data function:', error);
    
    // Check if this is an environment variable error
    if (error instanceof Error && error.message.includes('Missing required environment variables')) {
      return new Response(JSON.stringify({ 
        error: 'Environment configuration error',
        details: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});