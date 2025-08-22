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
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] 📥 Starting file download from: ${url.substring(0, 100)}...`);
  
  if (!url || typeof url !== 'string') {
    console.error(`[${requestId}] ❌ Invalid file URL:`, url);
    throw new Error(`Invalid file URL provided: ${url}`);
  }
  
  // Handle base64 data URLs
  if (url.startsWith('data:')) {
    console.log(`[${requestId}] 📦 Processing base64 data URL`);
    try {
      const base64Data = url.substring(url.indexOf(',') + 1);
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`[${requestId}] ✅ Base64 data decoded successfully: ${bytes.byteLength} bytes`);
      return bytes.buffer;
    } catch (error) {
      console.error(`[${requestId}] ❌ Failed to decode base64 data:`, error);
      throw new Error(`Failed to decode base64 data: ${error.message}`);
    }
  }
  
  // Handle HTTP/HTTPS URLs
  try {
    console.log(`[${requestId}] 🌐 Making fetch request to: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Supabase-Edge-Function/1.0'
      }
    });
    
    console.log(`[${requestId}] 📊 Response status: ${response.status} ${response.statusText}`);
    console.log(`[${requestId}] 📋 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error(`[${requestId}] ❌ HTTP Error Response:`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    const contentLength = response.headers.get('content-length');
    console.log(`[${requestId}] 📏 Content-Length header: ${contentLength}`);
    
    const buffer = await response.arrayBuffer();
    console.log(`[${requestId}] ✅ File downloaded successfully: ${buffer.byteLength} bytes`);
    
    if (buffer.byteLength === 0) {
      console.error(`[${requestId}] ❌ Downloaded file is empty (0 bytes)`);
      throw new Error('Downloaded file is empty');
    }
    
    return buffer;
  } catch (error) {
    console.error(`[${requestId}] ❌ File download failed:`, {
      message: error.message,
      stack: error.stack,
      url: url
    });
    throw new Error(`File download failed: ${error.message}`);
  }
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

// Test functions for debugging individual components
async function testGoogleVisionAPI(requestId: string) {
  console.log(`[${requestId}] 🧪 Testing Google Vision API`);
  
  try {
    if (!googleVisionApiKey) {
      throw new Error('Google Vision API key not configured');
    }
    
    // Create a simple test image (1x1 white pixel)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: testImageData
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 1
          }]
        }]
      })
    });

    const data = await response.json();
    console.log(`[${requestId}] ✅ Google Vision API test response:`, data);
    
    return new Response(JSON.stringify({
      success: true,
      apiKey: googleVisionApiKey ? 'configured' : 'missing',
      projectId: googleProjectId || 'not configured',
      response: data,
      requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Google Vision API test failed:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      apiKey: googleVisionApiKey ? 'configured' : 'missing',
      projectId: googleProjectId || 'not configured',
      requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function testOpenAIAPI(requestId: string) {
  console.log(`[${requestId}] 🧪 Testing OpenAI API`);
  
  try {
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a test assistant. Respond with valid JSON only.' },
          { role: 'user', content: 'Return a simple JSON object with a test field set to true.' }
        ],
        max_tokens: 100
      }),
    });

    const data = await response.json();
    console.log(`[${requestId}] ✅ OpenAI API test response:`, data);
    
    return new Response(JSON.stringify({
      success: true,
      apiKey: openaiApiKey ? 'configured' : 'missing',
      response: data,
      requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ OpenAI API test failed:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      apiKey: openaiApiKey ? 'configured' : 'missing',
      requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function testFileDownload(requestId: string, testUrl: string) {
  console.log(`[${requestId}] 🧪 Testing file download: ${testUrl}`);
  
  try {
    if (!testUrl) {
      testUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    }
    
    const response = await fetch(testUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`[${requestId}] ✅ File download test successful: ${arrayBuffer.byteLength} bytes`);
    
    return new Response(JSON.stringify({
      success: true,
      url: testUrl,
      size: arrayBuffer.byteLength,
      contentType: response.headers.get('content-type'),
      requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ File download test failed:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      url: testUrl,
      requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();

  try {
    // Add test endpoints for debugging
    const url = new URL(req.url);
    if (url.searchParams.get('test') === 'vision') {
      return testGoogleVisionAPI(requestId);
    }
    if (url.searchParams.get('test') === 'openai') {
      return testOpenAIAPI(requestId);
    }
    if (url.searchParams.get('test') === 'download') {
      return testFileDownload(requestId, url.searchParams.get('url') || '');
    }
    if (url.searchParams.get('test') === 'health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        version: '1.0.0',
        requestId,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    console.log(`[${requestId}] 🔄 Hybrid extraction started`);
    console.log(`[${requestId}] 📝 Request body:`, JSON.stringify(body, null, 2));

    const { fileUrl, fileName, documentType, processingMode }: HybridExtractionRequest = body;

    // Validate input
    if (!fileUrl || !fileName || !documentType) {
      console.error(`[${requestId}] ❌ Missing required parameters`);
      return new Response(JSON.stringify({
        error: 'Missing required parameters: fileUrl, fileName, documentType',
        requestId,
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Download file
    console.log(`[${requestId}] 📥 Downloading file: ${fileUrl}`);
    const fileBuffer = await downloadFile(fileUrl);
    console.log(`[${requestId}] ✅ File downloaded: ${fileBuffer.byteLength} bytes`);

    let extractedText = '';
    let confidence = 0;
    let method: 'google_vision' | 'google_document_ai' | 'openai_fallback' = 'google_vision';

    // Try Google Vision API first
    console.log(`[${requestId}] 👁️ Calling Google Vision API`);
    try {
      const visionResult = await extractWithGoogleVision(fileBuffer);
      extractedText = visionResult.text;
      confidence = visionResult.confidence;
      method = 'google_vision';
      console.log(`[${requestId}] ✅ Google Vision extraction successful: ${extractedText.length} chars, confidence: ${confidence}`);
    } catch (error) {
      console.error(`[${requestId}] ❌ Google Vision failed:`, {
        message: error.message,
        stack: error.stack
      });
      method = 'openai_fallback';
      confidence = 0.3;
      
      // If Google Vision fails, try to extract with OpenAI directly from file metadata
      extractedText = `Document: ${fileName}\nType: ${documentType}\nFile processed but OCR extraction failed.`;
      console.log(`[${requestId}] 🔄 Falling back to OpenAI with basic document info`);
    }

    // Extract structured data with OpenAI (always try this step)
    console.log(`[${requestId}] 🤖 Calling OpenAI API for structured extraction`);
    let structuredData = {};
    try {
      const openaiResult = await extractWithOpenAI(extractedText, documentType);
      structuredData = openaiResult.structuredData;
      confidence = Math.max(confidence, openaiResult.confidence);
      console.log(`[${requestId}] ✅ OpenAI processing successful, confidence: ${openaiResult.confidence}`);
    } catch (error) {
      console.error(`[${requestId}] ❌ OpenAI processing failed:`, {
        message: error.message,
        stack: error.stack
      });
      confidence = Math.min(confidence, 0.5);
      // Provide basic structured data even if OpenAI fails
      structuredData = {
        fileName: fileName,
        documentType: documentType,
        processingStatus: 'partial_failure',
        extractionMethod: method
      };
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

    console.log(`[${requestId}] ✅ Hybrid extraction completed in ${processingTime}ms`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Hybrid extraction error at ${processingTime}ms:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      requestId,
      timestamp: new Date().toISOString(),
      extractedText: '',
      structuredData: {},
      ocrMetadata: {},
      confidence: 0,
      processingTime,
      method: 'openai_fallback'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});