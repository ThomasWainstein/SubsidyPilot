import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const googleCloudApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
const googleProjectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');

interface DocumentAITestRequest {
  fileUrl: string;
  fileName: string;
  testType: 'document_ai' | 'vision_api' | 'both';
}

async function downloadFile(url: string): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) {
    const base64Data = url.substring(url.indexOf(',') + 1);
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

// Test Vision API (your current method)
async function testVisionAPI(fileBuffer: ArrayBuffer): Promise<any> {
  if (!googleCloudApiKey) {
    throw new Error('Google Vision API key not configured');
  }

  const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
  
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleCloudApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64Data },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
      }]
    })
  });

  const data = await response.json();
  
  if (data.responses?.[0]?.textAnnotations?.[0]) {
    const textAnnotation = data.responses[0].textAnnotations[0];
    return {
      method: 'Vision API',
      extractedText: textAnnotation.description,
      confidence: textAnnotation.confidence || 0.8,
      details: data.responses[0]
    };
  }

  return {
    method: 'Vision API', 
    extractedText: '', 
    confidence: 0,
    details: data
  };
}

// Test Document AI (the recommended approach)
async function testDocumentAI(fileBuffer: ArrayBuffer): Promise<any> {
  if (!googleCloudApiKey || !googleProjectId) {
    throw new Error('Google Cloud API key or Project ID not configured');
  }

  const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
  
  // Using Document AI Form Parser
  const processorId = 'form-parser'; // Generic form parser
  const url = `https://documentai.googleapis.com/v1/projects/${googleProjectId}/locations/us/processors/${processorId}:process?key=${googleCloudApiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawDocument: {
        content: base64Data,
        mimeType: 'image/png'
      }
    })
  });

  const data = await response.json();
  
  if (data.document) {
    return {
      method: 'Document AI',
      extractedText: data.document.text || '',
      confidence: 0.9, // Document AI typically has higher confidence
      entities: data.document.entities || [],
      formFields: data.document.pages?.[0]?.formFields || [],
      details: data
    };
  }

  return {
    method: 'Document AI',
    extractedText: '',
    confidence: 0,
    error: data.error || 'No document data returned',
    details: data
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();

  try {
    console.log(`[${requestId}] 🧪 Document AI vs Vision API Test Started`);

    const body = await req.json();
    const { fileUrl, fileName, testType }: DocumentAITestRequest = body;

    if (!fileUrl || !fileName) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: fileUrl, fileName'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Download file
    console.log(`[${requestId}] 📥 Downloading file: ${fileUrl.substring(0, 100)}...`);
    const fileBuffer = await downloadFile(fileUrl);
    console.log(`[${requestId}] ✅ File downloaded: ${fileBuffer.byteLength} bytes`);

    const results: any = {
      fileName,
      fileSize: fileBuffer.byteLength,
      processingTime: 0,
      comparison: {}
    };

    // Test based on requested type
    if (testType === 'vision_api' || testType === 'both') {
      console.log(`[${requestId}] 👁️ Testing Vision API...`);
      try {
        const visionStart = Date.now();
        const visionResult = await testVisionAPI(fileBuffer);
        visionResult.processingTime = Date.now() - visionStart;
        results.comparison.visionAPI = visionResult;
        console.log(`[${requestId}] ✅ Vision API completed in ${visionResult.processingTime}ms`);
      } catch (error) {
        console.error(`[${requestId}] ❌ Vision API failed:`, error);
        results.comparison.visionAPI = {
          method: 'Vision API',
          error: error.message,
          processingTime: 0
        };
      }
    }

    if (testType === 'document_ai' || testType === 'both') {
      console.log(`[${requestId}] 📄 Testing Document AI...`);
      try {
        const docAIStart = Date.now();
        const docAIResult = await testDocumentAI(fileBuffer);
        docAIResult.processingTime = Date.now() - docAIStart;
        results.comparison.documentAI = docAIResult;
        console.log(`[${requestId}] ✅ Document AI completed in ${docAIResult.processingTime}ms`);
      } catch (error) {
        console.error(`[${requestId}] ❌ Document AI failed:`, error);
        results.comparison.documentAI = {
          method: 'Document AI',
          error: error.message,
          processingTime: 0
        };
      }
    }

    results.processingTime = Date.now() - startTime;
    
    // Add comparison summary
    if (results.comparison.visionAPI && results.comparison.documentAI) {
      results.summary = {
        winner: results.comparison.documentAI.confidence > results.comparison.visionAPI.confidence ? 'Document AI' : 'Vision API',
        visionAPIConfidence: results.comparison.visionAPI.confidence,
        documentAIConfidence: results.comparison.documentAI.confidence,
        visionAPITextLength: results.comparison.visionAPI.extractedText?.length || 0,
        documentAITextLength: results.comparison.documentAI.extractedText?.length || 0,
        documentAIEntities: results.comparison.documentAI.entities?.length || 0,
        documentAIFormFields: results.comparison.documentAI.formFields?.length || 0
      };
    }

    console.log(`[${requestId}] ✅ Test completed in ${results.processingTime}ms`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Test failed at ${processingTime}ms:`, error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      requestId,
      processingTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});