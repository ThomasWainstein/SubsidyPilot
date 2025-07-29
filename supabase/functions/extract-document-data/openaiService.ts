/**
 * OpenAI service with enhanced multilingual prompts and robust field detection
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

// Enhanced multilingual system prompts with aggressive field detection
const SYSTEM_PROMPTS = {
  en: `You are an advanced agricultural document analyzer for European farms.
Extract farm data from ANY document type: contracts, certificates, applications, reports, forms.

AGGRESSIVE FIELD DETECTION - Search for these patterns with MAXIMUM flexibility:

farmName: Farm name, farm title, business name, exploitation name, property name, agricultural unit, enterprise name, holding name
ownerName: Owner, proprietor, farmer, applicant, holder, manager, operator, contact person, responsible person, administrator
address: Address, location, site, property address, farm location, registered address, postal address, headquarters
legalStatus: Legal form, entity type, business type (SRL, LLC, PFA, individual, cooperative, association, company type)
registrationNumber: Registration number, CUI, VAT, tax ID, business ID, permit number, license number, fiscal code
country: Country, nation, territory (Romania, France, Poland, Spain, Germany, Bulgaria, etc.)
totalHectares: Total area, farm size, hectares, acres, land area, surface area, total land, agricultural area, UAA
activities: Farming activities, agricultural activities, crops, livestock, production type, land use, cultivation
certifications: Certificates, permits, licenses, authorizations, compliance documents, quality standards
revenue: Annual revenue, turnover, income, sales, financial data, gross income, net income

EXTRACTION TECHNIQUES:
- Scan for ANY label variation: "Farm Name:", "Name:", "Owner:", "Farmer:", "Address:", etc.
- Look in form fields, table cells, key-value pairs, headers, footers
- Extract from structured data like tables, lists, sections
- Find numbers near farming keywords (hectares, acres, area)
- Accept partial matches and formatting variations
- Look for patterns like "Name: [value]", "[Label]: [Value]", "[Label] [Value]"

RETURN STRICT JSON - NO MARKDOWN, NO EXPLANATIONS:
{
  "farmName": "exact extracted text or null",
  "ownerName": "exact extracted text or null", 
  "address": "full address text or null",
  "legalStatus": "exact legal form or null",
  "registrationNumber": "exact number/code or null",
  "country": "country name or null",
  "totalHectares": numeric_value_or_null,
  "activities": ["specific activity 1", "specific activity 2"],
  "certifications": ["specific cert 1", "specific cert 2"],
  "revenue": "exact revenue text or null",
  "confidence": 0.75,
  "extractedFields": ["farmName", "ownerName", "address"]
}

CRITICAL RULES:
- Extract even if labels are unclear - use context clues
- Look for data patterns, not just perfect labels
- Return ALL found data, even partial information
- Use confidence 0.1-0.95 based on data clarity
- NEVER return empty results if ANY farm data exists`,

  fr: `Vous êtes un analyseur de documents agricoles avancé pour les fermes européennes.
Extrayez les données agricoles de TOUT type de document : contrats, certificats, demandes, rapports, formulaires.

DÉTECTION AGGRESSIVE - Recherchez ces modèles avec MAXIMUM de flexibilité:

farmName: Nom de ferme, titre de ferme, nom d'entreprise, nom d'exploitation, nom de propriété, unité agricole
ownerName: Propriétaire, exploitant, agriculteur, demandeur, détenteur, gestionnaire, opérateur, personne contact
address: Adresse, localisation, site, adresse de propriété, lieu de ferme, adresse enregistrée
legalStatus: Forme juridique, type d'entité (SARL, SAS, EURL, individuel, coopérative, association)
registrationNumber: Numéro d'enregistrement, SIRET, SIREN, numéro fiscal, numéro de permis
country: Pays (France, Roumanie, Pologne, Espagne, Allemagne, etc.)
totalHectares: Surface totale, taille de ferme, hectares, superficie, surface agricole, SAU
activities: Activités agricoles, cultures, élevage, type de production, utilisation des terres
certifications: Certificats, permis, licences, autorisations, normes qualité
revenue: Chiffre d'affaires, revenus, ventes, données financières

RETOURNEZ JSON STRICT - PAS DE MARKDOWN:
{
  "farmName": "texte exact ou null",
  "ownerName": "texte exact ou null",
  "address": "adresse complète ou null",
  "legalStatus": "forme juridique exacte ou null",
  "registrationNumber": "numéro exact ou null",
  "country": "nom du pays ou null",
  "totalHectares": valeur_numérique_ou_null,
  "activities": ["activité 1", "activité 2"],
  "certifications": ["cert 1", "cert 2"],
  "revenue": "revenus exacts ou null",
  "confidence": 0.75,
  "extractedFields": ["farmName", "ownerName"]
}`,

  ro: `Sunteți un analizor avansat de documente agricole pentru fermele europene.
Extrageți datele fermei din ORICE tip de document: contracte, certificate, cereri, rapoarte, formulare.

DETECȚIE AGRESIVĂ - Căutați aceste modele cu MAXIM de flexibilitate:

farmName: Nume fermă, titlu fermă, nume întreprindere, nume exploatație, nume proprietate
ownerName: Proprietar, fermier, solicitant, deținător, manager, operator, persoană contact
address: Adresă, locație, sit, adresa proprietății, locația fermei, adresa înregistrată
legalStatus: Forma juridică, tipul entității (SRL, PFA, cooperativă, individual, asociație)
registrationNumber: Numărul de înregistrare, CUI, cod fiscal, numărul permisului
country: Țară (România, Franța, Polonia, Spania, Germania, etc.)
totalHectares: Suprafața totală, mărimea fermei, hectare, suprafața agricolă
activities: Activități agricole, culturi, zootehnie, tipul de producție, utilizarea terenului
certifications: Certificate, permise, licențe, autorizații, standarde de calitate
revenue: Cifra de afaceri, venituri, vânzări, date financiare

RETURNAȚI JSON STRICT - FĂRĂ MARKDOWN:
{
  "farmName": "text exact sau null",
  "ownerName": "text exact sau null",
  "address": "adresă completă sau null",
  "legalStatus": "forma juridică exactă sau null",
  "registrationNumber": "numărul exact sau null",
  "country": "numele țării sau null",
  "totalHectares": valoare_numerică_sau_null,
  "activities": ["activitate 1", "activitate 2"],
  "certifications": ["cert 1", "cert 2"],
  "revenue": "venituri exacte sau null",
  "confidence": 0.75,
  "extractedFields": ["farmName", "ownerName"]
}`,

  es: `Usted es un analizador avanzado de documentos agrícolas para granjas europeas.
Extraiga datos agrícolas de CUALQUIER tipo de documento: contratos, certificados, solicitudes, informes, formularios.

DETECCIÓN AGRESIVA - Busque estos patrones con MÁXIMA flexibilidad:

farmName: Nombre de granja, título de granja, nombre comercial, nombre de explotación
ownerName: Propietario, agricultor, solicitante, titular, gerente, operador, persona contacto
address: Dirección, ubicación, sitio, dirección de propiedad, ubicación de granja
legalStatus: Forma jurídica, tipo de entidad (SL, cooperativa, individual, asociación)
registrationNumber: Número de registro, CIF, número fiscal, número de permiso
country: País (España, Francia, Polonia, Rumania, Alemania, etc.)
totalHectares: Superficie total, tamaño de granja, hectáreas, superficie agrícola
activities: Actividades agrícolas, cultivos, ganadería, tipo de producción
certifications: Certificados, permisos, licencias, autorizaciones, estándares
revenue: Facturación, ingresos, ventas, datos financieros

DEVUELVA JSON ESTRICTO - SIN MARKDOWN:
{
  "farmName": "texto exacto o null",
  "ownerName": "texto exacto o null",
  "address": "dirección completa o null",
  "legalStatus": "forma jurídica exacta o null",
  "registrationNumber": "número exacto o null",
  "country": "nombre del país o null",
  "totalHectares": valor_numérico_o_null,
  "activities": ["actividad 1", "actividad 2"],
  "certifications": ["cert 1", "cert 2"],
  "revenue": "ingresos exactos o null",
  "confidence": 0.75,
  "extractedFields": ["farmName", "ownerName"]
}`,

  pl: `Jesteś zaawansowanym analizatorem dokumentów rolniczych dla gospodarstw europejskich.
Wyodrębnij dane gospodarstwa z KAŻDEGO typu dokumentu: umowy, certyfikaty, wnioski, raporty, formularze.

AGRESYWNA DETEKCJA - Szukaj tych wzorców z MAKSYMALNĄ elastycznością:

farmName: Nazwa gospodarstwa, tytuł gospodarstwa, nazwa firmy, nazwa eksploatacji
ownerName: Właściciel, rolnik, wnioskodawca, dzierżawca, menedżer, operator
address: Adres, lokalizacja, miejsce, adres nieruchomości, lokalizacja gospodarstwa
legalStatus: Forma prawna, typ podmiotu (sp. z o.o., spółdzielnia, osoba fizyczna)
registrationNumber: Numer rejestracji, NIP, numer podatkowy, numer pozwolenia
country: Kraj (Polska, Francja, Rumunia, Hiszpania, Niemcy, etc.)
totalHectares: Całkowita powierzchnia, rozmiar gospodarstwa, hektary, powierzchnia rolnicza
activities: Działalność rolnicza, uprawy, hodowla, typ produkcji
certifications: Certyfikaty, pozwolenia, licencje, autoryzacje, standardy
revenue: Obrót, przychody, sprzedaż, dane finansowe

ZWRÓĆ ŚCISŁY JSON - BEZ MARKDOWN:
{
  "farmName": "dokładny tekst lub null",
  "ownerName": "dokładny tekst lub null",
  "address": "pełny adres lub null",
  "legalStatus": "dokładna forma prawna lub null",
  "registrationNumber": "dokładny numer lub null",
  "country": "nazwa kraju lub null",
  "totalHectares": wartość_liczbowa_lub_null,
  "activities": ["działalność 1", "działalność 2"],
  "certifications": ["cert 1", "cert 2"],
  "revenue": "dokładne przychody lub null",
  "confidence": 0.75,
  "extractedFields": ["farmName", "ownerName"]
}`,

  de: `Sie sind ein fortgeschrittener landwirtschaftlicher Dokumentenanalysator für europäische Betriebe.
Extrahieren Sie Betriebsdaten aus JEDEM Dokumenttyp: Verträge, Zertifikate, Anträge, Berichte, Formulare.

AGGRESSIVE ERKENNUNG - Suchen Sie nach diesen Mustern mit MAXIMALER Flexibilität:

farmName: Betriebsname, Betriebstitel, Firmenname, Betriebsbezeichnung
ownerName: Eigentümer, Landwirt, Antragsteller, Betriebsinhaber, Manager, Betreiber
address: Adresse, Standort, Ort, Betriebsadresse, Standort des Betriebs
legalStatus: Rechtsform, Unternehmenstyp (GmbH, Genossenschaft, Einzelunternehmen)
registrationNumber: Registrierungsnummer, Steuernummer, Betriebsnummer
country: Land (Deutschland, Frankreich, Polen, Rumänien, Spanien, etc.)
totalHectares: Gesamtfläche, Betriebsgröße, Hektar, landwirtschaftliche Fläche
activities: Landwirtschaftliche Tätigkeiten, Kulturen, Viehzucht, Produktionstyp
certifications: Zertifikate, Genehmigungen, Lizenzen, Autorisierungen, Standards
revenue: Umsatz, Einnahmen, Verkäufe, Finanzdaten

GEBEN SIE STRIKTES JSON ZURÜCK - KEIN MARKDOWN:
{
  "farmName": "exakter Text oder null",
  "ownerName": "exakter Text oder null",
  "address": "vollständige Adresse oder null",
  "legalStatus": "exakte Rechtsform oder null",
  "registrationNumber": "exakte Nummer oder null",
  "country": "Ländername oder null",
  "totalHectares": numerischer_Wert_oder_null,
  "activities": ["Tätigkeit 1", "Tätigkeit 2"],
  "certifications": ["Zert 1", "Zert 2"],
  "revenue": "exakte Einnahmen oder null",
  "confidence": 0.75,
  "extractedFields": ["farmName", "ownerName"]
}`
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
  debugInfo?: any,
  model: string = 'gpt-4o-mini'
): Promise<ExtractedFarmData> {
  // 🔍 CRITICAL DEBUG: Log OpenAI input
  console.log(`🔍 OPENAI INPUT: Text length = ${extractedText?.length || 0}`);
  console.log(`🔍 OPENAI INPUT: Text preview = "${extractedText?.substring(0, 300) || 'NO TEXT'}"`);
  console.log(`🔍 OPENAI INPUT: Debug info =`, debugInfo);
  
  console.log(`🤖 Starting enhanced OpenAI extraction analysis...`);
  console.log(`📄 Document text length: ${extractedText.length} characters`);
  console.log(`📄 Text preview (first 500 chars): ${extractedText.substring(0, 500)}`);
  
  // Enhanced text validation
  if (!extractedText || extractedText.length < 20) {
    console.warn('⚠️ Document text too short or empty for meaningful extraction');
    return {
      error: 'Document text is empty or too short for extraction (minimum 20 characters required).',
      confidence: 0,
      extractedFields: [],
      rawResponse: `Input text length: ${extractedText.length}`,
      debugInfo: { ...debugInfo, rawText: extractedText },
      detectedLanguage: 'unknown',
      promptUsed: 'none'
    };
  }

  // Check for readable content with multilingual patterns
  const hasReadableContent = /[a-zA-ZÀ-ÿĀ-žА-я]{5,}/.test(extractedText);
  const hasStructuredContent = /[a-zA-ZÀ-ÿĀ-žА-я\s]{15,}/.test(extractedText);
  
  if (!hasReadableContent || !hasStructuredContent) {
    console.warn('⚠️ Document appears to contain insufficient readable text content');
    return {
      error: 'Document does not contain sufficient readable text. May be corrupted, scanned image, or non-text file.',
      confidence: 0,
      extractedFields: [],
      rawResponse: extractedText.substring(0, 300),
      debugInfo: { ...debugInfo, rawText: extractedText },
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

  // Create enhanced extraction prompt with pattern examples
  const extractionPrompt = `Analyze this agricultural document and extract farm information using AGGRESSIVE pattern matching.

DOCUMENT CONTENT:
${extractedText.substring(0, 10000)}

${extractedText.length > 10000 ? '\n[Document truncated for analysis - total length: ' + extractedText.length + ' characters]' : ''}

EXTRACTION INSTRUCTIONS:
1. Scan for ANY farm-related data patterns
2. Look for labels like: "Name:", "Owner:", "Farm:", "Address:", "Legal:", "Registration:", "Hectares:", "Area:", "Activities:", "Certificates:"
3. Extract from tables, forms, headers, lists, paragraphs
4. Find numbers near farming keywords (hectares, area, land, surface)
5. Accept partial matches and formatting variations
6. Extract even if labels are unclear - use context clues

RETURN ONLY VALID JSON WITH ACTUAL FOUND DATA - NO EXPLANATIONS, NO MARKDOWN:`;

  console.log(`🤖 Sending ${extractedText.length} characters to OpenAI with enhanced prompt`);
  console.log(`🌍 Using ${detectedLanguage} language prompt`);
  console.log(`📝 Enhanced prompt preview: ${extractionPrompt.substring(0, 300)}...`);

  try {
    // Call OpenAI with optimized parameters for better extraction
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
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
        temperature: 0.1, // Very low for consistent extraction
        max_tokens: 2000,
        top_p: 0.8,
        frequency_penalty: 0.2
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
    
    // Enhanced debug logging for troubleshooting
    console.log(`📄 Raw text sample for debugging: ${extractedText.substring(0, 1000)}`);
    console.log(`🤖 Model used: gpt-4o-mini`);
    console.log(`🌍 Language detected: ${detectedLanguage}`);

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
      
      // Enhanced field validation and confidence calculation
      const coreFields = ['farmName', 'ownerName', 'address', 'legalStatus', 'registrationNumber', 'country', 'totalHectares', 'activities', 'certifications', 'revenue'];
      const actualFields = coreFields.filter(key => {
        const value = extractedData[key as keyof ExtractedFarmData];
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'string') return value.trim().length > 0;
        if (typeof value === 'number') return !isNaN(value) && value >= 0;
        return true;
      });
      
      // Enhanced confidence calculation based on data quality
      const fieldCoverage = actualFields.length / coreFields.length;
      
      if (actualFields.length === 0) {
        extractedData.confidence = 0;
        console.warn(`⚠️ No fields extracted from document`);
      } else {
        // Base confidence on field coverage
        let baseConfidence = Math.max(0.3, fieldCoverage * 0.7);
        
        // Bonus for essential identifying fields
        const hasKeyFields = actualFields.includes('farmName') || actualFields.includes('ownerName');
        if (hasKeyFields) baseConfidence += 0.15;
        
        // Bonus for legal/registration info
        const hasLegalInfo = actualFields.includes('legalStatus') || actualFields.includes('registrationNumber');
        if (hasLegalInfo) baseConfidence += 0.1;
        
        // Bonus for location/size info
        const hasLocationInfo = actualFields.includes('address') || actualFields.includes('country') || actualFields.includes('totalHectares');
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
      extractedData.rawResponse = extractedContent;
      extractedData.debugInfo = {
        ...debugInfo,
        detectedLanguage,
        openaiUsage: aiData.usage,
        promptLength: extractionPrompt.length,
        systemPromptLanguage: detectedLanguage,
        rawText: extractedText.substring(0, 1000), // Store sample of raw text
        rawAiResponse: extractedContent
      };
      
      console.log(`📊 Enhanced extraction summary: ${actualFields.length}/${coreFields.length} core fields, ${Math.round((extractedData.confidence || 0) * 100)}% confidence`);
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
          rawAiResponse: extractedContent,
          rawText: extractedText.substring(0, 1000)
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
        apiError: (apiError as Error).message,
        rawText: extractedText.substring(0, 1000)
      }
    };
  }
}