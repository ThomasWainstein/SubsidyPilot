/**
 * Local Transformer-Based Extraction for Edge Function
 * Simplified version for server-side use without browser dependencies
 */

export interface LocalExtractionResult {
  extractedFields: Array<{
    field: string;
    value: string;
    confidence: number;
  }>;
  overallConfidence: number;
  processingTime: number;
  modelUsed: string;
  fallbackRecommended: boolean;
  errorMessage?: string;
}

export async function tryLocalExtraction(
  text: string,
  documentType: string,
  confidenceThreshold: number = 0.7
): Promise<LocalExtractionResult> {
  const startTime = Date.now();
  
  // 🔍 CRITICAL DEBUG: Log input parameters
  console.log(`🔍 LOCAL EXTRACTION INPUT: Text length = ${text?.length || 0}`);
  console.log(`🔍 LOCAL EXTRACTION INPUT: Text preview = "${text?.substring(0, 200) || 'NO TEXT'}"...`);
  console.log(`🔍 LOCAL EXTRACTION INPUT: Document type = ${documentType}`);
  console.log(`🔍 LOCAL EXTRACTION INPUT: Confidence threshold = ${confidenceThreshold}`);
  
  try {
    console.log('⚠️  WARNING: Using rule-based extraction SIMULATION - not actual transformer model!');
    
    // Check if we have valid text input
    if (!text || text.length < 10) {
      console.warn('❌ Local extraction received insufficient text input');
      return {
        extractedFields: [],
        overallConfidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: 'local-rules-v1',
        fallbackRecommended: true,
        errorMessage: 'Insufficient text input for extraction'
      };
    }
    
    // For MVP: Use rule-based extraction as "local" extraction
    // This simulates what would be done with actual transformers
    const extractedFields = extractWithRules(text, documentType);
    
    // 🔍 CRITICAL DEBUG: Log extraction results
    console.log(`🔍 LOCAL EXTRACTION RESULTS: Found ${extractedFields.length} fields`);
    extractedFields.forEach((field, index) => {
      console.log(`🔍 FIELD ${index + 1}: ${field.field} = "${field.value}" (confidence: ${field.confidence})`);
    });
    
    // Calculate overall confidence
    const overallConfidence = extractedFields.length > 0 
      ? extractedFields.reduce((sum, field) => sum + field.confidence, 0) / extractedFields.length
      : 0;
    
    // Determine if fallback is recommended
    const fallbackRecommended = overallConfidence < confidenceThreshold || extractedFields.length < 2;
    
    console.log(`🔍 LOCAL EXTRACTION SUMMARY: Overall confidence = ${overallConfidence}, Fallback recommended = ${fallbackRecommended}`);
    
    const processingTime = Date.now() - startTime;
    
    return {
      extractedFields,
      overallConfidence,
      processingTime,
      modelUsed: 'local-rules-v1', // MVP: rule-based simulation
      fallbackRecommended
    };
    
  } catch (error) {
    console.error('❌ Local extraction failed:', error);
    
    return {
      extractedFields: [],
      overallConfidence: 0,
      processingTime: Date.now() - startTime,
      modelUsed: 'local-rules-v1',
      fallbackRecommended: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown extraction error'
    };
  }
}

