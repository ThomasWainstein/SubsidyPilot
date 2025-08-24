import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleVisionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

// Document schemas for validation
const DOCUMENT_SCHEMAS = {
  sirene: {
    fields: ['siren', 'siret', 'company_name', 'legal_form', 'address', 'ape_code', 'registration_date'],
    required: ['siren', 'siret', 'company_name'],
    validators: {
      siren: (value: string) => /^\d{9}$/.test(value),
      siret: (value: string) => /^\d{14}$/.test(value)
    }
  },
  invoice: {
    fields: ['invoice_number', 'date', 'supplier_name', 'client_name', 'amount', 'vat_number'],
    required: ['invoice_number', 'date', 'amount'],
    validators: {
      amount: (value: string) => /^\d+\.?\d*$/.test(value),
      vat_number: (value: string) => /^[A-Z]{2}\d{9,12}$/.test(value)
    }
  },
  certificate: {
    fields: ['certificate_type', 'issuer', 'issue_date', 'expiry_date', 'certificate_number'],
    required: ['certificate_type', 'issuer', 'issue_date'],
    validators: {}
  },
  financial: {
    fields: ['fiscal_year', 'revenue', 'expenses', 'net_income', 'company_name'],
    required: ['fiscal_year', 'company_name'],
    validators: {
      revenue: (value: string) => /^\d+\.?\d*$/.test(value),
      expenses: (value: string) => /^\d+\.?\d*$/.test(value)
    }
  }
};

