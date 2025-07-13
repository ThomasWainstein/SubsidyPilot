import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

  try {
    const { documentId, fileUrl, fileName, documentType } = await req.json();
    
    console.log(`Starting AI extraction for document: ${fileName}`);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Download the document content
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to download document');
    }

    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    let extractedText = '';

    // For now, handle text-based extraction (PDFs would need additional processing)
    if (['txt', 'csv'].includes(fileExtension || '')) {
      extractedText = await fileResponse.text();
    } else {
      // For binary files, we'll extract metadata and basic info
      extractedText = `Document: ${fileName}, Type: ${documentType}, Size: ${fileResponse.headers.get('content-length')} bytes`;
    }

    // Create extraction prompt based on document type
    let extractionPrompt = '';
    if (documentType === 'ownership_proof' || documentType === 'legal') {
      extractionPrompt = `Extract farm/property information from this document. Look for:
- Property owner name
- Farm/property name
- Address/location
- Property size/hectares
- Registration numbers
- Legal entity information

Document content: ${extractedText.substring(0, 4000)}`;
    } else if (documentType === 'financial') {
      extractionPrompt = `Extract financial information from this document. Look for:
- Company/farm name
- Revenue amounts
- Financial year
- Bank account details
- Tax identification numbers

Document content: ${extractedText.substring(0, 4000)}`;
    } else {
      extractionPrompt = `Extract relevant agricultural/farm information from this document. Look for:
- Farm name
- Owner/operator name
- Location/address
- Agricultural activities
- Certifications
- Numbers, amounts, dates

Document content: ${extractedText.substring(0, 4000)}`;
    }

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
            content: `You are an AI that extracts structured data from agricultural documents. 
            Return a JSON object with extracted fields. Use null for fields not found.
            Always return valid JSON in this format:
            {
              "farmName": "string or null",
              "ownerName": "string or null", 
              "address": "string or null",
              "totalHectares": "number or null",
              "legalStatus": "string or null",
              "registrationNumber": "string or null",
              "revenue": "string or null",
              "certifications": ["array of strings"],
              "activities": ["array of strings"],
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
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const extractedContent = aiData.choices[0]?.message?.content;

    let extractedData;
    try {
      extractedData = JSON.parse(extractedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', extractedContent);
      extractedData = {
        error: 'Failed to parse extraction results',
        confidence: 0,
        extractedFields: []
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
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});