function extractWithRules(text: string, documentType: string): Array<{
  field: string;
  value: string;
  confidence: number;
}> {
  const extractedFields: Array<{ field: string; value: string; confidence: number }> = [];
  const lowerText = text.toLowerCase();
  
  console.log(`🔍 Rule-based extraction starting on ${text.length} characters of text...`);
  console.log(`📄 Text preview for extraction: "${text.substring(0, 200)}..."`);
  
  // Enhanced Farm-specific extraction patterns
  
  // Farm Name extraction (multiple patterns)
  const farmNamePatterns = [
    /(?:farm\s+name|farm|nome\s+ferma|numele\s+fermei|denominazione|ferme)\s*:?\s*([a-zA-Z][a-zA-Z\s\-&.0-9]{5,50})/gi,
    /([a-zA-Z][a-zA-Z\s&.-]{5,30}(?:\s+(?:farm|ferma|agro|agricultural|agricole|srl|sa|llc|ltd|inc)))/gi,
    /(?:business\s+name|company\s+name|empresa|società)\s*:?\s*([a-zA-Z][a-zA-Z\s\-&.0-9]{5,50})/gi
  ];
  
  for (const pattern of farmNamePatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      extractedFields.push({
        field: 'farmName',
        value: matches[0][1].trim(),
        confidence: 0.8
      });
      break;
    }
  }
  
  // Owner Name extraction
  const ownerNamePatterns = [
    /(?:owner\s+name|proprietor|farmer|applicant|titolare|proprietario|propriétaire)\s*:?\s*([a-zA-Z][a-zA-Z\s.-]{3,40})/gi,
    /(?:name|nume|nom|nombre)\s*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/g
  ];
  
  for (const pattern of ownerNamePatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      extractedFields.push({
        field: 'ownerName',
        value: matches[0][1].trim(),
        confidence: 0.75
      });
      break;
    }
  }
  
  // Address extraction
  const addressPatterns = [
    /(?:address|adresa|adresse|dirección|indirizzo)\s*:?\s*([a-zA-Z0-9][a-zA-Z0-9\s,.-]{10,100})/gi,
    /([a-zA-Z0-9][a-zA-Z0-9\s,.-]{15,80}(?:street|strada|rue|calle|via|str\.)[a-zA-Z0-9\s,.-]{5,50})/gi
  ];
  
  for (const pattern of addressPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      extractedFields.push({
        field: 'address',
        value: matches[0][1].trim(),
        confidence: 0.7
      });
      break;
    }
  }
  
  // Legal Status extraction
  const legalStatusPatterns = [
    /(?:legal\s+status|forma\s+juridică|statut\s+juridique)\s*:?\s*(srl|sa|pfa|individual|cooperative|association|llc|ltd|inc)/gi,
    /(srl|sa|pfa|società|cooperativa|association|individual\s+proprietor)/gi
  ];
  
  for (const pattern of legalStatusPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      extractedFields.push({
        field: 'legalStatus',
        value: matches[0][1] || matches[0][0],
        confidence: 0.8
      });
      break;
    }
  }
  
  // Registration Number extraction (CUI, VAT, etc.)
  const registrationPatterns = [
    /(?:cui|vat|registration\s+number|fiscal\s+code|tax\s+id)\s*:?\s*([a-z0-9]{5,20})/gi,
    /(?:nr\.?\s*reg|registration|matricula)\s*:?\s*([a-z0-9-]{5,20})/gi
  ];
  
  for (const pattern of registrationPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      extractedFields.push({
        field: 'registrationNumber',
        value: matches[0][1].trim(),
        confidence: 0.75
      });
      break;
    }
  }
  
  // Total Hectares extraction
  const hectarePatterns = [
    /(?:total\s+(?:area|hectares|land)|superficie\s+totale|surface\s+totale)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(?:hectares?|ha|acres?)/gi,
    /(\d+(?:[.,]\d+)?)\s*(?:hectares?|ha)\s*(?:total|total\s+area)?/gi,
    /(?:area|superficie|surface)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(?:hectares?|ha)/gi
  ];
  
  for (const pattern of hectarePatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      extractedFields.push({
        field: 'totalHectares',
        value: matches[0][1].replace(',', '.'),
        confidence: 0.8
      });
      break;
    }
  }
  
  // Activities extraction
  const activityPatterns = [
    /(?:activities|attività|activités|actividades|activități)\s*:?\s*([a-zA-Z][a-zA-Z\s,.-]{10,100})/gi,
    /(?:farming|agriculture|crops|livestock|cereals|vegetables|fruits|dairy|beef|poultry)/gi
  ];
  
  for (const pattern of activityPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      const activities = matches[0][1] ? matches[0][1].split(/[,;]/).map(a => a.trim()) : [matches[0][0]];
      extractedFields.push({
        field: 'activities',
        value: activities.filter(a => a.length > 2).join(', '),
        confidence: 0.6
      });
      break;
    }
  }
  
  // Country extraction
  const countryPatterns = [
    /(?:country|país|paese|țară|pays)\s*:?\s*(romania|france|italy|spain|germany|poland|bulgaria)/gi,
    /(romania|france|italy|spain|germany|poland|bulgaria)/gi
  ];
  
  for (const pattern of countryPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      extractedFields.push({
        field: 'country',
        value: matches[0][1] || matches[0][0],
        confidence: 0.7
      });
      break;
    }
  }
  
  // Date extraction
  const dateRegex = /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/g;
  const dateMatches = text.match(dateRegex);
  if (dateMatches && dateMatches.length > 0) {
    extractedFields.push({
      field: 'date',
      value: dateMatches[0],
      confidence: 0.8
    });
  }
  
  // Email extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = text.match(emailRegex);
  if (emailMatches && emailMatches.length > 0) {
    extractedFields.push({
      field: 'email',
      value: emailMatches[0],
      confidence: 0.9
    });
  }
  
  console.log(`✅ Rule-based extraction completed. Found ${extractedFields.length} fields:`);
  extractedFields.forEach(field => {
    console.log(`   - ${field.field}: "${field.value}" (confidence: ${field.confidence})`);
  });
  
  return extractedFields;
}