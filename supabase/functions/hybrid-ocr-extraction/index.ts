import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractionRequest {
  documentId: string;
  fileUrl: string;
  fileName: string;
  clientType: 'individual' | 'business' | 'municipality' | 'ngo' | 'farm';
  documentType?: string;
}

interface GoogleVisionResponse {
  responses: Array<{
    textAnnotations: Array<{
      description: string;
      boundingPoly?: any;
    }>;
    fullTextAnnotation?: {
      text: string;
      pages: Array<{
        blocks: Array<{
          paragraphs: Array<{
            words: Array<{
              symbols: Array<{
                text: string;
                boundingBox?: any;
              }>;
            }>;
          }>;
        }>;
      }>;
    };
  }>;
}

interface OpenAIFieldMappingResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, fileUrl, fileName, clientType, documentType } = await req.json() as ExtractionRequest;
    
    console.log(`🔄 Starting hybrid extraction for ${fileName} (${clientType})`);
    
    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!googleApiKey || !openaiApiKey) {
      throw new Error('Missing required API keys');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Extract text using Google Cloud Vision OCR
    console.log('📖 Step 1: Extracting text with Google Vision OCR...');
    const extractedText = await extractTextWithGoogleVision(fileUrl, googleApiKey);
    
    if (!extractedText) {
      throw new Error('Failed to extract text from document');
    }

    console.log(`✅ OCR extracted ${extractedText.length} characters`);

    // Step 2: Map fields using OpenAI based on client type
    console.log('🤖 Step 2: Mapping fields with OpenAI...');
    const fieldMapping = await mapFieldsWithOpenAI(
      extractedText, 
      clientType, 
      documentType, 
      fileName,
      openaiApiKey
    );

    // Step 3: Store extraction results
    const { error: updateError } = await supabase
      .from('document_extractions')
      .update({
        status: 'completed',
        extracted_data: fieldMapping.extractedData,
        confidence_score: fieldMapping.confidence,
        extraction_type: 'hybrid_google_openai',
        processing_time_ms: Date.now(),
        model_used: 'google-vision + gpt-5-2025-08-07',
        updated_at: new Date().toISOString()
      })
      .eq('document_id', documentId);

    if (updateError) {
      console.error('Failed to update extraction:', updateError);
      throw updateError;
    }

    console.log(`✅ Hybrid extraction completed for ${fileName}`);

    return new Response(JSON.stringify({
      success: true,
      extractedData: fieldMapping.extractedData,
      confidence: fieldMapping.confidence,
      textLength: extractedText.length,
      tokensUsed: fieldMapping.tokensUsed,
      costBreakdown: {
        googleVisionCost: 0.0015, // ~$0.0015 per page
        openaiCost: (fieldMapping.tokensUsed / 1000) * 0.03, // Approximate
        totalCost: 0.0015 + ((fieldMapping.tokensUsed / 1000) * 0.03)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Hybrid extraction error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractTextWithGoogleVision(fileUrl: string, apiKey: string): Promise<string> {
  try {
    // First, fetch the file content
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }
    
    const fileBuffer = await fileResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    // Call Google Cloud Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      throw new Error(`Google Vision API error: ${visionResponse.statusText}`);
    }

    const result: GoogleVisionResponse = await visionResponse.json();
    
    if (result.responses?.[0]?.fullTextAnnotation?.text) {
      return result.responses[0].fullTextAnnotation.text;
    } else if (result.responses?.[0]?.textAnnotations?.[0]?.description) {
      return result.responses[0].textAnnotations[0].description;
    } else {
      throw new Error('No text found in document');
    }
    
  } catch (error) {
    console.error('Google Vision OCR error:', error);
    throw error;
  }
}

async function mapFieldsWithOpenAI(
  text: string, 
  clientType: string, 
  documentType: string | undefined, 
  fileName: string,
  apiKey: string
): Promise<{
  extractedData: any;
  confidence: number;
  tokensUsed: number;
}> {
  try {
    const prompt = buildFieldMappingPrompt(text, clientType, documentType, fileName);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: 'You are an expert document analyzer that extracts structured data from various document types including business forms, individual applications, municipal documents, and NGO paperwork.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result: OpenAIFieldMappingResponse = await response.json();
    const extractedData = JSON.parse(result.choices[0].message.content);
    
    return {
      extractedData: extractedData.fields || extractedData,
      confidence: extractedData.confidence || calculateConfidence(extractedData),
      tokensUsed: result.usage?.total_tokens || 0
    };
    
  } catch (error) {
    console.error('OpenAI field mapping error:', error);
    throw error;
  }
}

function buildFieldMappingPrompt(text: string, clientType: string, documentType: string | undefined, fileName: string): string {
  const clientPrompts = {
    individual: `Extract personal information including: full_name, address, phone, email, date_of_birth, national_id, tax_number, income, employment_status, marital_status, dependents`,
    business: `Extract business information including: company_name, legal_form, registration_number, tax_id, vat_number, address, phone, email, website, industry_sector, employee_count, annual_revenue, founding_date, ceo_name`,
    municipality: `Extract municipal information including: municipality_name, administrative_level, mayor_name, population, budget, contact_info, website, services_offered, departments, administrative_code`,
    ngo: `Extract NGO information including: organization_name, legal_status, registration_number, mission_statement, activities, budget, funding_sources, board_members, contact_info, geographic_focus, beneficiaries`,
    farm: `Extract farm information including: farm_name, owner_name, address, total_hectares, legal_status, registration_number, revenue, certifications, land_use_types, livestock_present, irrigation_method`
  };

  const clientPrompt = clientPrompts[clientType as keyof typeof clientPrompts] || clientPrompts.individual;

  return `
Analyze this document text and extract structured data based on the client type "${clientType}".

Document: ${fileName}
Type: ${documentType || 'Unknown'}

Text to analyze:
${text.substring(0, 8000)} ${text.length > 8000 ? '...[truncated]' : ''}

Instructions:
1. ${clientPrompt}
2. Only extract fields that are clearly present in the text
3. Use null for missing fields
4. Normalize data formats (dates as YYYY-MM-DD, numbers as integers/floats)
5. Detect the document language
6. Calculate confidence based on data completeness

Return a JSON object with this structure:
{
  "fields": {
    // Extracted fields based on client type
  },
  "metadata": {
    "document_type": "detected document type",
    "language": "detected language code", 
    "processing_notes": "any important notes"
  },
  "confidence": 0.85
}
`;
}

function calculateConfidence(extractedData: any): number {
  if (!extractedData.fields) return 0.5;
  
  const fields = extractedData.fields;
  const totalFields = Object.keys(fields).length;
  const filledFields = Object.values(fields).filter(value => value !== null && value !== '' && value !== undefined).length;
  
  if (totalFields === 0) return 0.3;
  
  const fillRate = filledFields / totalFields;
  return Math.max(0.3, Math.min(0.95, fillRate * 0.8 + 0.2));
}