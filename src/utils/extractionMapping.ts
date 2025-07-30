import { logger } from '@/lib/logger';

/**
 * Centralized field mapping utilities for extraction data
 * Replaces scattered mapping logic throughout the codebase
 */

// Standard field mappings for farm data
export const FARM_FIELD_MAPPINGS = {
  // Personal/Contact Information
  owner_name: ['proprietor', 'farmer', 'contact_name', 'applicant_name'],
  contact_email: ['email', 'email_address', 'applicant_email'],
  contact_phone: ['phone', 'telephone', 'mobile', 'phone_number'],
  
  // Farm Details
  farm_name: ['name', 'farm_title', 'operation_name'],
  address: ['location', 'farm_address', 'property_address'],
  total_hectares: ['area', 'size', 'total_area', 'land_area'],
  
  // Legal and Business
  legal_status: ['entity_type', 'business_type', 'organization_type'],
  tax_number: ['vat_id', 'fiscal_code', 'tax_id', 'registration_number'],
  cui: ['company_id', 'business_id', 'entity_id'],
  
  // Location
  country: ['nation', 'country_code'],
  region: ['state', 'province', 'county'],
  department: ['district', 'administrative_area'],
  
  // Agricultural Details
  crops: ['cultivation', 'products', 'farm_products'],
  livestock_present: ['animals', 'has_livestock', 'livestock'],
  irrigation_method: ['irrigation', 'watering_system', 'irrigation_type'],
  certifications: ['certificates', 'qualifications', 'standards'],
  land_use_types: ['land_use', 'usage_types', 'cultivation_types'],
  
  // Equipment and Technology
  equipment: ['machinery', 'farm_equipment', 'tools'],
  software_used: ['technology', 'digital_tools', 'management_software'],
  
  // Dates and Timeline
  established_date: ['founded', 'established', 'start_date', 'inception_date'],
  registration_date: ['registered', 'incorporation_date'],
} as const;

// Subsidy-specific field mappings
export const SUBSIDY_FIELD_MAPPINGS = {
  program_title: ['title', 'name', 'program_name'],
  program_code: ['reference', 'id', 'identifier', 'program_id'],
  summary: ['description', 'overview', 'about'],
  application_deadline: ['deadline', 'due_date', 'submission_deadline'],
  applicable_regions: ['regions', 'areas', 'coverage_area'],
  total_funding: ['budget', 'available_funds', 'total_amount'],
  funding_range: ['amount_range', 'funding_limits', 'grant_range'],
  eligibility_criteria: ['requirements', 'criteria', 'eligibility'],
  required_documents: ['documents', 'paperwork', 'required_files'],
  contact_info: ['contact', 'agency_contact', 'program_contact'],
} as const;

/**
 * Normalize field name to match standard mapping keys
 */
export const normalizeFieldName = (fieldName: string): string => {
  return fieldName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Find standard field name from potential aliases
 */
export const findStandardFieldName = (
  fieldName: string,
  mappings: Record<string, readonly string[]> = FARM_FIELD_MAPPINGS
): string | null => {
  const normalized = normalizeFieldName(fieldName);
  
  // Check if it's already a standard field
  if (normalized in mappings) {
    return normalized;
  }
  
  // Search through aliases
  for (const [standardField, aliases] of Object.entries(mappings)) {
    if (aliases.includes(normalized)) {
      return standardField;
    }
  }
  
  return null;
};

/**
 * Map extracted data to standard field names
 */
export const mapExtractedFields = (
  extractedData: Record<string, any>,
  mappings: Record<string, readonly string[]> = FARM_FIELD_MAPPINGS
): Record<string, any> => {
  const mappedData: Record<string, any> = {};
  const unmappedFields: Record<string, any> = {};
  
  for (const [originalField, value] of Object.entries(extractedData)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    
    const standardField = findStandardFieldName(originalField, mappings);
    
    if (standardField) {
      mappedData[standardField] = value;
      logger.debug('Field mapped', { 
        original: originalField, 
        standard: standardField, 
        value: typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value 
      });
    } else {
      unmappedFields[originalField] = value;
      logger.debug('Field not mapped', { 
        original: originalField, 
        value: typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value 
      });
    }
  }
  
  // Include unmapped fields with prefix for review
  for (const [field, value] of Object.entries(unmappedFields)) {
    mappedData[`custom_${normalizeFieldName(field)}`] = value;
  }
  
  logger.debug('Field mapping completed', { 
    mappedCount: Object.keys(mappedData).length, 
    unmappedCount: Object.keys(unmappedFields).length 
  });
  
  return mappedData;
};

/**
 * Validate mapped data against required fields
 */
export const validateMappedData = (
  mappedData: Record<string, any>,
  requiredFields: string[] = ['farm_name', 'owner_name']
): { isValid: boolean; missingFields: string[]; score: number } => {
  const missingFields = requiredFields.filter(field => !mappedData[field]);
  const presentFields = Object.keys(mappedData).filter(key => 
    mappedData[key] !== null && 
    mappedData[key] !== undefined && 
    mappedData[key] !== ''
  );
  
  const score = Math.min(1, presentFields.length / Math.max(10, requiredFields.length * 2));
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    score
  };
};

