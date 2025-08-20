/**
 * OpenAI Service for Farm Data Extraction
 */

export interface OpenAIExtractionResult {
  extractedFields: Record<string, any>;
  confidence: number;
  detectedLanguage: string;
  promptUsed: string;
  rawResponse?: string;
  debugInfo?: any;
  error?: string;
}

/**
 * Extract farm data using OpenAI GPT models with table support
 */
export async function extractFarmDataWithOpenAI(
  documentText: string,
  apiKey: string,
  textDebugInfo: any,
  model: string = 'gpt-4o-mini',
  tableData?: any[]
): Promise<OpenAIExtractionResult> {
  console.log(`🤖 Starting OpenAI extraction with model: ${model}`);
  
  try {
    const prompt = buildFarmExtractionPrompt(documentText, tableData);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert farm data extraction AI. Extract structured information from farm documents and return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const rawResponse = result.choices[0].message.content;
    
    console.log('🤖 OpenAI response received, parsing...');
    
    // Parse the JSON response
    let parsedData: any;
    try {
      parsedData = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response as JSON:', parseError);
      console.log('Raw response:', rawResponse);
      throw new Error('AI returned invalid JSON format');
    }

    // Extract the main fields and metadata
    const extractedFields = parsedData.extractedFields || parsedData;
    const confidence = parsedData.confidence || calculateConfidence(extractedFields);
    const detectedLanguage = parsedData.detectedLanguage || detectLanguage(documentText);

    // Clean extracted fields
    const cleanedFields = cleanExtractedFields(extractedFields);
    
    console.log(`✅ OpenAI extraction completed: ${Object.keys(cleanedFields).length} fields, confidence: ${confidence}`);

    return {
      extractedFields: cleanedFields,
      confidence,
      detectedLanguage,
      promptUsed: 'farm_data_extraction_v1',
      rawResponse,
      debugInfo: {
        model,
        tokensUsed: result.usage?.total_tokens || 0,
        textExtractionMethod: textDebugInfo.extractionMethod,
        originalTextLength: documentText.length
      }
    };
  } catch (error) {
    console.error('❌ OpenAI extraction failed:', error);
    return {
      extractedFields: {},
      confidence: 0,
      detectedLanguage: 'unknown',
      promptUsed: 'farm_data_extraction_v1',
      error: error.message,
      debugInfo: {
        model,
        failed: true,
        errorType: error.constructor.name
      }
    };
  }
}

/**
 * Build extraction prompt for farm documents with table support
 */
function buildFarmExtractionPrompt(documentText: string, tableData?: any[]): string {
  // Limit text to avoid token limits
  const maxTextLength = 6000; // Reduced to make room for table data
  const truncatedText = documentText.length > maxTextLength 
    ? documentText.substring(0, maxTextLength) + '\n... [text truncated]'
    : documentText;

  let tableSection = '';
  if (tableData && tableData.length > 0) {
    tableSection = `

STRUCTURED TABLES FOUND:
${tableData.map((table, index) => `
Table ${index + 1}:
Headers: ${table.headers.join(' | ')}
Sample Rows (first 5):
${table.rows.slice(0, 5).map((row: string[]) => row.join(' | ')).join('\n')}
${table.rows.length > 5 ? `... and ${table.rows.length - 5} more rows` : ''}
`).join('\n')}
`;
  }

  return `
Extract farm information from this document and return a JSON object with the following structure:

{
  "extractedFields": {
    "farmName": "Name of the farm",
    "ownerName": "Owner or farmer name", 
    "address": "Complete address",
    "locality": "City/town",
    "department": "Department/region/state",
    "country": "Country",
    "phone": "Phone number",
    "email": "Email address",
    "totalHectares": "Total area in hectares (number)",
    "landUseTypes": ["Array of land use types or crops"],
    "livestockPresent": "Boolean indicating livestock presence",
    "livestock": "Description of livestock",
    "legalStatus": "Legal entity type (SRL, PFA, etc.)",
    "cnpOrCui": "Tax ID or registration number",
    "environmentalPermit": "Boolean if environmental permit mentioned",
    "techDocs": "Boolean if technical documentation mentioned",
    "irrigationMethod": "Irrigation method if mentioned",
    "staffCount": "Number of employees (number)",
    "certifications": ["Array of certifications"],
    "revenue": "Revenue information if mentioned",
    "softwareUsed": ["Array of software/systems used"],
    "tableData": "Summary of key information found in tables"
  },
  "confidence": "Confidence score 0-1",
  "detectedLanguage": "Language of the document (en/fr/ro/etc)",
  "tablesProcessed": "Number of tables analyzed"
}

IMPORTANT RULES:
1. Only include fields where you have high confidence
2. Use null for missing or uncertain information
3. For booleans, use true/false or null
4. For numbers, provide actual numeric values
5. For arrays, provide actual arrays even if single item
6. Extract key information from both narrative text AND tables
7. When tables contain farm data, prioritize table information over text
8. Return ONLY valid JSON, no additional text

Document text:
${truncatedText}${tableSection}
`;
}

/**
 * Calculate confidence based on extracted fields
 */
function calculateConfidence(extractedFields: Record<string, any>): number {
  const fields = Object.values(extractedFields).filter(v => v !== null && v !== undefined && v !== '');
  const fieldCount = fields.length;
  
  // Base confidence on number of fields extracted
  let confidence = Math.min(0.9, fieldCount / 15 * 0.8 + 0.1);
  
  // Boost confidence for key fields
  const keyFields = ['farmName', 'ownerName', 'address', 'totalHectares'];
  const keyFieldsPresent = keyFields.filter(field => extractedFields[field]).length;
  confidence += (keyFieldsPresent / keyFields.length) * 0.2;
  
  return Math.min(0.95, confidence);
}

/**
 * Detect document language (basic implementation)
 */
function detectLanguage(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Simple language detection based on common words
  if (lowerText.includes('proprietar') || lowerText.includes('judet') || lowerText.includes('hectare')) {
    return 'ro';
  } else if (lowerText.includes('propriétaire') || lowerText.includes('exploitation') || lowerText.includes('département')) {
    return 'fr';
  } else if (lowerText.includes('owner') || lowerText.includes('farm') || lowerText.includes('acres')) {
    return 'en';
  }
  
  return 'unknown';
}

/**
 * Clean and validate extracted fields
 */
function cleanExtractedFields(fields: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    
    // Clean string values
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && trimmed !== 'null' && trimmed !== 'undefined') {
        cleaned[key] = trimmed;
      }
    } 
    // Keep arrays, numbers, booleans as-is
    else if (Array.isArray(value) || typeof value === 'number' || typeof value === 'boolean') {
      cleaned[key] = value;
    }
    // Handle objects
    else if (typeof value === 'object') {
      const cleanedObject = cleanExtractedFields(value);
      if (Object.keys(cleanedObject).length > 0) {
        cleaned[key] = cleanedObject;
      }
    }
  }
  
  return cleaned;
}
