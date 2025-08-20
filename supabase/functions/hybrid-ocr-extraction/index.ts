import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractionRequest {
  documentId?: string;
  documentPath?: string;
  fileUrl?: string;
  fileName?: string;
  clientType: 'individual' | 'business' | 'municipality' | 'ngo' | 'farm';
  documentType?: string;
  fallbackToOpenAI?: boolean;
  isTestDocument?: boolean;
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
          confidence?: number;
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

  const startTime = Date.now();
  let totalCost = 0;
  let processingLog: string[] = [];

  try {
    const { documentId, documentPath, fileUrl, fileName, clientType, documentType, fallbackToOpenAI = false, isTestDocument = false } = await req.json() as ExtractionRequest;
    
    console.log(`🔄 Starting hybrid extraction for ${fileName} (${clientType})`);
    processingLog.push(`Started: ${fileName} (${clientType})`);
    
    // Generate proper UUID for database operations if documentId is not a valid UUID
    let actualDocumentId = documentId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!documentId || !uuidRegex.test(documentId)) {
      // Generate a proper UUID for database operations
      actualDocumentId = crypto.randomUUID();
      console.log(`📄 Generated Document ID: ${actualDocumentId} (original: ${documentId || 'none'})`);
    } else {
      console.log(`📄 Document ID: ${actualDocumentId}`);
    }
    
    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('Missing OpenAI API key');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let ocrResult: any;
    let extractionMethod = 'hybrid_google_openai';

    // Step 1: Try Google Vision OCR first, fallback to OpenAI if needed
    if (googleApiKey && !fallbackToOpenAI) {
      try {
        console.log('📖 Step 1: Extracting text with Google Vision OCR...');
        processingLog.push('Attempting Google Vision OCR...');
        
        ocrResult = await extractTextWithGoogleVision(fileUrl, googleApiKey, fileName);
        totalCost += ocrResult.metadata.pageCount * 0.0015; // Google Vision cost
        
        console.log(`✅ Google Vision: ${ocrResult.text.length} chars, ${ocrResult.metadata.detectionType}`);
        processingLog.push(`Google Vision success: ${ocrResult.text.length} chars`);
        
      } catch (visionError) {
        console.warn(`⚠️ Google Vision failed: ${visionError.message}`);
        processingLog.push(`Google Vision failed: ${visionError.message}`);
        
        // Fallback to OpenAI extraction
        console.log('🔄 Falling back to OpenAI-only extraction...');
        processingLog.push('Falling back to OpenAI extraction...');
        
        ocrResult = await extractTextWithOpenAI(fileUrl, openaiApiKey, fileName);
        extractionMethod = 'openai_fallback';
        totalCost += (ocrResult.tokensUsed / 1000) * 0.03; // OpenAI cost
      }
    } else {
      // Direct OpenAI extraction (for testing or when Google Vision unavailable)
      console.log('🤖 Using OpenAI-only extraction...');
      processingLog.push('Using OpenAI-only extraction...');
      
      ocrResult = await extractTextWithOpenAI(fileUrl, openaiApiKey, fileName);
      extractionMethod = 'openai_only';
      totalCost += (ocrResult.tokensUsed / 1000) * 0.03;
    }
    
    // Check if OCR failed vs. successfully found no text
    if (!ocrResult || ocrResult.metadata === undefined) {
      throw new Error('Failed to extract text from document');
    }
    
    // If OCR succeeded but found no text, that's still a valid result
    if (!ocrResult.text) {
      console.log('ℹ️ OCR completed successfully but no text was detected in the document');
      processingLog.push('OCR completed - no text detected');
    }

    // Step 2: Map fields using OpenAI based on client type
    console.log('🤖 Step 2: Mapping fields with OpenAI...');
    processingLog.push('Starting field mapping...');
    
    const fieldMapping = await mapFieldsWithOpenAI(
      ocrResult.text, 
      clientType, 
      documentType, 
      fileName,
      openaiApiKey,
      ocrResult.metadata
    );
    
    totalCost += (fieldMapping.tokensUsed / 1000) * 0.03; // OpenAI field mapping cost
    processingLog.push(`Field mapping complete: ${fieldMapping.tokensUsed} tokens`);

    // Step 3: Enhanced quality validation
    const qualityScore = calculateDocumentQuality(ocrResult, fieldMapping);
    const finalConfidence = calculateEnhancedConfidence(fieldMapping.extractedData, qualityScore, clientType);
    
    processingLog.push(`Quality: ${qualityScore}, Confidence: ${finalConfidence}`);

    // Step 4: Store extraction results - handle test scenarios
    const totalProcessingTime = Date.now() - startTime;
    
    if (!isTestDocument && actualDocumentId !== documentId) {
      console.log('⚠️ Test document - skipping database storage');
      processingLog.push('Test document - database storage skipped');
    } else {
      try {
        // Try to update existing record first
        const { error: updateError } = await supabase
          .from('document_extractions')
          .update({
            status: 'completed',
            extracted_data: fieldMapping.extractedData,
            confidence_score: finalConfidence,
            extraction_type: extractionMethod,
            processing_time_ms: totalProcessingTime,
            model_used: extractionMethod.includes('google') ? 'google-vision + gpt-4o-mini' : 'gpt-4o-mini',
            ocr_used: true,
            pages_processed: ocrResult.metadata.pageCount || 1,
            detected_language: ocrResult.metadata.languagesDetected?.[0] || 'unknown',
            debug_info: {
              ocrMetadata: ocrResult.metadata,
              clientType,
              documentType,
              extractionMethod,
              qualityScore,
              processingLog,
              costBreakdown: {
                googleVision: extractionMethod.includes('google') ? ocrResult.metadata.pageCount * 0.0015 : 0,
                openai: (fieldMapping.tokensUsed / 1000) * 0.03,
                total: totalCost
              }
            },
            updated_at: new Date().toISOString()
          })
          .eq('document_id', actualDocumentId);

        if (updateError) {
          console.warn('Failed to update extraction record:', updateError.message);
          console.log('📝 Creating new extraction record...');
          
          // Create new record if update fails
          const { error: insertError } = await supabase
            .from('document_extractions')
            .insert({
              document_id: actualDocumentId,
              status: 'completed',
              extracted_data: fieldMapping.extractedData,
              confidence_score: finalConfidence,
              extraction_type: extractionMethod,
              processing_time_ms: totalProcessingTime,
              model_used: extractionMethod.includes('google') ? 'google-vision + gpt-4o-mini' : 'gpt-4o-mini',
              ocr_used: true,
              pages_processed: ocrResult.metadata.pageCount || 1,
              detected_language: ocrResult.metadata.languagesDetected?.[0] || 'unknown',
              debug_info: {
                ocrMetadata: ocrResult.metadata,
                clientType,
                documentType,
                extractionMethod,
                qualityScore,
                processingLog,
                costBreakdown: {
                  googleVision: extractionMethod.includes('google') ? ocrResult.metadata.pageCount * 0.0015 : 0,
                  openai: (fieldMapping.tokensUsed / 1000) * 0.03,
                  total: totalCost
                }
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error('Failed to create extraction record:', insertError);
            processingLog.push(`Database error: ${insertError.message}`);
          } else {
            console.log('✅ Extraction record created successfully');
            processingLog.push('Database record created successfully');
          }
        } else {
          console.log('✅ Extraction record updated successfully');
          processingLog.push('Database record updated successfully');
        }
      } catch (dbError: any) {
        console.error('Database operation failed:', dbError);
        processingLog.push(`Database operation failed: ${dbError.message}`);
        // Don't throw - continue with response even if DB fails
      }
    }

    console.log(`✅ ${extractionMethod} extraction completed for ${fileName}`);
    processingLog.push(`Completed successfully in ${totalProcessingTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      extractedData: fieldMapping.extractedData,
      confidence: finalConfidence,
      textLength: ocrResult.text.length,
      tokensUsed: fieldMapping.tokensUsed,
      ocrMetadata: ocrResult.metadata,
      qualityScore,
      extractionMethod,
      costBreakdown: {
        googleVisionCost: extractionMethod.includes('google') ? ocrResult.metadata.pageCount * 0.0015 : 0,
        openaiCost: (fieldMapping.tokensUsed / 1000) * 0.03,
        totalCost
      },
      processingTime: {
        totalTime: totalProcessingTime,
        ocrTime: ocrResult.metadata.processingTime || 0,
        fieldMappingTime: totalProcessingTime - (ocrResult.metadata.processingTime || 0)
      },
      processingLog
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('Hybrid extraction error:', error);
    processingLog.push(`Error after ${errorTime}ms: ${error.message}`);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      processingTime: errorTime,
      processingLog
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
    textQuality: 'high' | 'medium' | 'low';
    confidence: number;
  }
}> {
  const startTime = Date.now();
  
  try {
    console.log(`📖 Google Document AI: Processing ${fileName} via Document OCR API`);
    
    // Fetch file content with timeout and retry logic
    let fileResponse;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}: Fetching ${fileUrl}`);
        
        const fetchPromise = fetch(fileUrl);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('File fetch timeout after 15 seconds')), 15000)
        );
        
        fileResponse = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        if (fileResponse.ok) {
          console.log(`✅ File fetched successfully: ${fileResponse.status}`);
          break;
        }
        
        if (attempt === 2) throw new Error(`Failed to fetch file after 2 attempts: ${fileResponse.statusText}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (fetchError: any) {
        console.error(`❌ Fetch attempt ${attempt} failed:`, fetchError.message);
        if (attempt === 2) throw new Error(`File fetch failed: ${fetchError.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Convert to base64 with size limit
    const fileBuffer = await fileResponse!.arrayBuffer();
    const fileSizeMB = fileBuffer.byteLength / (1024 * 1024);
    
    if (fileSizeMB > 20) {
      throw new Error(`File too large: ${fileSizeMB.toFixed(1)}MB (max 20MB)`);
    }
    
    console.log(`📄 File size: ${fileSizeMB.toFixed(2)}MB`);
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    // Get Google Cloud credentials
    const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
    if (!projectId) {
      throw new Error('Google Cloud Project ID not configured');
    }
    
    // Try Document AI processors in order of preference
    const processorConfigs = [
      { type: 'FORM_PARSER_PROCESSOR', location: 'us' },
      { type: 'OCR_PROCESSOR', location: 'us' },
      { type: 'FORM_PARSER_PROCESSOR', location: 'eu' },
      { type: 'OCR_PROCESSOR', location: 'eu' }
    ];
    
    let documentAIResult = null;
    let usedProcessor = '';
    
    for (const config of processorConfigs) {
      try {
        console.log(`🔄 Trying Document AI ${config.type} in ${config.location}...`);
        
        // List available processors first to get actual processor ID
        const listUrl = `https://${config.location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${config.location}/processors`;
        const listResponse = await fetch(listUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!listResponse.ok) {
          console.log(`Failed to list processors: ${listResponse.status}`);
          continue;
        }
        
        const listData = await listResponse.json();
        const processor = listData.processors?.find((p: any) => p.type === config.type && p.state === 'ENABLED');
        
        if (!processor) {
          console.log(`No enabled ${config.type} processor found in ${config.location}`);
          continue;
        }
        
        const processorId = processor.name.split('/').pop();
        console.log(`Found processor: ${processorId}`);
        
        // Use the found processor
        const processUrl = `https://${config.location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${config.location}/processors/${processorId}:process`;
        
        const requestBody = {
          rawDocument: {
            content: base64Content,
            mimeType: fileResponse!.headers.get('content-type') || 'application/pdf'
          },
          fieldMask: 'text,entities,pages.pageNumber'
        };
        
        console.log('🚀 Calling Document AI API...');
        const processResponse = await fetch(processUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!processResponse.ok) {
          const errorText = await processResponse.text();
          console.log(`Document AI ${config.type} failed:`, errorText);
          continue;
        }
        
        documentAIResult = await processResponse.json();
        usedProcessor = `${config.type}_${config.location}`;
        console.log(`✅ Document AI ${config.type} successful`);
        break;
        
      } catch (processorError: any) {
        console.log(`Document AI ${config.type} error:`, processorError.message);
        continue;
      }
    }
    
    if (!documentAIResult) {
      // Fallback to Cloud Vision if Document AI completely fails
      console.log('📖 Document AI unavailable, falling back to Cloud Vision...');
      return await extractTextWithCloudVision(fileUrl, apiKey, fileName);
    }
    
    // Extract text from Document AI response
    const document = documentAIResult.document;
    if (!document) {
      throw new Error('No document processed by Document AI');
    }

    // Extract text from Document AI response
    let extractedText = document.text || '';
    let pageCount = document.pages?.length || 1;
    let detectedLanguages: string[] = [];
    
    // Extract language information
    if (document.pages) {
      for (const page of document.pages) {
        if (page.detectedLanguages) {
          for (const lang of page.detectedLanguages) {
            if (lang.languageCode && !detectedLanguages.includes(lang.languageCode)) {
              detectedLanguages.push(lang.languageCode);
            }
          }
        }
      }
    }
    
    if (!extractedText) {
      console.warn('⚠️ No text detected by Document AI');
      return {
        text: '',
        metadata: {
          detectionType: 'DOCUMENT_AI_OCR',
          pageCount: 0,
          languagesDetected: [],
          processingTime: Date.now() - startTime,
          textQuality: 'low',
          confidence: 0
        }
      };
    }

    console.log(`✅ Document AI: ${extractedText.length} chars, DOCUMENT_AI_OCR`);
    
    return {
      text: extractedText.trim(),
      metadata: {
        detectionType: 'DOCUMENT_AI_OCR',
        pageCount,
        languagesDetected: detectedLanguages.length ? detectedLanguages : ['unknown'],
        processingTime: Date.now() - startTime,
        textQuality: extractedText.length > 100 ? 'high' : extractedText.length > 20 ? 'medium' : 'low',
        confidence: Math.min(0.9, Math.max(0.3, extractedText.length / 500))
      }
    };

  } catch (error: any) {
    console.error('❌ Document AI extraction failed:', error.message);
    // Fallback to Cloud Vision
    return await extractTextWithCloudVision(fileUrl, apiKey, fileName);
  }
}

