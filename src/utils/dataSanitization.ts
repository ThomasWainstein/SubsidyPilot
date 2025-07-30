/**
 * Utilities for cleaning and sanitizing subsidy and form data
 */

/**
 * Remove duplicate sentences and repeated content from text
 */
export const deduplicateText = (text: string): string => {
  if (!text) return '';
  
  // Split into sentences
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  
  // Remove duplicates while preserving order
  const uniqueSentences = [];
  const seen = new Set();
  
  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(normalized) && sentence.length > 10) {
      seen.add(normalized);
      uniqueSentences.push(sentence);
    }
  }
  
  return uniqueSentences.join('. ') + (uniqueSentences.length > 0 ? '.' : '');
};

/**
 * Clean and normalize array data from various sources
 */
export const sanitizeArrayField = (data: any): string[] => {
  if (!data) return [];
  
  let items: string[] = [];
  
  if (Array.isArray(data)) {
    items = data.map(item => String(item).trim());
  } else if (typeof data === 'string') {
    // Handle various separators
    items = data.split(/[,;|\/\n]+/).map(item => item.trim());
  } else {
    items = [String(data).trim()];
  }
  
  // Remove empty items and duplicates
  return [...new Set(items.filter(item => item && item.length > 0))];
};

/**
 * Validate and clean numeric amounts
 */
export const sanitizeAmount = (amount: any): number[] => {
  if (!amount) return [];
  
  let numbers: number[] = [];
  
  if (Array.isArray(amount)) {
    numbers = amount.map(a => Number(a)).filter(n => !isNaN(n) && n > 0);
  } else if (typeof amount === 'number') {
    if (!isNaN(amount) && amount > 0) {
      numbers = [amount];
    }
  } else if (typeof amount === 'string') {
    // Try to extract numbers from string
    const matches = amount.match(/[\d,\.]+/g);
    if (matches) {
      numbers = matches
        .map(m => Number(m.replace(/,/g, '')))
        .filter(n => !isNaN(n) && n > 0);
    }
  }
  
  return [...new Set(numbers)].sort((a, b) => a - b);
};

/**
 * Clean and validate date strings
 */
export const sanitizeDate = (date: any): string | null => {
  if (!date) return null;
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return null;
  
  return dateObj.toISOString().split('T')[0];
};

/**
 * Comprehensive subsidy data sanitization
 */
export const sanitizeSubsidyData = (subsidy: any): any => {
  const sanitized = { ...subsidy };
  
  // Clean text fields
  if (sanitized.description) {
    sanitized.description = deduplicateText(sanitized.description);
  }
  
  if (sanitized.eligibility) {
    sanitized.eligibility = deduplicateText(sanitized.eligibility);
  }
  
  // Clean array fields
  sanitized.region = sanitizeArrayField(sanitized.region);
  sanitized.sector = sanitizeArrayField(sanitized.sector);
  sanitized.legal_entity_type = sanitizeArrayField(sanitized.legal_entity_type);
  sanitized.objectives = sanitizeArrayField(sanitized.objectives);
  sanitized.eligible_actions = sanitizeArrayField(sanitized.eligible_actions);
  sanitized.ineligible_actions = sanitizeArrayField(sanitized.ineligible_actions);
  sanitized.beneficiary_types = sanitizeArrayField(sanitized.beneficiary_types);
  sanitized.investment_types = sanitizeArrayField(sanitized.investment_types);
  sanitized.rejection_conditions = sanitizeArrayField(sanitized.rejection_conditions);
  
  // Clean amount field
  sanitized.amount = sanitizeAmount(sanitized.amount);
  
  // Clean date fields
  sanitized.deadline = sanitizeDate(sanitized.deadline);
  sanitized.application_window_start = sanitizeDate(sanitized.application_window_start);
  sanitized.application_window_end = sanitizeDate(sanitized.application_window_end);
  
  return sanitized;
};

/**
 * Validate required fields and generate missing field warnings
 */
export const validateSubsidyData = (subsidy: any): { 
  isValid: boolean; 
  missingFields: string[]; 
  warnings: string[] 
} => {
  const required = ['title', 'agency', 'description'];
  const recommended = ['amount', 'deadline', 'region', 'sector', 'eligibility'];
  
  const missingFields = required.filter(field => !subsidy[field] || subsidy[field] === 'Subsidy Page');
  const missingRecommended = recommended.filter(field => !subsidy[field] || 
    (Array.isArray(subsidy[field]) && subsidy[field].length === 0));
  
  const warnings = [];
  
  if (missingRecommended.length > 0) {
    warnings.push(`Missing recommended fields: ${missingRecommended.join(', ')}`);
  }
  
  if (subsidy.title === 'Subsidy Page') {
    warnings.push('Placeholder title detected');
  }
  
  if (subsidy.amount && subsidy.amount.length === 0) {
    warnings.push('No funding amount specified');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings
  };
};