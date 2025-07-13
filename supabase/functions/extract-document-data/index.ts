import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractTextFromFile } from './textExtraction.ts';
import { extractFarmDataWithOpenAI } from './openaiService.ts';
import { storeExtractionResult, logExtractionError } from './databaseService.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
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
  let debugInfo: any = {};
  
  try {
    // Enhanced request validation and logging
    const requestBody = await req.json();
    documentId = requestBody.documentId;
    const { fileUrl, fileName, documentType } = requestBody;
    
    console.log(`🤖 Starting AI extraction for document: ${fileName}`);
    console.log(`📄 Document details:`, { documentId, fileUrl, documentType });
    console.log(`🔐 Request headers:`, Object.fromEntries(req.headers.entries()));

    // Validate required parameters
    if (!documentId || !fileUrl || !fileName) {
      throw new Error(`Missing required parameters: documentId=${documentId}, fileUrl=${fileUrl}, fileName=${fileName}`);
    }

    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }
    console.log('✅ OpenAI API key found');

    // Download the document content with enhanced error handling
    console.log(`📥 Downloading document from: ${fileUrl}`);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      console.error(`❌ Failed to download document. Status: ${fileResponse.status}, StatusText: ${fileResponse.statusText}`);
      throw new Error(`Failed to download document: ${fileResponse.status} ${fileResponse.statusText}`);
    }
    
    const contentLength = fileResponse.headers.get('content-length');
    const contentType = fileResponse.headers.get('content-type');
    console.log(`✅ Document downloaded successfully. Size: ${contentLength} bytes, Type: ${contentType}`);

    // Extract text from the document with comprehensive debug info
    const extractionResult = await extractTextFromFile(fileResponse, fileName, openAIApiKey);
    const extractedText = extractionResult.text;
    debugInfo = extractionResult.debugInfo;

    // Enhanced extraction debug logging
    console.log(`📊 Text extraction complete:`, {
      method: debugInfo.extractionMethod,
      library: debugInfo.libraryUsed,
      textLength: debugInfo.textLength,
      extractionTime: debugInfo.extractionTime,
      errors: debugInfo.errors?.length || 0,
      warnings: debugInfo.warnings?.length || 0,
      ocrConfidence: debugInfo.ocrConfidence
    });

    if (debugInfo.errors?.length > 0) {
      console.warn(`⚠️ Extraction errors:`, debugInfo.errors);
    }
    
    if (debugInfo.warnings?.length > 0) {
      console.warn(`⚠️ Extraction warnings:`, debugInfo.warnings);
    }

    // Extract farm data using OpenAI with multilingual support
    const extractedData = await extractFarmDataWithOpenAI(extractedText, openAIApiKey, debugInfo);

    // Enhanced logging for extraction results
    console.log(`🎯 AI extraction results:`, {
      confidence: extractedData.confidence,
      extractedFields: extractedData.extractedFields,
      detectedLanguage: extractedData.detectedLanguage,
      hasError: !!extractedData.error
    });

    // Store comprehensive extraction results in database
    await storeExtractionResult(documentId, extractedData, supabaseUrl, supabaseServiceKey);

    console.log(`✅ AI extraction completed successfully for ${fileName}`);

    return new Response(JSON.stringify({
      success: true,
      documentId,
      extractedData,
      debugInfo: {
        extractionMethod: debugInfo.extractionMethod,
        libraryUsed: debugInfo.libraryUsed,
        textLength: debugInfo.textLength,
        detectedLanguage: extractedData.detectedLanguage,
        confidence: extractedData.confidence
      },
      message: 'Extraction completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in extract-document-data function:', error);
    console.error('🔍 Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      documentId,
      debugInfo
    });
    
    // Comprehensive error logging to database
    if (documentId) {
      try {
        await logExtractionError(
          documentId, 
          (error as Error).message, 
          supabaseUrl, 
          supabaseServiceKey,
          {
            ...debugInfo,
            errorStack: (error as Error).stack,
            errorTimestamp: new Date().toISOString()
          }
        );
      } catch (logError) {
        console.error('❌ Failed to log error to database:', logError);
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      debugInfo: {
        extractionMethod: debugInfo.extractionMethod || 'unknown',
        hasErrors: true,
        errorTimestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});