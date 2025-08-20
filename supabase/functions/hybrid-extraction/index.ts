import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractionResult {
  extractedFields: Record<string, any>;
  confidence: number;
  source: 'rule-based' | 'ai-based' | 'merged';
  timestamp: string;
  fieldsCount: number;
  debugInfo?: any;
}

interface ExtractionRequest {
  documentUrl: string;
  documentId: string;
  documentType?: string;
  forceAI?: boolean;
}

const extractionThresholds = {
  minFields: 8, // Reduced for demo - adjust based on your needs
  minConfidence: 0.6,
  mandatoryFields: ['farm_name', 'owner_name'], // Core required fields
};

// Rule-based extraction patterns for farm documents
const FARM_EXTRACTION_PATTERNS = {
  farm_name: [
    /farm\s*name\s*:?\s*([^\n\r]+)/i,
    /name\s*of\s*farm\s*:?\s*([^\n\r]+)/i,
    /farm\s*:?\s*([^\n\r]+)/i,
  ],
  owner_name: [
    /owner\s*:?\s*([^\n\r]+)/i,
    /farmer\s*:?\s*([^\n\r]+)/i,
    /proprietor\s*:?\s*([^\n\r]+)/i,
    /name\s*:?\s*([^\n\r]+)/i,
  ],
  address: [
    /address\s*:?\s*([^\n\r]+(?:\n[^\n\r]+)*)/i,
    /location\s*:?\s*([^\n\r]+)/i,
  ],
  phone: [
    /phone\s*:?\s*([+\d\s\-\(\)]+)/i,
    /tel\s*:?\s*([+\d\s\-\(\)]+)/i,
    /mobile\s*:?\s*([+\d\s\-\(\)]+)/i,
  ],
  email: [
    /email\s*:?\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i,
    /e-mail\s*:?\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i,
  ],
  total_hectares: [
    /total\s*area\s*:?\s*(\d+(?:\.\d+)?)\s*(?:ha|hectares?)/i,
    /area\s*:?\s*(\d+(?:\.\d+)?)\s*(?:ha|hectares?)/i,
    /size\s*:?\s*(\d+(?:\.\d+)?)\s*(?:ha|hectares?)/i,
  ],
  crops: [
    /crops?\s*:?\s*([^\n\r]+)/i,
    /cultivation\s*:?\s*([^\n\r]+)/i,
    /plants?\s*:?\s*([^\n\r]+)/i,
  ],
  livestock_present: [
    /livestock\s*:?\s*(yes|no|true|false|\d+)/i,
    /animals?\s*:?\s*(yes|no|true|false|\d+)/i,
  ],
  established_date: [
    /established\s*:?\s*(\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/i,
    /founded\s*:?\s*(\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/i,
    /since\s*:?\s*(\d{4})/i,
  ],
  legal_status: [
    /legal\s*status\s*:?\s*([^\n\r]+)/i,
    /entity\s*type\s*:?\s*([^\n\r]+)/i,
    /business\s*type\s*:?\s*([^\n\r]+)/i,
  ],
  tax_number: [
    /tax\s*(?:id|number)\s*:?\s*([A-Z0-9]+)/i,
    /vat\s*(?:id|number)\s*:?\s*([A-Z0-9]+)/i,
    /fiscal\s*code\s*:?\s*([A-Z0-9]+)/i,
  ],
};

async function extractTextFromDocument(documentUrl: string): Promise<string> {
  try {
    console.log('Fetching document text from:', documentUrl);
    
    // For PDF documents, you might want to use a PDF parsing service
    // For now, we'll assume it's text-based or already converted
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log('Extracted text length:', text.length);
    
    return text;
  } catch (error) {
    console.error('Error extracting text from document:', error);
    throw error;
  }
}

async function ruleBasedExtraction(documentUrl: string): Promise<ExtractionResult> {
  console.log('Starting rule-based extraction for:', documentUrl);
  
  try {
    const documentText = await extractTextFromDocument(documentUrl);
    const extractedFields: Record<string, any> = {};
    let totalMatches = 0;
    
    // Apply extraction patterns
    for (const [fieldName, patterns] of Object.entries(FARM_EXTRACTION_PATTERNS)) {
      for (const pattern of patterns) {
        const match = documentText.match(pattern);
        if (match && match[1]) {
          let value = match[1].trim();
          
          // Process specific field types
          if (fieldName === 'crops' && value) {
            extractedFields[fieldName] = value.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
          } else if (fieldName === 'livestock_present') {
            extractedFields[fieldName] = /yes|true|\d+/.test(value.toLowerCase());
          } else if (fieldName === 'total_hectares') {
            extractedFields[fieldName] = parseFloat(value);
          } else if (fieldName === 'established_date') {
            extractedFields[fieldName] = value;
          } else {
            extractedFields[fieldName] = value;
          }
          
          totalMatches++;
          break; // Use first matching pattern
        }
      }
    }
    
    // Calculate confidence based on matches and field completeness
    const fieldCount = Object.keys(extractedFields).length;
    const confidence = Math.min(0.9, (totalMatches / Object.keys(FARM_EXTRACTION_PATTERNS).length) * 0.8 + 0.2);
    
    console.log(`Rule-based extraction completed: ${fieldCount} fields, confidence: ${confidence}`);
    
    return {
      extractedFields,
      confidence,
      source: 'rule-based',
      timestamp: new Date().toISOString(),
      fieldsCount: fieldCount,
      debugInfo: {
        totalMatches,
        patternsChecked: Object.keys(FARM_EXTRACTION_PATTERNS).length,
        textLength: documentText.length,
      }
    };
  } catch (error) {
    console.error('Rule-based extraction failed:', error);
    return {
      extractedFields: {},
      confidence: 0,
      source: 'rule-based',
      timestamp: new Date().toISOString(),
      fieldsCount: 0,
      debugInfo: { error: error.message }
    };
  }
}

async function aiExtraction(documentUrl: string): Promise<ExtractionResult> {
  console.log('Starting AI extraction for:', documentUrl);
  
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  try {
    const documentText = await extractTextFromDocument(documentUrl);
    
    const prompt = `
Extract farm information from the following document text. Return a JSON object with these fields:
- farm_name: Name of the farm
- owner_name: Owner or farmer name
- address: Full address
- phone: Phone number
- email: Email address
- total_hectares: Total area in hectares (number)
- crops: Array of crops grown
- livestock_present: Boolean indicating if livestock is present
- established_date: When the farm was established
- legal_status: Legal entity type
- tax_number: Tax ID or VAT number
- country: Country
- region: Region or state
- irrigation_method: Irrigation method used
- certifications: Array of certifications

Only include fields where you have high confidence. Set missing or uncertain fields to null.

Document text:
${documentText.substring(0, 4000)} // Limit text to avoid token limits
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured farm data from documents. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 1500, // Updated for newer models
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI response received, parsing JSON...');
    
    // Parse AI response as JSON
    let extractedFields: Record<string, any>;
    try {
      extractedFields = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Try to extract JSON from response if wrapped in text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedFields = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI response is not valid JSON');
      }
    }
    
    // Remove null values and calculate confidence
    const cleanedFields = Object.fromEntries(
      Object.entries(extractedFields).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );
    
    const fieldCount = Object.keys(cleanedFields).length;
    const confidence = Math.min(0.95, Math.max(0.3, fieldCount / 10 * 0.8 + 0.2));
    
    console.log(`AI extraction completed: ${fieldCount} fields, confidence: ${confidence}`);
    
    return {
      extractedFields: cleanedFields,
      confidence,
      source: 'ai-based',
      timestamp: new Date().toISOString(),
      fieldsCount: fieldCount,
      debugInfo: {
        aiResponse,
        tokensUsed: data.usage?.total_tokens || 0,
      }
    };
  } catch (error) {
    console.error('AI extraction failed:', error);
    return {
      extractedFields: {},
      confidence: 0,
      source: 'ai-based',
      timestamp: new Date().toISOString(),
      fieldsCount: 0,
      debugInfo: { error: error.message }
    };
  }
}

function passesQualityThresholds(extraction: ExtractionResult): boolean {
  const fields = extraction.extractedFields || {};
  const fieldCount = Object.keys(fields).length;
  
  // Check minimum field count
  if (fieldCount < extractionThresholds.minFields) {
    console.log(`Failed field count threshold: ${fieldCount} < ${extractionThresholds.minFields}`);
    return false;
  }

  // Check minimum confidence
  if (extraction.confidence < extractionThresholds.minConfidence) {
    console.log(`Failed confidence threshold: ${extraction.confidence} < ${extractionThresholds.minConfidence}`);
    return false;
  }

  // Check mandatory fields
  for (const field of extractionThresholds.mandatoryFields) {
    if (!fields[field]) {
      console.log(`Missing mandatory field: ${field}`);
      return false;
    }
  }

  console.log('Extraction passes all quality thresholds');
  return true;
}

function mergeExtractions(
  ruleResult: ExtractionResult,
  aiResult: ExtractionResult
): ExtractionResult {
  console.log('Merging extraction results...');
  
  const mergedFields: Record<string, any> = { ...ruleResult.extractedFields };
  const fieldSources: Record<string, string> = {};
  
  // Mark rule-based fields
  for (const key of Object.keys(ruleResult.extractedFields)) {
    fieldSources[`${key}_source`] = 'rule-based';
  }

  // Merge AI fields, prioritizing higher confidence
  for (const key of Object.keys(aiResult.extractedFields)) {
    const shouldUseAI = 
      !mergedFields[key] || // Field not found in rule-based
      aiResult.confidence > ruleResult.confidence || // AI has higher overall confidence
      (Array.isArray(aiResult.extractedFields[key]) && !Array.isArray(mergedFields[key])); // AI provides array when rule-based has single value
    
    if (shouldUseAI) {
      mergedFields[key] = aiResult.extractedFields[key];
      fieldSources[`${key}_source`] = 'ai-based';
    }
  }

  // Add source metadata
  mergedFields._fieldSources = fieldSources;

  const finalConfidence = Math.max(ruleResult.confidence, aiResult.confidence);
  const totalFields = Object.keys(mergedFields).filter(k => !k.startsWith('_')).length;

  console.log(`Merge completed: ${totalFields} fields, confidence: ${finalConfidence}`);

  return {
    extractedFields: mergedFields,
    confidence: finalConfidence,
    source: 'merged',
    timestamp: new Date().toISOString(),
    fieldsCount: totalFields,
    debugInfo: {
      ruleBasedFields: Object.keys(ruleResult.extractedFields).length,
      aiBasedFields: Object.keys(aiResult.extractedFields).length,
      mergedFields: totalFields,
      ruleConfidence: ruleResult.confidence,
      aiConfidence: aiResult.confidence,
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentUrl, documentId, forceAI = false } = await req.json() as ExtractionRequest;
    
    if (!documentUrl) {
      return new Response(
        JSON.stringify({ error: 'Document URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting hybrid extraction for document: ${documentId}, forceAI: ${forceAI}`);

    let finalResult: ExtractionResult;

    if (forceAI) {
      // Skip rule-based if AI is forced
      console.log('AI extraction forced, skipping rule-based');
      finalResult = await aiExtraction(documentUrl);
    } else {
      // 1. Try rule-based extraction first
      const ruleResult = await ruleBasedExtraction(documentUrl);
      
      // 2. Check if rule-based extraction meets quality thresholds
      if (passesQualityThresholds(ruleResult)) {
        console.log('Rule-based extraction passed thresholds, using as final result');
        finalResult = ruleResult;
      } else {
        console.log('Rule-based extraction failed thresholds, triggering AI fallback');
        
        // 3. Fallback to AI extraction
        const aiResult = await aiExtraction(documentUrl);
        
        // 4. Merge results if both have data
        if (Object.keys(ruleResult.extractedFields).length > 0 && Object.keys(aiResult.extractedFields).length > 0) {
          finalResult = mergeExtractions(ruleResult, aiResult);
        } else if (Object.keys(aiResult.extractedFields).length > 0) {
          finalResult = aiResult;
        } else {
          finalResult = ruleResult; // Use rule-based even if below threshold
        }
      }
    }

    // Log extraction results for monitoring
    console.log(`Extraction completed:`, {
      documentId,
      source: finalResult.source,
      fieldsCount: finalResult.fieldsCount,
      confidence: finalResult.confidence,
      passedThresholds: passesQualityThresholds(finalResult)
    });

    return new Response(
      JSON.stringify(finalResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in hybrid extraction function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        extractedFields: {},
        confidence: 0,
        source: 'error',
        timestamp: new Date().toISOString(),
        fieldsCount: 0
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});