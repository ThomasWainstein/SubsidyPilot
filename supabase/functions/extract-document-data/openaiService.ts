/**
 * OpenAI service with multilingual prompts and centralized schema
 */

// Centralized schema matching latest farm profile structure
export interface ExtractedFarmData {
  // Core identification - exact field names from farm profile
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
  detectedLanguage?: string;
  promptUsed?: string;
}

// Comprehensive multilingual system prompts
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
- Be conservative with confidence scoring (0.1-0.95)
- Focus on agricultural, legal, and business information`,

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
- Utiliser null pour les valeurs manquantes, [] pour les listes vides
- Être conservateur avec le score de confiance (0.1-0.95)`,

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
- Folosiți null pentru valori lipsă, [] pentru liste goale
- Fiți conservatori cu scorul de încredere (0.1-0.95)`,

  es: `Eres un asistente de análisis de documentos para una plataforma agrícola europea.
Extrae información ESENCIAL de la granja del documento proporcionado. Enfócate solo en datos claramente identificables.

ESQUEMA ESTRICTO - Devuelve SOLO estos campos en JSON:
{
  "farmName": "string o null",
  "ownerName": "string o null",
  "address": "string o null",
  "legalStatus": "string o null (SL, cooperativa, individual, etc.)",
  "registrationNumber": "string o null (CIF, número de registro)",
  "country": "string o null (España, Francia, Polonia, etc.)",
  "totalHectares": "number o null",
  "activities": ["lista de actividades agrícolas principales"],
  "certifications": ["lista de certificaciones/permisos"],
  "revenue": "string o null",
  "confidence": 0.8,
  "extractedFields": ["nombres de campos encontrados"]
}

REGLAS:
- Extraer solo datos claramente indicados en el documento
- No adivinar o inventar información faltante
- Usar null para valores faltantes, [] para listas vacías
- Ser conservador con la puntuación de confianza (0.1-0.95)`,

  pl: `Jesteś asystentem analizy dokumentów dla europejskiej platformy rolniczej.
Wyodrębnij PODSTAWOWE informacje o gospodarstwie z dostarczonego dokumentu. Skup się tylko na jasno identyfikowalnych danych.

ŚCISŁY SCHEMAT - Zwróć TYLKO te pola w JSON:
{
  "farmName": "string lub null",
  "ownerName": "string lub null",
  "address": "string lub null",
  "legalStatus": "string lub null (sp. z o.o., spółdzielnia, osoba fizyczna, etc.)",
  "registrationNumber": "string lub null (NIP, numer rejestracji)",
  "country": "string lub null (Polska, Francja, Rumunia, etc.)",
  "totalHectares": "number lub null",
  "activities": ["lista głównych działalności rolniczych"],
  "certifications": ["lista certyfikatów/pozwoleń"],
  "revenue": "string lub null",
  "confidence": 0.8,
  "extractedFields": ["nazwy znalezionych pól"]
}

ZASADY:
- Wyodrębniaj tylko dane jasno wskazane w dokumencie
- Nie zgaduj ani nie wymyślaj brakujących informacji
- Używaj null dla brakujących wartości, [] dla pustych list
- Bądź konserwatywny z oceną pewności (0.1-0.95)`,

  de: `Sie sind ein Dokumentenanalysesystem für eine europäische Landwirtschaftsplattform.
Extrahieren Sie WESENTLICHE Betriebsinformationen aus dem bereitgestellten Dokument. Konzentrieren Sie sich nur auf klar identifizierbare Daten.

STRIKTES SCHEMA - Geben Sie NUR diese Felder in JSON zurück:
{
  "farmName": "string oder null",
  "ownerName": "string oder null",
  "address": "string oder null",
  "legalStatus": "string oder null (GmbH, Genossenschaft, Einzelunternehmen, etc.)",
  "registrationNumber": "string oder null (Steuernummer, Registrierungsnummer)",
  "country": "string oder null (Deutschland, Frankreich, Polen, etc.)",
  "totalHectares": "number oder null",
  "activities": ["Liste der hauptsächlichen landwirtschaftlichen Aktivitäten"],
  "certifications": ["Liste der Zertifizierungen/Genehmigungen"],
  "revenue": "string oder null",
  "confidence": 0.8,
  "extractedFields": ["Namen der gefundenen Felder"]
}

