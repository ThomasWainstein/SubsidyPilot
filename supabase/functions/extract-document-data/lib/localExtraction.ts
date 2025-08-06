/**
 * Local Rule-Based Extraction for Farm Documents
 * Fast pattern-matching extraction without AI
 */

export interface LocalExtractionField {
  field: string;
  value: string;
  confidence: number;
  source: string;
}

export interface LocalExtractionResult {
  extractedFields: LocalExtractionField[];
  overallConfidence: number;
  fallbackRecommended: boolean;
  processingTime: number;
  modelUsed: string;
  errorMessage?: string;
}

/**
 * Farm document extraction patterns
 */
const FARM_PATTERNS: Record<string, RegExp[]> = {
  farmName: [
    /(?:farm\s*name|name\s*of\s*farm|exploitation)\s*:?\s*([^\n\r;,]+)/i,
    /(?:denumire|nume)\s*(?:exploatatie|ferma)\s*:?\s*([^\n\r;,]+)/i,
    /(?:nom\s*de\s*l'exploitation|nom\s*ferme)\s*:?\s*([^\n\r;,]+)/i
  ],
  ownerName: [
    /(?:owner|proprietor|farmer|responsable)\s*:?\s*([^\n\r;,]+)/i,
    /(?:proprietar|responsabil)\s*:?\s*([^\n\r;,]+)/i,
    /(?:propriétaire|responsable)\s*:?\s*([^\n\r;,]+)/i,
    /(?:name|nume|nom)\s*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/
  ],
  address: [
    /(?:address|adresa|adresse)\s*:?\s*([^\n\r]+(?:\n[^\n\r]+)*)/i,
    /(?:location|locatie|localisation)\s*:?\s*([^\n\r;,]+)/i
  ],
  totalHectares: [
    /(?:total\s*area|area|suprafata|superficie)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(?:ha|hectare|hectares)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:ha|hectare|hectares)/i
  ],
  phone: [
    /(?:phone|tel|telefon|téléphone)\s*:?\s*([+\d\s\-\(\)]+)/i,
    /(?:mobile|mobil)\s*:?\s*([+\d\s\-\(\)]+)/i
  ],
  email: [
    /(?:email|e-mail)\s*:?\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i
  ],
  landUseTypes: [
    /(?:crops|culturi|cultures)\s*:?\s*([^\n\r;]+)/i,
    /(?:activities|activitati|activités)\s*:?\s*([^\n\r;]+)/i,
    /(?:production|productie)\s*:?\s*([^\n\r;]+)/i
  ],
  legalStatus: [
    /(?:legal\s*status|forma\s*juridica|statut\s*juridique)\s*:?\s*([^\n\r;,]+)/i,
    /\b(SRL|PFA|SA|SNC|INTREPRINDERE)\b/i
  ],
  cnpOrCui: [
    /(?:tax\s*id|cui|cnp|fiscal\s*code)\s*:?\s*([A-Z0-9]+)/i,
    /(?:cod\s*fiscal|numar\s*inregistrare)\s*:?\s*([A-Z0-9]+)/i
  ],
  country: [
    /(?:country|tara|pays)\s*:?\s*([^\n\r;,]+)/i,
    /\b(Romania|France|Italia|Spain|Germany|Roumanie|Italie|Espagne|Allemagne)\b/i
  ],
  department: [
    /(?:department|judet|département)\s*:?\s*([^\n\r;,]+)/i,
    /(?:county|region|région)\s*:?\s*([^\n\r;,]+)/i
  ]
};

/**
 * Try local extraction first before AI fallback
 */
export async function tryLocalExtraction(
  documentText: string,
  documentType: string,
  confidenceThreshold: number = 0.7
): Promise<LocalExtractionResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔧 Starting local rule-based extraction...');
    
    const extractedFields: LocalExtractionField[] = [];
    
    // Apply extraction patterns
    for (const [fieldName, patterns] of Object.entries(FARM_PATTERNS)) {
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = documentText.match(pattern);
        
        if (match && match[1]?.trim()) {
          const value = cleanExtractedValue(match[1].trim(), fieldName);
          const confidence = calculateFieldConfidence(fieldName, value, i, patterns.length);
          
          extractedFields.push({
            field: fieldName,
            value,
            confidence,
            source: `pattern_${i}`
          });
          
          console.log(`✅ Extracted ${fieldName}: ${value} (confidence: ${confidence})`);
          break; // Use first matching pattern
        }
      }
    }
    
    // Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(extractedFields);
    const fallbackRecommended = shouldFallbackToAI(extractedFields, overallConfidence, confidenceThreshold);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`🔧 Local extraction completed: ${extractedFields.length} fields, confidence: ${overallConfidence}`);
    
    return {
      extractedFields,
      overallConfidence,
      fallbackRecommended,
      processingTime,
      modelUsed: 'rule-based-patterns'
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Local extraction failed:', error);
    
    return {
      extractedFields: [],
      overallConfidence: 0,
      fallbackRecommended: true,
      processingTime,
      modelUsed: 'rule-based-patterns',
      errorMessage: error.message
    };
  }
}

