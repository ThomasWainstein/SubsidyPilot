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
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: any;
    }>;
    fullTextAnnotation?: {
      text: string;
      pages?: Array<{
        property?: {
          detectedLanguages?: Array<{
            languageCode: string;
            confidence?: number;
          }>;
        };
        blocks?: Array<{
          blockType?: string;
          paragraphs?: Array<{
            property?: any;
            words?: Array<{
              property?: any;
              symbols?: Array<{
                text: string;
                boundingBox?: any;
                property?: any;
              }>;
            }>;
          }>;
        }>;
      }>;
    };
    imagePropertiesAnnotation?: {
      dominantColors?: any;
      cropHints?: any;
    };
    error?: {
      code: number;
      message: string;
      details?: any[];
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
    const ocrResult = await extractTextWithGoogleVision(fileUrl, googleApiKey, fileName);
    
    if (!ocrResult.text) {
      throw new Error('Failed to extract text from document');
    }

    console.log(`✅ OCR extracted ${ocrResult.text.length} characters using ${ocrResult.metadata.detectionType}`);

    // Step 2: Map fields using OpenAI based on client type
    console.log('🤖 Step 2: Mapping fields with OpenAI...');
    const fieldMapping = await mapFieldsWithOpenAI(
      ocrResult.text, 
      clientType, 
      documentType, 
      fileName,
      openaiApiKey,
      ocrResult.metadata
    );

    // Step 3: Store extraction results with enhanced metadata
    const totalProcessingTime = Date.now();
    const { error: updateError } = await supabase
      .from('document_extractions')
      .update({
        status: 'completed',
        extracted_data: fieldMapping.extractedData,
        confidence_score: fieldMapping.confidence,
        extraction_type: 'hybrid_google_openai',
        processing_time_ms: totalProcessingTime,
        model_used: 'google-vision + gpt-5-2025-08-07',
        ocr_used: true,
        pages_processed: ocrResult.metadata.pageCount,
        detected_language: ocrResult.metadata.languagesDetected[0] || 'unknown',
        debug_info: {
          ocrMetadata: ocrResult.metadata,
          clientType,
          documentType,
          extractionMethod: 'hybrid_ocr_openai_field_mapping'
        },
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
      textLength: ocrResult.text.length,
      tokensUsed: fieldMapping.tokensUsed,
      ocrMetadata: ocrResult.metadata,
      costBreakdown: {
        googleVisionCost: ocrResult.metadata.pageCount * 0.0015, // $0.0015 per page
        openaiCost: (fieldMapping.tokensUsed / 1000) * 0.03, // ~$0.03 per 1K tokens  
        totalCost: (ocrResult.metadata.pageCount * 0.0015) + ((fieldMapping.tokensUsed / 1000) * 0.03)
      },
      processingTime: {
        ocrTime: ocrResult.metadata.processingTime,
        totalTime: Date.now(),
        breakdown: `OCR: ${ocrResult.metadata.processingTime}ms, Field Mapping: ${Date.now() - ocrResult.metadata.processingTime}ms`
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

async function extractTextWithGoogleVision(fileUrl: string, apiKey: string, fileName: string): Promise<{
  text: string;
  metadata: {
    detectionType: string;
    pageCount: number;
    languagesDetected: string[];
    processingTime: number;
  }
}> {
  const startTime = Date.now();
  
  try {
    console.log(`📖 Google Vision: Processing ${fileName}`);
    
    // Fetch file content
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }
    
    const fileBuffer = await fileResponse.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    const fileType = fileName.toLowerCase();
    
    // Determine optimal detection type based on file type and content
    const isDocumentFile = fileType.includes('.pdf') || fileType.includes('.tiff') || fileType.includes('.tif');
    const detectionType = isDocumentFile ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION';
    
    console.log(`🔍 Using ${detectionType} for ${fileName}`);

    // Enhanced Vision API request with multiple features for better accuracy
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Content,
          },
          features: [
            {
              type: detectionType,
              maxResults: 1,
            },
            // Add image properties to detect document quality
            {
              type: 'IMAGE_PROPERTIES',
              maxResults: 1,
            }
          ],
          // Enhanced image context for better OCR
          imageContext: {
            languageHints: ['fr', 'en', 'es', 'ro', 'pl'], // AgriTool supported languages
            cropHintsParams: {
              aspectRatios: [1.0, 0.75, 1.33] // Common document aspect ratios
            }
          }
        },
      ],
    };

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      throw new Error(`Google Vision API error: ${visionResponse.statusText} - ${errorText}`);
    }

    const result: GoogleVisionResponse = await visionResponse.json();
    const response = result.responses?.[0];
    
    if (!response) {
      throw new Error('No response from Google Vision API');
    }

    // Handle errors in the response
    if (response.error) {
      throw new Error(`Vision API error: ${response.error.message}`);
    }

    // Extract text with hierarchical fallback
    let extractedText = '';
    let pageCount = 0;
    let detectedLanguages: string[] = [];

    if (response.fullTextAnnotation) {
      extractedText = response.fullTextAnnotation.text || '';
      pageCount = response.fullTextAnnotation.pages?.length || 1;
      
      // Extract detected languages
      if (response.fullTextAnnotation.pages) {
        for (const page of response.fullTextAnnotation.pages) {
          if (page.property?.detectedLanguages) {
            for (const lang of page.property.detectedLanguages) {
              if (lang.languageCode && !detectedLanguages.includes(lang.languageCode)) {
                detectedLanguages.push(lang.languageCode);
              }
            }
          }
        }
      }
    } else if (response.textAnnotations?.[0]) {
      extractedText = response.textAnnotations[0].description || '';
      pageCount = 1;
    }

    if (!extractedText) {
      throw new Error('No text detected in document');
    }

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Google Vision: Extracted ${extractedText.length} characters in ${processingTime}ms`);
    console.log(`📊 Detection: ${detectionType}, Pages: ${pageCount}, Languages: ${detectedLanguages.join(', ')}`);

    return {
      text: extractedText,
      metadata: {
        detectionType,
        pageCount,
        languagesDetected: detectedLanguages,
        processingTime
      }
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Google Vision OCR error (${processingTime}ms):`, error);
    throw error;
  }
}