REGELN:
- Nur klar im Dokument angegebene Daten extrahieren
- Nicht raten oder fehlende Informationen erfinden
- null für fehlende Werte verwenden, [] für leere Listen
- Konservativ bei der Vertrauensbewertung sein (0.1-0.95)`
};

function detectDocumentLanguage(text: string): string {
  console.log(`🌍 Detecting language from text sample: ${text.substring(0, 200)}...`);
  
  const languagePatterns = {
    ro: /(fermă|agricol|hectare|SRL|PFA|CUI|România|societate|exploatație|teren|culturi)/i,
    fr: /(ferme|agricole|exploitation|SARL|SAS|SIRET|France|société|hectare|cultures)/i,
    pl: /(gospodarstwo|rolniczy|hektar|spółka|Polska|działalność|uprawa|hodowla)/i,
    es: /(granja|agrícola|hectárea|España|sociedad|explotación|cultivo|ganadería)/i,
    de: /(betrieb|landwirtschaft|hektar|Deutschland|gesellschaft|anbau|viehzucht)/i
  };

  for (const [lang, pattern] of Object.entries(languagePatterns)) {
    if (pattern.test(text)) {
      console.log(`✅ Language detected: ${lang}`);
      return lang;
    }
  }
  
  console.log(`⚠️ No specific language detected, defaulting to English`);
  return 'en'; // Default to English
}

export async function extractFarmDataWithOpenAI(
  extractedText: string,
  openAIApiKey: string,
  debugInfo?: any
): Promise<ExtractedFarmData> {
  console.log(`🤖 Starting OpenAI extraction analysis...`);
  console.log(`📄 Document text length: ${extractedText.length} characters`);
  console.log(`📄 Text preview (first 300 chars): ${extractedText.substring(0, 300)}`);
  
  // Enhanced text validation
  if (!extractedText || extractedText.length < 30) {
    console.warn('⚠️ Document text too short or empty for meaningful extraction');
    return {
      error: 'Document text is empty or too short for extraction (minimum 30 characters required).',
      confidence: 0,
      extractedFields: [],
      rawResponse: `Input text length: ${extractedText.length}`,
      debugInfo,
      detectedLanguage: 'unknown',
      promptUsed: 'none'
    };
  }

  // Check for readable content with multilingual patterns
  const hasReadableContent = /[a-zA-ZÀ-ÿĀ-žА-я]{8,}/.test(extractedText);
  const hasStructuredContent = /[a-zA-ZÀ-ÿĀ-žА-я\s]{20,}/.test(extractedText);
  
  if (!hasReadableContent || !hasStructuredContent) {
    console.warn('⚠️ Document appears to contain insufficient readable text content');
    return {
      error: 'Document does not contain sufficient readable text. May be corrupted, scanned image, or non-text file.',
      confidence: 0,
      extractedFields: [],
      rawResponse: extractedText.substring(0, 300),
      debugInfo,
      detectedLanguage: 'insufficient_text',
      promptUsed: 'none'
    };
  }

  // Detect document language with logging
  const detectedLanguage = detectDocumentLanguage(extractedText);
  console.log(`🌍 Final detected language: ${detectedLanguage}`);
  
  // Use appropriate system prompt with fallback
  const systemPrompt = SYSTEM_PROMPTS[detectedLanguage as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.en;
  
  if (!SYSTEM_PROMPTS[detectedLanguage as keyof typeof SYSTEM_PROMPTS]) {
    console.warn(`⚠️ No prompt available for language ${detectedLanguage}, using English fallback`);
  }

  // Create optimized extraction prompt
  const extractionPrompt = `Analyze this ${detectedLanguage === 'en' ? 'English' : 'European'} agricultural document and extract farm information:

Document Content:
${extractedText.substring(0, 8000)}

${extractedText.length > 8000 ? '\n[Document truncated for analysis - total length: ' + extractedText.length + ' characters]' : ''}

Extract only clearly visible information. If data is unclear or missing, use null/empty values.`;

  console.log(`🤖 Sending ${extractedText.length} characters to OpenAI`);
  console.log(`🌍 Using ${detectedLanguage} language prompt`);
  console.log(`📝 Prompt preview: ${extractionPrompt.substring(0, 200)}...`);

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
        temperature: 0.2, // Lower for more consistent extraction
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

    // Parse and validate response with enhanced error handling
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
      
      // Enhanced confidence calculation
      const fieldCoverage = actualFields.length / coreFields.length;
      
      if (actualFields.length === 0) {
        extractedData.confidence = 0;
      } else {
        // Base confidence on field coverage and content quality
        let baseConfidence = fieldCoverage * 0.6;
        
        // Bonus for key identifying fields
        const hasKeyFields = actualFields.includes('farmName') || actualFields.includes('ownerName');
        if (hasKeyFields) baseConfidence += 0.15;
        
        // Bonus for legal/registration info
        const hasLegalInfo = actualFields.includes('legalStatus') || actualFields.includes('registrationNumber');
        if (hasLegalInfo) baseConfidence += 0.1;
        
        // Bonus for location info
        const hasLocationInfo = actualFields.includes('address') || actualFields.includes('country');
        if (hasLocationInfo) baseConfidence += 0.1;
        
        // Quality assessment based on text extraction method
        if (debugInfo?.extractionMethod?.includes('ocr') || debugInfo?.extractionMethod?.includes('vision')) {
          baseConfidence *= 0.9; // Slightly lower confidence for OCR
        }
        
        extractedData.confidence = Math.min(Math.max(baseConfidence, 0.1), 0.95);
      }
      
      extractedData.extractedFields = actualFields;
      extractedData.detectedLanguage = detectedLanguage;
      extractedData.promptUsed = detectedLanguage;
      extractedData.debugInfo = {
        ...debugInfo,
        detectedLanguage,
        openaiUsage: aiData.usage,
        promptLength: extractionPrompt.length,
        systemPromptLanguage: detectedLanguage
      };
      
      console.log(`📊 Final extraction summary: ${actualFields.length}/${coreFields.length} core fields, ${Math.round((extractedData.confidence || 0) * 100)}% confidence`);
      console.log(`📋 Extracted fields: ${actualFields.join(', ')}`);
      console.log(`🌍 Language used: ${detectedLanguage}`);
      
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.error('📄 Raw content that failed to parse:', extractedContent);
      
      extractedData = {
        error: `Failed to parse OpenAI response: ${(parseError as Error).message}. Response may not be valid JSON.`,
        confidence: 0,
        extractedFields: [],
        rawResponse: extractedContent,
        detectedLanguage,
        promptUsed: detectedLanguage,
        debugInfo: {
          ...debugInfo,
          detectedLanguage,
          parseError: (parseError as Error).message,
          rawAiResponse: extractedContent
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
      detectedLanguage,
      promptUsed: detectedLanguage,
      debugInfo: {
        ...debugInfo,
        detectedLanguage,
        apiError: (apiError as Error).message
      }
    };
  }
}