// Fallback Cloud Vision function
async function extractTextWithCloudVision(fileUrl: string, apiKey: string, fileName: string): Promise<{
  text: string;
  metadata: {
    detectionType: string;
    pageCount: number;
    languagesDetected: string[];
    processingTime: number;
    textQuality: 'high' | 'medium' | 'low';
    confidence: number;
  }
}> {
  const startTime = Date.now();
  
  try {
    console.log(`📖 Google Vision: Processing ${fileName} via Cloud Vision API (fallback)`);
    
    // Fetch and process file (reusing existing logic)
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }
    
    const fileBuffer = await fileResponse.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    const detectionType = fileName.toLowerCase().includes('.pdf') ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION';
    
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Content
          },
          features: [
            {
              type: detectionType,
              maxResults: 50
            }
          ],
          imageContext: {
            languageHints: ['fr', 'en', 'es', 'ro', 'pl']
          }
        }
      ]
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
      throw new Error(`Vision API HTTP ${visionResponse.status}: ${errorText}`);
    }

    const result = await visionResponse.json();
    const response = result.responses?.[0];
    
    if (response?.error) {
      throw new Error(`Vision API error: ${response.error.message}`);
    }

    let extractedText = '';
    if (response?.fullTextAnnotation) {
      extractedText = response.fullTextAnnotation.text || '';
    } else if (response?.textAnnotations?.[0]) {
      extractedText = response.textAnnotations[0].description || '';
    }

    return {
      text: extractedText.trim(),
      metadata: {
        detectionType: `${detectionType}_FALLBACK`,
        pageCount: 1,
        languagesDetected: ['unknown'],
        processingTime: Date.now() - startTime,
        textQuality: extractedText.length > 100 ? 'medium' : 'low',
        confidence: Math.min(0.7, Math.max(0.2, extractedText.length / 300))
      }
    };

  } catch (error: any) {
    console.error('❌ Cloud Vision fallback failed:', error.message);
    throw new Error(`Google Vision failed: ${error.message}`);
  }
          confidence: 0
        }
      };
    }

    // Assess text quality
    const textQuality = assessTextQuality(extractedText, avgConfidence);
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Google Vision Success: ${extractedText.length} chars, ${pageCount} pages, quality: ${textQuality} (${processingTime}ms)`);

    return {
      text: extractedText,
      metadata: {
        detectionType,
        pageCount,
        languagesDetected,
        processingTime,
        textQuality,
        confidence: avgConfidence
      }
    };
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Google Vision extraction failed (${processingTime}ms):`, error.message);
    
    // Enhanced error reporting
    if (error.message.includes('timeout')) {
      throw new Error(`Google Vision timeout: ${error.message}`);
    } else if (error.message.includes('404') || error.message.includes('403')) {
      throw new Error(`Google Vision API access error: ${error.message}`);
    } else if (error.message.includes('quota')) {
      throw new Error(`Google Vision quota exceeded: ${error.message}`);
    } else {
      throw new Error(`Google Vision failed: ${error.message}`);
    }
  }
}

