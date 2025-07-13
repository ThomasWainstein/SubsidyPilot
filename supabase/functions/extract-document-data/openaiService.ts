/**
 * OpenAI service for farm data extraction
 */

// Simplified core farm data schema focused on essential fields only
export interface ExtractedFarmData {
  // Core identification
  farmName?: string | null;
  ownerName?: string | null;
  address?: string | null;
  legalStatus?: string | null;
  registrationNumber?: string | null;
  country?: string | null;
  
  // Core farm details
  totalHectares?: number | null;
  activities?: string[];
  certifications?: string[];
  revenue?: string | null;
  
  // Processing metadata
  confidence?: number;
  extractedFields?: string[];
  error?: string;
  rawResponse?: string;
  debugInfo?: any;
}

// Multilingual system prompts for better European document support
const SYSTEM_PROMPTS = {
  en: `You are a document analysis assistant for a European agricultural platform.
Extract CORE farm information from the provided document. Focus only on clearly identifiable data.

STRICT SCHEMA - Return ONLY these fields as JSON:
{
  "farmName": "string or null",
  "ownerName": "string or null", 
  "address": "string or null",
  "legalStatus": "string or null (SRL, LLC, cooperative, individual, etc.)",
  "registrationNumber": "string or null (CUI, VAT, registration number)",
  "country": "string or null (Romania, France, Poland, etc.)",
  "totalHectares": "number or null",
  "activities": ["list of main farming activities"],
  "certifications": ["list of certifications/permits"],
  "revenue": "string or null",
  "confidence": 0.8,
  "extractedFields": ["field names that were found"]
}

RULES:
- Only extract data that is clearly stated in the document
- Do not guess or invent missing information
- Use null for missing values, [] for empty lists
- Be conservative with confidence scoring`,

  fr: `Vous êtes un assistant d'analyse de documents pour une plateforme agricole européenne.
Extrayez les informations ESSENTIELLES de la ferme du document fourni. Concentrez-vous uniquement sur les données clairement identifiables.

SCHÉMA STRICT - Retournez SEULEMENT ces champs en JSON:
{
  "farmName": "string ou null",
  "ownerName": "string ou null",
  "address": "string ou null", 
  "legalStatus": "string ou null (SARL, SAS, coopérative, individuel, etc.)",
  "registrationNumber": "string ou null (SIRET, numéro d'enregistrement)",
  "country": "string ou null (France, Roumanie, Pologne, etc.)",
  "totalHectares": "number ou null",
  "activities": ["liste des activités agricoles principales"],
  "certifications": ["liste des certifications/permis"],
  "revenue": "string ou null",
  "confidence": 0.8,
  "extractedFields": ["noms des champs trouvés"]
}

RÈGLES:
- Extraire seulement les données clairement indiquées dans le document
- Ne pas deviner ou inventer d'informations manquantes
- Utiliser null pour les valeurs manquantes, [] pour les listes vides`,

  ro: `Sunteți un asistent de analiză a documentelor pentru o platformă agricolă europeană.
Extrageți informațiile ESENȚIALE ale fermei din documentul furnizat. Concentrați-vă doar pe datele clar identificabile.

SCHEMĂ STRICTĂ - Returnați DOAR aceste câmpuri în JSON:
{
  "farmName": "string sau null",
  "ownerName": "string sau null",
  "address": "string sau null",
  "legalStatus": "string sau null (SRL, PFA, cooperativă, etc.)",
  "registrationNumber": "string sau null (CUI, număr înregistrare)",
  "country": "string sau null (România, Franța, Polonia, etc.)",
  "totalHectares": "number sau null", 
  "activities": ["lista activităților agricole principale"],
  "certifications": ["lista certificărilor/autorizațiilor"],
  "revenue": "string sau null",
  "confidence": 0.8,
  "extractedFields": ["numele câmpurilor găsite"]
}

REGULI:
- Extrageți doar datele clar indicate în document
- Nu ghiciți sau inventați informații lipsă
- Folosiți null pentru valori lipsă, [] pentru liste goale`
};