/**
 * Merge multiple extraction results with field-level conflict resolution
 */
export const mergeExtractionResults = (
  results: Array<{
    source: string;
    data: Record<string, any>;
    confidence: number;
  }>
): { mergedData: Record<string, any>; fieldSources: Record<string, string> } => {
  const mergedData: Record<string, any> = {};
  const fieldSources: Record<string, string> = {};
  
  // Sort results by confidence (highest first)
  const sortedResults = results.sort((a, b) => b.confidence - a.confidence);
  
  for (const result of sortedResults) {
    for (const [field, value] of Object.entries(result.data)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }
      
      // Use value if field not set or current source has higher confidence
      if (!mergedData[field] || !fieldSources[field]) {
        mergedData[field] = value;
        fieldSources[field] = result.source;
      }
    }
  }
  
  logger.debug('Extraction results merged', { 
    sourceCount: results.length, 
    mergedFields: Object.keys(mergedData).length 
  });
  
  return { mergedData, fieldSources };
};

/**
 * Generate confidence score based on field completeness and quality
 */
export const calculateExtractionConfidence = (
  extractedData: Record<string, any>,
  requiredFields: string[] = ['farm_name', 'owner_name']
): number => {
  const validation = validateMappedData(extractedData, requiredFields);
  const fieldCount = Object.keys(extractedData).length;
  
  // Base score from field count (max 0.6)
  const fieldScore = Math.min(0.6, fieldCount / 15);
  
  // Bonus for required fields (max 0.3)
  const requiredScore = (requiredFields.length - validation.missingFields.length) / requiredFields.length * 0.3;
  
  // Quality bonus for complex fields (max 0.1)
  const qualityScore = ['address', 'crops', 'certifications', 'equipment'].filter(
    field => extractedData[field] && extractedData[field].length > 0
  ).length / 4 * 0.1;
  
  return Math.min(1, fieldScore + requiredScore + qualityScore);
};

/**
 * Format extracted data for UI display
 */
export const formatExtractedDataForUI = (
  extractedData: Record<string, any>,
  fieldSources?: Record<string, string>
): Array<{
  field: string;
  label: string;
  value: any;
  source?: string;
  type: 'text' | 'number' | 'boolean' | 'array' | 'object';
}> => {
  const fieldLabels: Record<string, string> = {
    farm_name: 'Farm Name',
    owner_name: 'Owner Name',
    contact_email: 'Email',
    contact_phone: 'Phone',
    address: 'Address',
    total_hectares: 'Total Area (hectares)',
    legal_status: 'Legal Status',
    tax_number: 'Tax Number',
    country: 'Country',
    region: 'Region',
    department: 'Department',
    crops: 'Crops',
    livestock_present: 'Livestock Present',
    irrigation_method: 'Irrigation Method',
    certifications: 'Certifications',
    equipment: 'Equipment',
    established_date: 'Established Date',
  };
  
  const getFieldType = (value: any): 'text' | 'number' | 'boolean' | 'array' | 'object' => {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'text';
  };
  
  return Object.entries(extractedData)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([field, value]) => ({
      field,
      label: fieldLabels[field] || field.split('_').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' '),
      value,
      source: fieldSources?.[field],
      type: getFieldType(value)
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export default {
  FARM_FIELD_MAPPINGS,
  SUBSIDY_FIELD_MAPPINGS,
  normalizeFieldName,
  findStandardFieldName,
  mapExtractedFields,
  validateMappedData,
  mergeExtractionResults,
  calculateExtractionConfidence,
  formatExtractedDataForUI,
};