async function mapFieldsWithOpenAI(
  text: string, 
  clientType: string, 
  documentType: string | undefined, 
  fileName: string,
  apiKey: string,
  ocrMetadata?: {
    detectionType: string;
    pageCount: number;
    languagesDetected: string[];
    processingTime: number;
  }
): Promise<{
  extractedData: any;
  confidence: number;
  tokensUsed: number;
}> {
  try {
    const prompt = buildFieldMappingPrompt(text, clientType, documentType, fileName, ocrMetadata);
    
    console.log(`🤖 OpenAI: Processing ${clientType} document with ${text.length} characters`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: `You are an expert multilingual document analyzer specializing in extracting structured data from ${clientType} documents. You handle business forms, individual applications, municipal documents, agricultural subsidies, and NGO paperwork across multiple languages (French, English, Spanish, Romanian, Polish).` 
          },
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

function buildFieldMappingPrompt(
  text: string, 
  clientType: string, 
  documentType: string | undefined, 
  fileName: string,
  ocrMetadata?: {
    detectionType: string;
    pageCount: number;
    languagesDetected: string[];
    processingTime: number;
  }
): string {
  const clientPrompts = {
    individual: `Extract personal information including: full_name, address, phone, email, date_of_birth, national_id, tax_number, income, employment_status, marital_status, dependents`,
    business: `Extract business information including: company_name, legal_form, registration_number, tax_id, vat_number, address, phone, email, website, industry_sector, employee_count, annual_revenue, founding_date, ceo_name`,
    municipality: `Extract municipal information including: municipality_name, administrative_level, mayor_name, population, budget, contact_info, website, services_offered, departments, administrative_code`,
    ngo: `Extract NGO information including: organization_name, legal_status, registration_number, mission_statement, activities, budget, funding_sources, board_members, contact_info, geographic_focus, beneficiaries`,
    farm: `Extract farm information including: farm_name, owner_name, address, total_hectares, legal_status, registration_number, revenue, certifications, land_use_types, livestock_present, irrigation_method`
  };

  const clientPrompt = clientPrompts[clientType as keyof typeof clientPrompts] || clientPrompts.individual;

  const ocrInfo = ocrMetadata ? `
OCR Metadata:
- Detection Method: ${ocrMetadata.detectionType}
- Pages Processed: ${ocrMetadata.pageCount}
- Languages Detected: ${ocrMetadata.languagesDetected.join(', ') || 'Unknown'}
- OCR Processing Time: ${ocrMetadata.processingTime}ms
` : '';

  return `
Analyze this document text extracted via Google Vision OCR and extract structured data for a "${clientType}" client.

Document Information:
- File: ${fileName}
- Document Type: ${documentType || 'Unknown'}
- Text Length: ${text.length} characters

${ocrInfo}

Text to analyze:
${text.substring(0, 10000)} ${text.length > 10000 ? '\n\n...[Content truncated for processing efficiency]' : ''}

Extraction Instructions:
1. CLIENT TYPE FOCUS: ${clientPrompt}
2. LANGUAGE DETECTION: Identify the document language (French, English, Spanish, Romanian, Polish, etc.)
3. FIELD EXTRACTION: Only extract fields clearly present in the text - use null for missing data
4. DATA NORMALIZATION: 
   - Dates: Convert to YYYY-MM-DD format
   - Numbers: Use appropriate integer/float types
   - Text: Trim whitespace and normalize case
   - Arrays: Extract lists as JSON arrays
5. CONFIDENCE CALCULATION: Base confidence on:
   - Number of fields successfully extracted
   - Quality of OCR text (based on coherence)
   - Completeness of critical fields for this client type
6. MULTILINGUAL SUPPORT: Handle documents in detected languages appropriately

Return a JSON object with this exact structure:
{
  "fields": {
    // All extracted fields based on client type requirements above
  },
  "metadata": {
    "document_type": "specific detected document type",
    "primary_language": "ISO language code (e.g., 'fr', 'en', 'es')",
    "secondary_languages": ["array", "of", "other", "detected", "languages"],
    "text_quality": "assessment of OCR text quality (high/medium/low)",
    "processing_notes": "any important observations about the document",
    "critical_fields_found": ["list", "of", "most", "important", "fields", "found"],
    "extraction_challenges": "any difficulties encountered"
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