// Processing tiers based on document complexity
const PROCESSING_TIERS = {
  fast: { model: 'gpt-4o-mini', max_tokens: 1500, cost_factor: 1 },
  balanced: { model: 'gpt-4.1-2025-04-14', max_completion_tokens: 2000, cost_factor: 3 },
  premium: { model: 'gpt-5-2025-08-07', max_completion_tokens: 3000, cost_factor: 5 }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting enhanced streaming job processor...');

    // Get all queued jobs ordered by priority and creation time
    const { data: queuedJobs, error: jobsError } = await supabase
      .from('document_processing_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (jobsError) {
      console.error('❌ Error fetching queued jobs:', jobsError);
      throw jobsError;
    }

    console.log(`📋 Found ${queuedJobs?.length || 0} queued jobs`);

    if (!queuedJobs || queuedJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No queued jobs found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;

    // Process each job with real document processing
    for (const job of queuedJobs) {
      try {
        console.log(`🚀 Processing job ${job.id} for document ${job.document_id}`);
        
        // Mark job as processing
        await supabase
          .from('document_processing_jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Create or update extraction record
        const extractionId = await ensureExtractionRecord(job);
        console.log(`📊 Using extraction ${extractionId} for job ${job.id}`);

        // Process through real stages
        await processDocumentPipeline(job, extractionId);
        
        processed++;
        
      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        await markJobFailed(job.id, error.message);
      }
    }

    console.log(`✅ Processed ${processed} jobs successfully`);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processed} jobs`,
        processed,
        total_queued: queuedJobs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Job processor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function ensureExtractionRecord(job: any): Promise<string> {
  const { data: existingExtraction } = await supabase
    .from('document_extractions')
    .select('id')
    .eq('document_id', job.document_id)
    .eq('source_table', 'universal')
    .single();

  if (existingExtraction) {
    return existingExtraction.id;
  }

  const { data: newExtraction, error } = await supabase
    .from('document_extractions')
    .insert({
      document_id: job.document_id,
      user_id: job.user_id,
      source_table: 'universal',
      status_v2: 'extracting',
      extracted_data: {},
      confidence_score: 0,
      progress_metadata: {
        job_id: job.id,
        stage: 'downloading',
        progress: 10,
        processing_method: 'enhanced-pipeline'
      }
    })
    .select('id')
    .single();

  if (error) throw error;
  return newExtraction.id;
}

async function processDocumentPipeline(job: any, extractionId: string) {
  const stages = [
    { name: 'downloading', progress: 10, handler: downloadDocument },
    { name: 'ocr-extraction', progress: 25, handler: performOCR },
    { name: 'classification', progress: 40, handler: classifyDocument },
    { name: 'structured-extraction', progress: 65, handler: extractStructuredData },
    { name: 'validation', progress: 85, handler: validateExtraction },
    { name: 'finalization', progress: 100, handler: finalizeExtraction }
  ];

  let processingContext = {
    job,
    extractionId,
    fileBuffer: null,
    extractedText: '',
    documentType: job.document_type || 'unknown',
    confidence: 0,
    structuredData: {},
    processingTier: 'fast',
    retryCount: 0
  };

  for (const stage of stages) {
    try {
      console.log(`🔄 Processing stage: ${stage.name} for job ${job.id}`);
      
      // Update progress
      await updateExtractionProgress(extractionId, stage.name, stage.progress);
      
      // Execute stage handler
      processingContext = await stage.handler(processingContext);
      
    } catch (error) {
      console.error(`❌ Stage ${stage.name} failed for job ${job.id}:`, error);
      
      // Implement auto-retry with better models
      if (stage.name === 'structured-extraction' && processingContext.retryCount < 2) {
        console.log(`🔄 Retrying ${stage.name} with better model...`);
        processingContext.retryCount++;
        processingContext.processingTier = processingContext.retryCount === 1 ? 'balanced' : 'premium';
        
        // Retry the current stage
        try {
          processingContext = await stage.handler(processingContext);
        } catch (retryError) {
          console.error(`❌ Retry failed for stage ${stage.name}:`, retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }

  // Mark job as completed
  await supabase
    .from('document_processing_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      processing_time_ms: Date.now() - new Date(job.created_at).getTime(),
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id);

  console.log(`✅ Job ${job.id} completed successfully`);
}

async function downloadDocument(context: any) {
  console.log(`📥 Downloading document: ${context.job.file_url}`);
  
  try {
    const response = await fetch(context.job.file_url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const fileBuffer = await response.arrayBuffer();
    console.log(`✅ Downloaded ${fileBuffer.byteLength} bytes`);
    
    return { ...context, fileBuffer };
  } catch (error) {
    throw new Error(`File download failed: ${error.message}`);
  }
}

async function performOCR(context: any) {
  console.log(`👁️ Performing OCR extraction`);
  
  if (!googleVisionApiKey) {
    throw new Error('Google Vision API key not configured');
  }

  try {
    // Convert ArrayBuffer to base64 safely to avoid stack overflow
    const uint8Array = new Uint8Array(context.fileBuffer);
    let base64Data = '';
    const chunkSize = 1024; // Smaller chunks to avoid apply() limits
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      // Convert chunk to string without using apply() which has size limits
      let chunkString = '';
      for (let j = 0; j < chunk.length; j++) {
        chunkString += String.fromCharCode(chunk[j]);
      }
      base64Data += btoa(chunkString);
    }
    
    console.log(`📄 File converted to base64: ${base64Data.length} characters`);
    
    // Make request to Google Vision API (works for both images and PDFs)
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Data },
          features: [
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            { type: 'TEXT_DETECTION', maxResults: 1 }
          ]
        }]
      })
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorResponse = await response.json();
        errorDetails = JSON.stringify(errorResponse, null, 2);
        console.error(`❌ Google Vision API error response:`, errorDetails);
      } catch (e) {
        errorDetails = await response.text();
        console.error(`❌ Google Vision API error text:`, errorDetails);
      }
      throw new Error(`Google Vision API returned ${response.status}: ${response.statusText}. Details: ${errorDetails}`);
    }

    const data = await response.json();
    console.log(`🔍 Google Vision API response:`, JSON.stringify(data, null, 2));
    
    let extractedText = '';
    let confidence = 0;

    // Check for errors in the response
    if (data.responses?.[0]?.error) {
      throw new Error(`Google Vision API error: ${data.responses[0].error.message}`);
    }

    // Try to extract text from fullTextAnnotation first (more complete)
    if (data.responses?.[0]?.fullTextAnnotation?.text) {
      extractedText = data.responses[0].fullTextAnnotation.text;
      confidence = 0.9;
      console.log(`✅ Full text extraction successful: ${extractedText.length} characters`);
    } 
    // Fallback to textAnnotations
    else if (data.responses?.[0]?.textAnnotations?.[0]?.description) {
      extractedText = data.responses[0].textAnnotations[0].description;
      confidence = 0.8;
      console.log(`✅ Text annotations extraction: ${extractedText.length} characters`);
    }
    // If no text found, provide helpful error
    else {
      console.log(`⚠️ No text detected in document. Response:`, data.responses?.[0]);
      extractedText = '';
      confidence = 0;
    }

    console.log(`✅ OCR completed: ${extractedText.length} characters, confidence: ${confidence}`);
    
    return { ...context, extractedText, confidence };
  } catch (error) {
    console.error(`❌ OCR processing error:`, error);
    throw new Error(`OCR failed: ${error.message}`);
  }
}

async function classifyDocument(context: any) {
  console.log(`🔍 Classifying document type`);
  
  // First try deterministic classification based on keywords
  const text = context.extractedText.toLowerCase();
  let detectedType = 'unknown';
  let classificationConfidence = 0.3;

  // Deterministic rules for common document types
  if (text.includes('siren') || text.includes('siret') || text.includes('rncs')) {
    detectedType = 'sirene';
    classificationConfidence = 0.95;
  } else if (text.includes('facture') || text.includes('invoice') || text.includes('tva')) {
    detectedType = 'invoice';
    classificationConfidence = 0.9;
  } else if (text.includes('certificat') || text.includes('certificate') || text.includes('attestation')) {
    detectedType = 'certificate';
    classificationConfidence = 0.85;
  } else if (text.includes('bilan') || text.includes('balance sheet') || text.includes('compte de résultat')) {
    detectedType = 'financial';
    classificationConfidence = 0.85;
  }

  // If deterministic classification failed, use AI
  if (classificationConfidence < 0.8 && openaiApiKey) {
    try {
      const classificationPrompt = `Classify this document type. Return only JSON: {"type": "sirene|invoice|certificate|financial|unknown", "confidence": 0.0-1.0}

Document text (first 1000 chars): ${context.extractedText.substring(0, 1000)}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a document classifier. Output only valid JSON.' },
            { role: 'user', content: classificationPrompt }
          ],
          max_tokens: 100
        }),
      });

      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const classification = JSON.parse(jsonMatch[0]);
        detectedType = classification.type;
        classificationConfidence = classification.confidence;
      }
    } catch (error) {
      console.error('AI classification failed:', error);
    }
  }

  console.log(`✅ Document classified as: ${detectedType} (confidence: ${classificationConfidence})`);
  
  return { 
    ...context, 
    documentType: detectedType,
    confidence: Math.max(context.confidence, classificationConfidence)
  };
}