async function extractTextWithOpenAI(fileUrl: string, apiKey: string, fileName: string): Promise<{
  text: string;
  tokensUsed: number;
  metadata: {
    detectionType: string;
    pageCount: number;
    languagesDetected: string[];
    processingTime: number;
    textQuality: 'high' | 'medium' | 'low';
    confidence: number;
  }
}> {
  const startTime = Date.now();
  
  try {
    console.log(`🤖 OpenAI: Processing ${fileName} with GPT-5`);
    
    // This is a simplified fallback - in practice, you'd need to implement
    // actual document processing with OpenAI (perhaps using vision models)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a fallback OCR system. Extract text from document URLs when other OCR methods fail.' 
          },
          { 
            role: 'user', 
            content: `Extract text from this document: ${fileUrl}. Return only the extracted text content.` 
          }
        ],
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const extractedText = result.choices[0].message.content;
    const tokensUsed = result.usage?.total_tokens || 0;
    
    const processingTime = Date.now() - startTime;
    
    return {
      text: extractedText,
      tokensUsed,
      metadata: {
        detectionType: 'OPENAI_FALLBACK',
        pageCount: 1,
        languagesDetected: ['unknown'],
        processingTime,
        textQuality: 'medium',
        confidence: 0.6
      }
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ OpenAI fallback error (${processingTime}ms):`, error);
    throw error;
  }
}

function assessTextQuality(text: string, confidence: number): 'high' | 'medium' | 'low' {
  // Quality assessment based on text characteristics and OCR confidence
  const wordCount = text.split(/\s+/).length;
  const avgWordLength = text.replace(/\s+/g, '').length / wordCount;
  const hasSpecialChars = /[^\w\s\-.,!?()]/g.test(text);
  const coherenceScore = text.split(/[.!?]/).filter(s => s.trim().length > 10).length / Math.max(1, text.split(/[.!?]/).length);
  
  let qualityScore = 0;
  
  // Confidence weight (40%)
  qualityScore += confidence * 0.4;
  
  // Text coherence weight (30%)
  qualityScore += coherenceScore * 0.3;
  
  // Word characteristics weight (30%)
  if (avgWordLength > 2 && avgWordLength < 15) qualityScore += 0.15;
  if (!hasSpecialChars || text.match(/[^\w\s\-.,!?()]/g)?.length < text.length * 0.05) qualityScore += 0.15;
  
  if (qualityScore >= 0.8) return 'high';
  if (qualityScore >= 0.6) return 'medium';
  return 'low';
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
    textQuality: 'high' | 'medium' | 'low';
    confidence: number;
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
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are an expert multilingual document analyzer specializing in extracting structured data from ${clientType} documents. You handle business forms, individual applications, municipal documents, agricultural subsidies, and NGO paperwork across multiple languages (French, English, Spanish, Romanian, Polish).` 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
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
    textQuality: 'high' | 'medium' | 'low';
    confidence: number;
  }
): string {
  const clientPrompts = {
    individual: `Extract personal information including: full_name, address, phone, email, date_of_birth, national_id (CNI), tax_number, income, employment_status, marital_status, dependents`,
    business: `Extract business information including: company_name, legal_form, registration_number (SIRET/SIREN), tax_id, vat_number, address, phone, email, website, industry_sector, employee_count, annual_revenue, founding_date, ceo_name`,
    municipality: `Extract municipal information including: municipality_name, administrative_level, mayor_name, population, budget, contact_info, website, services_offered, departments, administrative_code`,
    ngo: `Extract NGO information including: organization_name, legal_status, registration_number, mission_statement, activities, budget, funding_sources, board_members, contact_info, geographic_focus, beneficiaries`,
    farm: `Extract farm information including: farm_name, owner_name, address, total_hectares, legal_status, registration_number, revenue, certifications, land_use_types, livestock_present, irrigation_method`
  };

  const clientPrompt = clientPrompts[clientType as keyof typeof clientPrompts] || clientPrompts.individual;

  const ocrInfo = ocrMetadata ? `
OCR Analysis Results:
- Method: ${ocrMetadata.detectionType}
- Pages: ${ocrMetadata.pageCount}
- Languages: ${ocrMetadata.languagesDetected.join(', ') || 'Unknown'}
- Text Quality: ${ocrMetadata.textQuality} (confidence: ${(ocrMetadata.confidence * 100).toFixed(1)}%)
- Processing: ${ocrMetadata.processingTime}ms
` : '';

  return `
Analyze this document text extracted from "${fileName}" for a ${clientType} client and extract structured data.

${ocrInfo}

Document Context:
- File: ${fileName}
- Document Type: ${documentType || 'Unknown'}
- Text Length: ${text.length} characters
- Client Context: ${clientType.toUpperCase()}

EXTRACTION REQUIREMENTS:
${clientPrompt}

QUALITY GUIDELINES:
1. **Language Detection**: Identify primary document language
2. **Field Extraction**: Only extract clearly visible fields - use null for missing data
3. **Data Normalization**: 
   - Dates → YYYY-MM-DD format
   - Numbers → Proper integer/float types
   - Text → Trimmed, normalized case
   - Arrays → JSON arrays for lists
4. **Critical Field Priority**: Focus on essential fields for ${clientType} documents
5. **Confidence Scoring**: Base confidence on field completeness and text quality

TEXT TO ANALYZE:
${text.substring(0, 12000)}${text.length > 12000 ? '\n\n...[Text truncated - analyzed first 12,000 characters]' : ''}

Return JSON with this structure:
{
  "fields": {
    // All extracted fields based on client type requirements
  },
  "metadata": {
    "document_type": "specific detected document type",
    "primary_language": "ISO code (fr/en/es/ro/pl)",
    "secondary_languages": ["other", "detected", "languages"],
    "text_quality_assessment": "your assessment of OCR text quality",
    "critical_fields_found": ["list", "of", "essential", "fields", "extracted"],
    "extraction_challenges": "any difficulties or ambiguities encountered",
    "processing_notes": "important observations about this document"
  },
  "confidence": 0.85
}
`;
}

