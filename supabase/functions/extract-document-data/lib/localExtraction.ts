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
  
  try {
    console.log('⚠️  WARNING: Using rule-based extraction SIMULATION - not actual transformer model!');
    
    // For MVP: Use rule-based extraction as "local" extraction
    // This simulates what would be done with actual transformers
    const extractedFields = extractWithRules(text, documentType);
    
    // Calculate overall confidence
    const overallConfidence = extractedFields.length > 0 
      ? extractedFields.reduce((sum, field) => sum + field.confidence, 0) / extractedFields.length
      : 0;
    
    // Determine if fallback is recommended
    const fallbackRecommended = overallConfidence < confidenceThreshold || extractedFields.length < 2;
    
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
  
  // Amount extraction
  const amountRegex = /[\$€£¥]\s*[\d,]+\.?\d{0,2}|\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:EUR|USD|GBP|RON)\b/g;
  const amountMatches = text.match(amountRegex);
  if (amountMatches && amountMatches.length > 0) {
    extractedFields.push({
      field: 'amount',
      value: amountMatches[0],
      confidence: 0.7
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
  
  // Document-type specific extraction
  if (documentType === 'financial') {
    // Invoice number
    const invoiceRegex = /(?:invoice|factura|nr\.?)\s*:?\s*([A-Z0-9-]+)/i;
    const invoiceMatch = text.match(invoiceRegex);
    if (invoiceMatch) {
      extractedFields.push({
        field: 'invoice_number',
        value: invoiceMatch[1],
        confidence: 0.75
      });
    }
    
    // VAT number
    const vatRegex = /(?:VAT|TVA|CUI)\s*:?\s*([A-Z0-9]+)/i;
    const vatMatch = text.match(vatRegex);
    if (vatMatch) {
      extractedFields.push({
        field: 'vat_number',
        value: vatMatch[1],
        confidence: 0.8
      });
    }
  }
  
  if (documentType === 'legal') {
    // Contract number
    const contractRegex = /(?:contract|agreement|nr\.?\s*contract)\s*:?\s*([A-Z0-9-\/]+)/i;
    const contractMatch = text.match(contractRegex);
    if (contractMatch) {
      extractedFields.push({
        field: 'contract_number',
        value: contractMatch[1],
        confidence: 0.7
      });
    }
  }
  
  if (documentType === 'certification') {
    // Certificate number
    const certRegex = /(?:certificate|certification|cert\.?\s*no\.?)\s*:?\s*([A-Z0-9-]+)/i;
    const certMatch = text.match(certRegex);
    if (certMatch) {
      extractedFields.push({
        field: 'certificate_number',
        value: certMatch[1],
        confidence: 0.8
      });
    }
  }
  
  return extractedFields;
}