async function extractStructuredData(context: any) {
  console.log(`🤖 Extracting structured data using ${context.processingTier} tier`);
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const schema = DOCUMENT_SCHEMAS[context.documentType] || DOCUMENT_SCHEMAS['certificate'];
  const tier = PROCESSING_TIERS[context.processingTier];
  
  const extractionPrompt = `Extract structured data from this ${context.documentType} document. Return only valid JSON matching this schema:

Required fields: ${schema.required.join(', ')}
All possible fields: ${schema.fields.join(', ')}

For each field, provide:
{
  "field_name": {
    "value": "extracted_value_or_null",
    "confidence": 0.0-1.0,
    "source_snippet": "text_where_found"
  }
}

Document text:
${context.extractedText.substring(0, 8000)}`;

  try {
    const requestBody: any = {
      model: tier.model,
      messages: [
        { role: 'system', content: 'You are a precise data extractor. Output only valid JSON with confidence scores.' },
        { role: 'user', content: extractionPrompt }
      ]
    };

    // Use correct token parameter based on model
    if (tier.model === 'gpt-4o-mini') {
      requestBody.max_tokens = tier.max_tokens;
    } else {
      requestBody.max_completion_tokens = tier.max_completion_tokens;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to extract valid JSON from AI response');
    }

    const structuredData = JSON.parse(jsonMatch[0]);
    
    // Calculate overall confidence based on field confidences
    const fieldConfidences = Object.values(structuredData)
      .map((field: any) => field.confidence || 0)
      .filter(conf => conf > 0);
    
    const avgConfidence = fieldConfidences.length > 0 
      ? fieldConfidences.reduce((a, b) => a + b, 0) / fieldConfidences.length
      : 0.3;

    console.log(`✅ Structured data extracted with confidence: ${avgConfidence}`);
    
    return { 
      ...context, 
      structuredData,
      confidence: Math.max(context.confidence, avgConfidence)
    };
  } catch (error) {
    throw new Error(`Structured extraction failed: ${error.message}`);
  }
}

