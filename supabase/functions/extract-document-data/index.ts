import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import PDF parsing library
import { PDFExtract } from 'https://esm.sh/pdf.js-extract@0.2.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    let extractedText = '';

    console.log(`🔍 Extracting text from ${fileExtension} file...`);

    try {
      if (['txt', 'csv'].includes(fileExtension || '')) {
        extractedText = await fileResponse.text();
      } else if (fileExtension === 'pdf') {
        // For PDF files, try basic text extraction using OpenAI vision
        const arrayBuffer = await fileResponse.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        // Use OpenAI to extract text from PDF as image
        const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract all readable text from this document. Return the text exactly as it appears, preserving structure and formatting where possible.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:application/pdf;base64,${base64}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000,
          }),
        });

        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          extractedText = visionData.choices[0]?.message?.content || '';
        } else {
          throw new Error('Vision API failed');
        }
      } else {
        // For other files (DOCX, XLSX), try to extract as text
        try {
          extractedText = await fileResponse.text();
        } catch {
          extractedText = `Document: ${fileName}, Type: ${documentType}, Extension: ${fileExtension}`;
        }
      }
    } catch (textError) {
      console.error('❌ Text extraction failed:', textError);
      extractedText = `Failed to extract text from ${fileName}. File type: ${fileExtension}, Size: ${fileResponse.headers.get('content-length')} bytes`;
    }

    // Log preview of extracted text for debugging
    const textPreview = extractedText.substring(0, 500);
    console.log(`📄 Text extraction preview (first 500 chars): ${textPreview}`);
    console.log(`📊 Total extracted text length: ${extractedText.length} characters`);

    if (extractedText.length < 50) {
      console.warn('⚠️ Warning: Very little text extracted from document');
    }

    // Create comprehensive extraction prompt with full document text
    const extractionPrompt = `Extract comprehensive farm/agricultural information from this document.

Document content:
${extractedText.substring(0, 6000)}`;

    // Call OpenAI for extraction
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a document analysis assistant for a European agricultural platform.
Your task is to extract detailed, structured farm/business profile data from agricultural documents.

INSTRUCTIONS:
- Carefully analyze the provided document text
- Extract every field in the schema below if it appears clearly in the document
- If a value is missing, set it to null (for string/number/boolean) or an empty array [] (for lists)
- Do not invent or hallucinate missing data
- Return only a valid, flat JSON object with these fields and lowercase keys:

{
  "farmName": "string or null",
  "ownerName": "string or null",
  "legalStatus": "string or null",
  "registrationNumber": "string or null",
  "address": "string or null",
  "region": "string or null",
  "country": "string or null",
  "department": "string or null",
  "totalHectares": "number or null",
  "landOwned": "number or null",
  "landRented": "number or null",
  "landUseTypes": ["list of strings"],
  "activities": ["list of strings"],
  "mainCrops": ["list of strings"],
  "livestockTypes": ["list of strings"],
  "organicFarming": "boolean or null",
  "precisionAgriculture": "boolean or null",
  "irrigationUsed": "boolean or null",
  "irrigationMethods": ["list of strings"],
  "certifications": ["list of strings"],
  "environmentalPractices": ["list of strings"],
  "carbonFootprintAssessment": "boolean or null",
  "annualRevenue": "string or number or null",
  "profitabilityStatus": "string or null",
  "receivedPreviousSubsidies": "boolean or null",
  "subsidiesReceived": ["list of strings"],
  "fullTimeEmployees": "number or null",
  "partTimeEmployees": "number or null",
  "youngFarmersInvolvement": "boolean or null",
  "genderBalanceInitiatives": "boolean or null",
  "socialInitiatives": ["list of strings"],
  "farmManagementSoftware": "boolean or null",
  "digitalInfrastructure": ["list of strings"],
  "renewableEnergyUse": ["list of strings"],
  "energyEfficiencyMeasures": ["list of strings"],
  "confidence": 0.8,
  "extractedFields": ["list of field names that were successfully extracted"]
}`
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`❌ OpenAI API error: ${aiResponse.status} ${aiResponse.statusText}`, errorText);
      throw new Error(`OpenAI API error: ${aiResponse.status} ${aiResponse.statusText} - ${errorText}`);
    }
    console.log('✅ OpenAI API call successful');

    const aiData = await aiResponse.json();
    const extractedContent = aiData.choices[0]?.message?.content;
    
    // Log raw OpenAI response for debugging
    console.log(`🔍 OpenAI raw response: ${extractedContent}`);
    console.log(`📊 OpenAI usage:`, aiData.usage);

    let extractedData;
    try {
      // Clean the response by removing markdown code blocks if present
      let cleanContent = extractedContent;
      if (cleanContent.includes('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      if (cleanContent.includes('```')) {
        cleanContent = cleanContent.replace(/```\n?/g, '');
      }
      
      extractedData = JSON.parse(cleanContent);
      console.log(`✅ Successfully parsed extraction data:`, extractedData);
      
      // Validate that we have the expected structure
      if (!extractedData.hasOwnProperty('confidence')) {
        extractedData.confidence = 0.5; // Default confidence
      }
      if (!extractedData.hasOwnProperty('extractedFields')) {
        extractedData.extractedFields = Object.keys(extractedData).filter(key => 
          extractedData[key] !== null && extractedData[key] !== undefined && 
          (Array.isArray(extractedData[key]) ? extractedData[key].length > 0 : true)
        );
      }
      
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.error('📄 Raw content that failed to parse:', extractedContent);
      extractedData = {
        error: `Failed to parse extraction results: ${parseError.message}`,
        confidence: 0,
        extractedFields: [],
        rawResponse: extractedContent
      };
    }

    // Store extraction results in database
    const { error: insertError } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        extracted_data: extractedData,
        extraction_type: 'openai_gpt4o',
        confidence_score: extractedData.confidence || 0,
        status: extractedData.error ? 'failed' : 'completed',
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to store extraction results:', insertError);
    }

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
    try {
      if (documentId) {
        await supabase
          .from('document_extractions')
          .insert({
            document_id: documentId,
            extracted_data: { error: 'Extraction failed' },
            extraction_type: 'openai_gpt4o',
            confidence_score: 0,
            status: 'failed',
            error_message: error.message,
            created_at: new Date().toISOString(),
          });
      }
    } catch (logError) {
      console.error('Failed to log extraction error:', logError);
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});