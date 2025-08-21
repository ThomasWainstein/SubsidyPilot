import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleVisionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
const googleProjectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface HybridExtractionRequest {
  fileUrl: string;
  fileName: string;
  documentType: string;
  processingMode: 'sync' | 'async';
}

interface HybridExtractionResponse {
  extractedText: string;
  structuredData: object;
  ocrMetadata: object;
  confidence: number;
  processingTime: number;
  method: 'google_vision' | 'google_document_ai' | 'openai_fallback';
}

async function downloadFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

async function extractWithGoogleVision(fileBuffer: ArrayBuffer): Promise<{ text: string; confidence: number }> {
  if (!googleVisionApiKey) {
    throw new Error('Google Vision API key not configured');
  }

  const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
  
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        image: {
          content: base64Data
        },
        features: [{
          type: 'TEXT_DETECTION',
          maxResults: 1
        }]
      }]
    })
  });

  const data = await response.json();
  
  if (data.responses?.[0]?.textAnnotations?.[0]) {
    const textAnnotation = data.responses[0].textAnnotations[0];
    return {
      text: textAnnotation.description,
      confidence: textAnnotation.confidence || 0.8
    };
  }

  return { text: '', confidence: 0 };
}

async function extractWithOpenAI(text: string, documentType: string): Promise<{ structuredData: object; confidence: number }> {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const model = text.length > 10000 ? 'gpt-4.1-2025-04-14' : 'gpt-4o-mini';
  
  const prompt = `Extract structured data from this ${documentType} document. Return a JSON object with relevant fields based on the document type. Focus on key information like names, dates, amounts, and eligibility criteria.

Document text:
${text.substring(0, 8000)}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an expert document processor. Extract structured data and return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: model === 'gpt-4o-mini' ? 1500 : undefined,
      max_completion_tokens: model !== 'gpt-4o-mini' ? 1500 : undefined,
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    console.error('OpenAI API error:', data.error);
    throw new Error(`OpenAI API error: ${data.error.message}`);
  }

  try {
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const structuredData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    return {
      structuredData,
      confidence: 0.75
    };
  } catch (error) {
    console.error('Failed to parse OpenAI response:', error);
    return {
      structuredData: {},
      confidence: 0.3
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName, documentType, processingMode }: HybridExtractionRequest = await req.json();
    const startTime = Date.now();

    console.log(`🔄 Starting hybrid extraction for ${fileName} (${documentType})`);

    // Validate input
    if (!fileUrl || !fileName || !documentType) {
      throw new Error('Missing required parameters: fileUrl, fileName, documentType');
    }

    // Download file
    const fileBuffer = await downloadFile(fileUrl);
    console.log(`📥 Downloaded file: ${fileBuffer.byteLength} bytes`);

    let extractedText = '';
    let confidence = 0;
    let method: 'google_vision' | 'google_document_ai' | 'openai_fallback' = 'google_vision';

    // Try Google Vision API first
    try {
      const visionResult = await extractWithGoogleVision(fileBuffer);
      extractedText = visionResult.text;
      confidence = visionResult.confidence;
      method = 'google_vision';
      console.log(`✅ Google Vision extraction successful: ${extractedText.length} chars, confidence: ${confidence}`);
    } catch (error) {
      console.error('Google Vision failed:', error);
      method = 'openai_fallback';
      confidence = 0.3;
    }

    // Extract structured data with OpenAI
    let structuredData = {};
    if (extractedText) {
      try {
        const openaiResult = await extractWithOpenAI(extractedText, documentType);
        structuredData = openaiResult.structuredData;
        confidence = Math.max(confidence, openaiResult.confidence);
        console.log(`✅ OpenAI processing successful, confidence: ${openaiResult.confidence}`);
      } catch (error) {
        console.error('OpenAI processing failed:', error);
        confidence = Math.min(confidence, 0.5);
      }
    }

    const processingTime = Date.now() - startTime;

    const response: HybridExtractionResponse = {
      extractedText,
      structuredData,
      ocrMetadata: {
        detectionType: method,
        pageCount: 1,
        languagesDetected: ['auto'],
        processingTime,
        textQuality: confidence > 0.7 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
        confidence
      },
      confidence,
      processingTime,
      method
    };

    console.log(`✅ Hybrid extraction completed in ${processingTime}ms`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Hybrid extraction error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        extractedText: '',
        structuredData: {},
        ocrMetadata: {},
        confidence: 0,
        processingTime: 0,
        method: 'openai_fallback'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});