async function validateExtraction(context: any) {
  console.log(`✔️ Validating extracted data`);
  
  const schema = DOCUMENT_SCHEMAS[context.documentType];
  if (!schema) {
    return context;
  }

  let validationScore = 1.0;
  const validationErrors = [];

  // Check required fields
  for (const requiredField of schema.required) {
    if (!context.structuredData[requiredField]?.value) {
      validationErrors.push(`Missing required field: ${requiredField}`);
      validationScore -= 0.2;
    }
  }

  // Run field validators
  for (const [fieldName, validator] of Object.entries(schema.validators)) {
    const fieldData = context.structuredData[fieldName];
    if (fieldData?.value && !validator(fieldData.value)) {
      validationErrors.push(`Invalid format for field: ${fieldName}`);
      validationScore -= 0.1;
    }
  }

  validationScore = Math.max(0, validationScore);
  
  console.log(`✅ Validation completed, score: ${validationScore}, errors: ${validationErrors.length}`);
  
  return {
    ...context,
    confidence: context.confidence * validationScore,
    validationErrors
  };
}

async function finalizeExtraction(context: any) {
  console.log(`🏁 Finalizing extraction`);
  
  // Determine if manual review is needed
  const needsReview = context.confidence < 0.7 || context.validationErrors?.length > 0;
  
  // Update final extraction record
  await supabase
    .from('document_extractions')
    .update({
      status_v2: needsReview ? 'needs_review' : 'completed',
      extracted_data: {
        document_type: context.documentType,
        fields: context.structuredData,
        processing_metadata: {
          tier_used: context.processingTier,
          retry_count: context.retryCount,
          validation_errors: context.validationErrors || [],
          needs_manual_review: needsReview,
          text_length: context.extractedText.length
        }
      },
      confidence_score: context.confidence,
      progress_metadata: {
        job_id: context.job.id,
        stage: 'completed',
        progress: 100,
        extraction_method: 'enhanced-pipeline',
        final_confidence: context.confidence,
        needs_review: needsReview
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', context.extractionId);

  console.log(`✅ Extraction finalized, needs review: ${needsReview}`);
  
  return context;
}

async function updateExtractionProgress(extractionId: string, stage: string, progress: number) {
  await supabase
    .from('document_extractions')
    .update({
      progress_metadata: {
        stage,
        progress,
        last_updated: new Date().toISOString(),
        extraction_method: 'enhanced-pipeline'
      },
      status_v2: progress === 100 ? 'completed' : 'extracting',
      updated_at: new Date().toISOString()
    })
    .eq('id', extractionId);
}

async function markJobFailed(jobId: string, errorMessage: string) {
  await supabase
    .from('document_processing_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}