function detectDocumentLanguage(text: string): string {
  const languagePatterns = {
    ro: /(fermă|agricol|hectare|SRL|PFA|CUI|România)/i,
    fr: /(ferme|agricole|exploitation|SARL|SAS|SIRET|France)/i,
    pl: /(gospodarstwo|rolniczy|hektar|spółka|Polska)/i,
    es: /(granja|agrícola|hectárea|España)/i,
    de: /(betrieb|landwirtschaft|hektar|Deutschland)/i
  };

  for (const [lang, pattern] of Object.entries(languagePatterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }
  
  return 'en'; // Default to English
}

export async function extractFarmDataWithOpenAI(
  extractedText: string,
  openAIApiKey: string,
  debugInfo?: any
): Promise<ExtractedFarmData> {
  console.log(`🤖 Starting OpenAI extraction analysis...`);
  console.log(`📄 Document text length: ${extractedText.length} characters`);
  console.log(`📄 Text preview (first 500 chars): ${extractedText.substring(0, 500)}`);
  
  // Enhanced text validation
  if (!extractedText || extractedText.length < 30) {
    console.warn('⚠️ Document text too short or empty for meaningful extraction');
    return {
      error: 'Document text is empty or too short for extraction (minimum 30 characters required).',
      confidence: 0,
      extractedFields: [],
      rawResponse: `Input text length: ${extractedText.length}`,
      debugInfo
    };
  }

  // Check for readable content with better patterns
  const hasReadableContent = /[a-zA-ZÀ-ÿ]{8,}/.test(extractedText);
  const hasStructuredContent = /[a-zA-ZÀ-ÿ\s]{20,}/.test(extractedText);
  
  if (!hasReadableContent || !hasStructuredContent) {
    console.warn('⚠️ Document appears to contain insufficient readable text content');
    return {
      error: 'Document does not contain sufficient readable text. May be corrupted, scanned image, or non-text file.',
      confidence: 0,
      extractedFields: [],
      rawResponse: extractedText.substring(0, 300),
      debugInfo
    };
  }

  // Detect document language for better extraction
  const detectedLanguage = detectDocumentLanguage(extractedText);
  console.log(`🌍 Detected document language: ${detectedLanguage}`);
  
  // Use appropriate system prompt
  const systemPrompt = SYSTEM_PROMPTS[detectedLanguage as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.en;

  // Create optimized extraction prompt
  const extractionPrompt = `Analyze this ${detectedLanguage === 'en' ? 'English' : 'European'} agricultural document and extract farm information:

Document Content:
${extractedText.substring(0, 8000)}

${extractedText.length > 8000 ? '\n[Document truncated for analysis...]' : ''}

Extract only clearly visible information. If data is unclear or missing, use null/empty values.`;

  console.log(`🤖 Sending ${extractedText.length} characters to OpenAI (language: ${detectedLanguage})`);

  try {
    // Call OpenAI with optimized parameters
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
            content: systemPrompt
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        temperature: 0.3, // Slightly higher for better real-world extraction
        max_tokens: 1500,
        top_p: 0.9,
        frequency_penalty: 0.1
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`❌ OpenAI API error: ${aiResponse.status} ${aiResponse.statusText}`, errorText);
      throw new Error(`OpenAI API error: ${aiResponse.status} ${aiResponse.statusText} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const extractedContent = aiData.choices[0]?.message?.content;
    
    console.log(`✅ OpenAI API call successful`);
    console.log(`🔍 OpenAI raw response: ${extractedContent}`);
    console.log(`📊 OpenAI usage:`, aiData.usage);

    // Parse and validate response
    let extractedData: ExtractedFarmData;
    try {
      // Advanced cleaning of OpenAI response
      let cleanContent = extractedContent;
      
      // Remove markdown code blocks
      cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Remove any leading/trailing text that's not JSON
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      extractedData = JSON.parse(cleanContent);
      console.log(`✅ Successfully parsed extraction data:`, extractedData);
      
      // Calculate realistic confidence and extracted fields
      const coreFields = ['farmName', 'ownerName', 'address', 'legalStatus', 'registrationNumber', 'country', 'totalHectares', 'activities', 'certifications', 'revenue'];
      const actualFields = coreFields.filter(key => {
        const value = extractedData[key as keyof ExtractedFarmData];
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'string') return value.trim().length > 0;
        if (typeof value === 'number') return !isNaN(value) && value > 0;
        return true;
      });
      
      // Realistic confidence calculation
      const fieldCoverage = actualFields.length / coreFields.length;
      
      if (actualFields.length === 0) {
        extractedData.confidence = 0;
      } else {
        // Base confidence on field coverage and content quality
        const baseConfidence = Math.min(fieldCoverage * 0.7, 0.8);
        const hasKeyFields = actualFields.includes('farmName') || actualFields.includes('ownerName');
        const finalConfidence = hasKeyFields ? baseConfidence + 0.1 : baseConfidence * 0.8;
        extractedData.confidence = Math.min(Math.max(finalConfidence, 0.1), 0.95);
      }
      
      extractedData.extractedFields = actualFields;
      extractedData.debugInfo = {
        ...debugInfo,
        detectedLanguage,
        openaiUsage: aiData.usage,
        promptLength: extractionPrompt.length
      };
      
      console.log(`📊 Final extraction summary: ${actualFields.length}/${coreFields.length} core fields, ${Math.round(extractedData.confidence * 100)}% confidence`);
      console.log(`📋 Extracted fields: ${actualFields.join(', ')}`);
      
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.error('📄 Raw content that failed to parse:', extractedContent);
      
      extractedData = {
        error: `Failed to parse OpenAI response: ${(parseError as Error).message}. Response may not be valid JSON.`,
        confidence: 0,
        extractedFields: [],
        rawResponse: extractedContent,
        debugInfo: {
          ...debugInfo,
          detectedLanguage,
          parseError: (parseError as Error).message
        }
      };
    }

    return extractedData;
    
  } catch (apiError) {
    console.error('❌ OpenAI API call failed:', apiError);
    
    return {
      error: `OpenAI API call failed: ${(apiError as Error).message}`,
      confidence: 0,
      extractedFields: [],
      rawResponse: '',
      debugInfo: {
        ...debugInfo,
        apiError: (apiError as Error).message
      }
    };
  }
}