import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExtractDocumentDataRequest {
  documentId: string;
  fileUrl: string;
  fileName: string;
  clientType: 'farm' | 'individual' | 'business' | 'ngo';
  documentType: string;
}

interface ExtractDocumentDataResponse {
  success: boolean;
  extractedData: object;
  confidence: number;
  textLength: number;
  tokensUsed: number;
  ocrMetadata: object;
  qualityScore: number;
  extractionMethod: string;
  costBreakdown: object;
  processingTime: object;
  processingLog: string[];
}

function mapClientTypeToFields(clientType: string, documentType: string) {
  const fieldMappings = {
    farm: {
      basic: ['farm_name', 'farm_address', 'total_hectares', 'legal_status', 'siret'],
      subsidy: ['subsidy_name', 'deadline', 'eligibility_criteria', 'required_documents', 'amount']
    },
    individual: {
      basic: ['first_name', 'last_name', 'address', 'date_of_birth', 'phone', 'email'],
      subsidy: ['program_name', 'deadline', 'eligibility', 'required_docs', 'benefit_amount']
    },
    business: {
      basic: ['company_name', 'siret', 'address', 'legal_form', 'activity_sector'],
      subsidy: ['aid_name', 'deadline', 'criteria', 'documents_needed', 'funding_amount']
    },
    ngo: {
      basic: ['organization_name', 'rna_number', 'address', 'legal_status', 'mission'],
      subsidy: ['grant_name', 'deadline', 'eligibility_requirements', 'application_docs', 'grant_amount']
    }
  };

  return fieldMappings[clientType] || fieldMappings.individual;
}

function calculateQualityScore(extractedData: any, confidence: number, textLength: number): number {
  let score = confidence * 100;
  
  // Adjust based on data completeness
  const extractedFields = Object.keys(extractedData).length;
  if (extractedFields > 5) score += 10;
  if (extractedFields > 10) score += 10;
  
  // Adjust based on text length (more text usually means better extraction)
  if (textLength > 1000) score += 5;
  if (textLength > 5000) score += 5;
  
  return Math.min(100, Math.max(0, score));
}

function estimateCost(tokensUsed: number, model: string): object {
  const pricing = {
    'gpt-4o-mini': { input: 0.000150, output: 0.000600 },
    'gpt-4.1-2025-04-14': { input: 0.003, output: 0.015 },
    'gpt-5-2025-08-07': { input: 0.005, output: 0.020 }
  };

  const rates = pricing[model] || pricing['gpt-4o-mini'];
  const inputTokens = Math.floor(tokensUsed * 0.7);
  const outputTokens = Math.floor(tokensUsed * 0.3);
  
  const cost = (inputTokens * rates.input / 1000) + (outputTokens * rates.output / 1000);
  
  return {
    totalCost: cost,
    inputTokens,
    outputTokens,
    model,
    pricing: rates
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, fileUrl, fileName, clientType, documentType }: ExtractDocumentDataRequest = await req.json();
    const startTime = Date.now();
    const processingLog: string[] = [];

    console.log(`🔄 Starting extraction for document ${documentId} (${clientType}/${documentType})`);
    processingLog.push(`Starting extraction for ${fileName}`);

    // Validate input
    if (!documentId || !fileUrl || !fileName || !clientType || !documentType) {
      throw new Error('Missing required parameters');
    }

    // Call hybrid extraction
    processingLog.push('Calling hybrid extraction service');
    const hybridResponse = await supabase.functions.invoke('hybrid-extraction', {
      body: {
        fileUrl,
        fileName,
        documentType,
        processingMode: 'sync'
      }
    });

    if (hybridResponse.error) {
      throw new Error(`Hybrid extraction failed: ${hybridResponse.error.message}`);
    }

    const hybridData = hybridResponse.data;
    processingLog.push(`Hybrid extraction completed: ${hybridData.extractedText.length} chars`);

    // Map extracted data to client-specific fields
    const fieldMapping = mapClientTypeToFields(clientType, documentType);
    processingLog.push(`Using field mapping for ${clientType}`);

    // Estimate processing metrics
    const textLength = hybridData.extractedText.length;
    const tokensUsed = Math.ceil(textLength / 4); // Rough token estimation
    const qualityScore = calculateQualityScore(hybridData.structuredData, hybridData.confidence, textLength);

    // Store extraction result
    processingLog.push('Storing extraction in database');
    const { error: dbError } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        extracted_data: hybridData.structuredData,
        confidence_score: hybridData.confidence,
        extraction_type: hybridData.method,
        ocr_metadata: hybridData.ocrMetadata,
        status: 'completed',
        model_used: hybridData.method === 'openai_fallback' ? 'gpt-4o-mini' : 'google_vision',
        processing_time_ms: hybridData.processingTime
      });

    if (dbError) {
      console.error('Database error:', dbError);
      processingLog.push(`Database error: ${dbError.message}`);
    } else {
      processingLog.push('Extraction stored successfully');
    }

    const totalProcessingTime = Date.now() - startTime;
    const costBreakdown = estimateCost(tokensUsed, 'gpt-4o-mini');

    const response: ExtractDocumentDataResponse = {
      success: true,
      extractedData: hybridData.structuredData,
      confidence: hybridData.confidence,
      textLength,
      tokensUsed,
      ocrMetadata: hybridData.ocrMetadata,
      qualityScore,
      extractionMethod: hybridData.method,
      costBreakdown,
      processingTime: {
        total: totalProcessingTime,
        extraction: hybridData.processingTime,
        database: totalProcessingTime - hybridData.processingTime
      },
      processingLog
    };

    console.log(`✅ Document extraction completed in ${totalProcessingTime}ms`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Document extraction error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        extractedData: {},
        confidence: 0,
        textLength: 0,
        tokensUsed: 0,
        ocrMetadata: {},
        qualityScore: 0,
        extractionMethod: 'failed',
        costBreakdown: {},
        processingTime: {},
        processingLog: [`Error: ${error.message}`]
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});