function calculateDocumentQuality(ocrResult: any, fieldMapping: any): number {
  let qualityScore = 0;
  
  // OCR quality (40%)
  if (ocrResult.metadata.textQuality === 'high') qualityScore += 0.4;
  else if (ocrResult.metadata.textQuality === 'medium') qualityScore += 0.25;
  else qualityScore += 0.1;
  
  // Field extraction success (40%)
  const extractedFields = Object.keys(fieldMapping.extractedData || {});
  const fieldSuccessRate = extractedFields.length > 0 ? 
    extractedFields.filter(key => fieldMapping.extractedData[key] !== null).length / extractedFields.length : 0;
  qualityScore += fieldSuccessRate * 0.4;
  
  // Language detection (20%)
  if (ocrResult.metadata.languagesDetected?.length > 0) {
    qualityScore += 0.2;
  } else {
    qualityScore += 0.1;
  }
  
  return Math.min(1.0, qualityScore);
}

function calculateEnhancedConfidence(extractedData: any, qualityScore: number, clientType: string): number {
  if (!extractedData.fields) return 0.3;
  
  const fields = extractedData.fields;
  const totalFields = Object.keys(fields).length;
  const filledFields = Object.values(fields).filter(value => 
    value !== null && value !== '' && value !== undefined
  ).length;
  
  if (totalFields === 0) return 0.3;
  
  // Define critical fields per client type
  const criticalFieldsByType = {
    individual: ['full_name', 'national_id', 'address'],
    business: ['company_name', 'registration_number', 'legal_form'],
    municipality: ['municipality_name', 'administrative_level'],
    ngo: ['organization_name', 'legal_status'],
    farm: ['farm_name', 'owner_name', 'total_hectares']
  };
  
  const criticalFields = criticalFieldsByType[clientType as keyof typeof criticalFieldsByType] || [];
  const criticalFieldsFound = criticalFields.filter(field => 
    fields[field] && fields[field] !== null && fields[field] !== ''
  ).length;
  
  const criticalFieldsScore = criticalFields.length > 0 ? 
    criticalFieldsFound / criticalFields.length : 1.0;
  
  // Weighted confidence calculation
  const fillRate = filledFields / totalFields;
  const baseConfidence = (fillRate * 0.5) + (criticalFieldsScore * 0.3) + (qualityScore * 0.2);
  
  return Math.max(0.3, Math.min(0.95, baseConfidence));
}

function calculateConfidence(extractedData: any): number {
  if (!extractedData.fields) return 0.5;
  
  const fields = extractedData.fields;
  const totalFields = Object.keys(fields).length;
  const filledFields = Object.values(fields).filter(value => 
    value !== null && value !== '' && value !== undefined
  ).length;
  
  if (totalFields === 0) return 0.3;
  
  const fillRate = filledFields / totalFields;
  return Math.max(0.3, Math.min(0.95, fillRate * 0.8 + 0.2));
}