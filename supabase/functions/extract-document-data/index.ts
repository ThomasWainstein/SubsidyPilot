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
  
  try {
    const requestBody = await req.json();
    documentId = requestBody.documentId;
    const { fileUrl, fileName, documentType } = requestBody;
    
    console.log(`🤖 Starting AI extraction for document: ${fileName}, URL: ${fileUrl}`);

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
    console.log(`✅ Document downloaded successfully. Size: ${fileResponse.headers.get('content-length')} bytes`);

    // Extract text from the document with debug info
    const { text: extractedText, debugInfo } = await extractTextFromFile(fileResponse, fileName, openAIApiKey);

    // Log extraction debug information
    console.log(`📊 Text extraction debug:`, {
      method: debugInfo.extractionMethod,
      textLength: debugInfo.textLength,
      extractionTime: debugInfo.extractionTime,
      errors: debugInfo.errors,
      warnings: debugInfo.warnings
    });

    // Extract farm data using OpenAI
    const extractedData = await extractFarmDataWithOpenAI(extractedText, openAIApiKey, debugInfo);

    // Store extraction results in database
    await storeExtractionResult(documentId, extractedData, supabaseUrl, supabaseServiceKey);

    console.log(`AI extraction completed for ${fileName}:`, extractedData);

    return new Response(JSON.stringify({
      success: true,
      documentId,
      extractedData,
      message: 'Extraction completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-document-data function:', error);
    
    // Try to log the failure to the database if we have documentId
    if (documentId) {
      await logExtractionError(documentId, (error as Error).message, supabaseUrl, supabaseServiceKey);
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});