/**
 * Clean extracted values based on field type
 */
function cleanExtractedValue(value: string, fieldName: string): string {
  // Remove common unwanted characters
  value = value.replace(/[;:,]+$/, '').trim();
  
  // Field-specific cleaning
  switch (fieldName) {
    case 'totalHectares':
      // Convert comma to dot for decimal numbers
      return value.replace(',', '.');
      
    case 'phone':
      // Clean phone numbers
      return value.replace(/[^\d+\-\(\)\s]/g, '').trim();
      
    case 'email':
      // Basic email cleaning
      return value.toLowerCase().trim();
      
    case 'landUseTypes':
      // Split and clean crop lists
      return value.split(/[,;]+/).map(s => s.trim()).join(', ');
      
    default:
      return value;
  }
}

/**
 * Calculate confidence for individual fields
 */
function calculateFieldConfidence(
  fieldName: string,
  value: string,
  patternIndex: number,
  totalPatterns: number
): number {
  let confidence = 0.8; // Base confidence
  
  // Reduce confidence for later patterns (less specific)
  confidence -= (patternIndex / totalPatterns) * 0.3;
  
  // Adjust based on field importance and value quality
  const fieldBonus = getFieldImportanceBonus(fieldName);
  const valueQuality = assessValueQuality(fieldName, value);
  
  confidence = Math.min(0.95, confidence + fieldBonus + valueQuality);
  
  return Math.max(0.1, confidence);
}

/**
 * Get importance bonus for critical fields
 */
function getFieldImportanceBonus(fieldName: string): number {
  const criticalFields = ['farmName', 'ownerName', 'address', 'totalHectares'];
  return criticalFields.includes(fieldName) ? 0.1 : 0;
}

/**
 * Assess quality of extracted value
 */
function assessValueQuality(fieldName: string, value: string): number {
  if (!value || value.length < 2) return -0.3;
  
  switch (fieldName) {
    case 'totalHectares':
      const num = parseFloat(value);
      return (num > 0 && num < 10000) ? 0.2 : -0.2;
      
    case 'email':
      return value.includes('@') && value.includes('.') ? 0.2 : -0.3;
      
    case 'phone':
      return value.replace(/\D/g, '').length >= 7 ? 0.1 : -0.2;
      
    case 'farmName':
    case 'ownerName':
      return value.length >= 3 && value.length <= 100 ? 0.1 : -0.1;
      
    default:
      return value.length >= 3 ? 0.05 : -0.05;
  }
}

/**
 * Calculate overall extraction confidence
 */
function calculateOverallConfidence(fields: LocalExtractionField[]): number {
  if (fields.length === 0) return 0;
  
  const avgConfidence = fields.reduce((sum, field) => sum + field.confidence, 0) / fields.length;
  const fieldCountBonus = Math.min(0.3, fields.length / 10 * 0.3);
  
  // Check for critical fields
  const criticalFields = ['farmName', 'ownerName'];
  const hasCriticalFields = criticalFields.some(field => 
    fields.some(f => f.field === field && f.confidence > 0.6)
  );
  
  const criticalBonus = hasCriticalFields ? 0.1 : -0.2;
  
  return Math.min(0.9, Math.max(0.1, avgConfidence + fieldCountBonus + criticalBonus));
}

/**
 * Determine if AI fallback is recommended
 */
function shouldFallbackToAI(
  fields: LocalExtractionField[],
  overallConfidence: number,
  threshold: number
): boolean {
  // Always recommend AI if confidence is below threshold
  if (overallConfidence < threshold) return true;
  
  // Recommend AI if we have very few fields
  if (fields.length < 4) return true;
  
  // Recommend AI if no critical fields extracted
  const criticalFields = ['farmName', 'ownerName'];
  const hasCriticalFields = criticalFields.some(field => 
    fields.some(f => f.field === field)
  );
  
  if (!hasCriticalFields) return true;
  
  return false;
}