/**
 * Data mapping functions for converting between extraction data and form data
 * Provides bidirectional synchronization capabilities
 */

import { farmProfileFieldMappings, subsidyDocumentMappings, createReverseMapping, type FieldMapping } from './fieldMappings';

export interface ExtractionData {
  [key: string]: any;
  extractedFields?: Record<string, any>;
  confidence?: number;
  error?: string;
  debugInfo?: any;
}

export interface FormData {
  [key: string]: any;
}

export interface MappingResult {
  mappedData: FormData;
  unmappedFields: Record<string, any>;
  errors: string[];
  stats: {
    totalFields: number;
    mappedFields: number;
    errorFields: number;
  };
}

/**
 * Maps extraction data to form data using field mappings
 */
export const mapExtractionToForm = (
  extractedData: ExtractionData, 
  includeFarmProfile: boolean = true,
  includeSubsidyDocs: boolean = false
): MappingResult => {
  if (!extractedData) {
    return {
      mappedData: {},
      unmappedFields: {},
      errors: ['No extraction data provided'],
      stats: { totalFields: 0, mappedFields: 0, errorFields: 0 }
    };
  }

  // Get the actual fields from either extractedFields or direct properties
  const fields = extractedData.extractedFields || extractedData;
  const mappedData: FormData = {};
  const unmappedFields: Record<string, any> = {};
  const errors: string[] = [];

  // Select which mappings to use
  const mappings: FieldMapping[] = [];
  if (includeFarmProfile) mappings.push(...farmProfileFieldMappings);
  if (includeSubsidyDocs) mappings.push(...subsidyDocumentMappings);

  let errorFields = 0;
  let mappedFields = 0;

  // Process each mapping
  mappings.forEach(({ sourceKey, targetKey, parser }) => {
    const rawValue = fields[sourceKey];
    
    if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      try {
        const parsedValue = parser ? parser(rawValue) : rawValue;
        
        if (parsedValue !== undefined) {
          mappedData[targetKey] = parsedValue;
          mappedFields++;
        } else if (parser) {
          // Parser returned undefined, which means parsing failed
          errors.push(`Failed to parse ${sourceKey}: invalid format`);
          errorFields++;
        }
      } catch (error) {
        errors.push(`Error parsing ${sourceKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorFields++;
      }
    }
  });

  // Collect unmapped fields (fields that exist in extraction but have no mapping)
  const mappedSourceKeys = new Set(mappings.map(m => m.sourceKey));
  Object.entries(fields).forEach(([key, value]) => {
    if (!mappedSourceKeys.has(key) && 
        !['confidence', 'error', 'debugInfo', 'rawResponse'].includes(key) &&
        value !== undefined && value !== null && value !== '') {
      unmappedFields[key] = value;
    }
  });

  const totalFields = Object.keys(fields).filter(key => 
    !['confidence', 'error', 'debugInfo', 'rawResponse'].includes(key) &&
    fields[key] !== undefined && fields[key] !== null && fields[key] !== ''
  ).length;

  return {
    mappedData,
    unmappedFields,
    errors,
    stats: {
      totalFields,
      mappedFields,
      errorFields
    }
  };
};

/**
 * Maps form data back to extraction data format (for bidirectional sync)
 */
export const mapFormToExtraction = (
  formData: FormData,
  includeFarmProfile: boolean = true,
  includeSubsidyDocs: boolean = false
): ExtractionData => {
  const mappings: FieldMapping[] = [];
  if (includeFarmProfile) mappings.push(...farmProfileFieldMappings);
  if (includeSubsidyDocs) mappings.push(...subsidyDocumentMappings);

  const reverseMapping = createReverseMapping(mappings);
  const extractedData: ExtractionData = {};

  Object.entries(formData).forEach(([formKey, value]) => {
    const extractionKey = reverseMapping.get(formKey);
    if (extractionKey && value !== undefined && value !== null && value !== '') {
      extractedData[extractionKey] = value;
    }
  });

  return extractedData;
};

/**
 * Merges multiple extraction results intelligently
 * Prioritizes higher confidence values and more complete data
 */
export const mergeExtractionResults = (
  extractions: ExtractionData[],
  prioritizeLatest: boolean = true
): ExtractionData => {
  if (extractions.length === 0) return {};
  if (extractions.length === 1) return extractions[0];

  const merged: ExtractionData = {
    extractedFields: {},
    confidence: 0,
    debugInfo: {
      mergedFrom: extractions.length,
      mergingStrategy: prioritizeLatest ? 'latest-priority' : 'confidence-priority'
    }
  };

  // Collect all field keys
  const allFields = new Set<string>();
  extractions.forEach(extraction => {
    const fields = extraction.extractedFields || extraction;
    Object.keys(fields).forEach(key => {
      if (!['confidence', 'error', 'debugInfo', 'rawResponse'].includes(key)) {
        allFields.add(key);
      }
    });
  });

  // For each field, select the best value
  allFields.forEach(fieldKey => {
    let bestValue: any;
    let bestConfidence = -1;
    let bestIndex = -1;

    extractions.forEach((extraction, index) => {
      const fields = extraction.extractedFields || extraction;
      const value = fields[fieldKey];
      
      if (value !== undefined && value !== null && value !== '') {
        const confidence = extraction.confidence || 0;
        
        // Selection criteria:
        // 1. If prioritizeLatest is true, prefer more recent (higher index)
        // 2. Otherwise, prefer higher confidence
        // 3. Prefer non-empty values
        const isRecent = prioritizeLatest && index > bestIndex;
        const hasHigherConfidence = !prioritizeLatest && confidence > bestConfidence;
        const isFirstValidValue = bestValue === undefined;
        
        if (isFirstValidValue || isRecent || hasHigherConfidence) {
          bestValue = value;
          bestConfidence = confidence;
          bestIndex = index;
        }
      }
    });

    if (bestValue !== undefined) {
      merged.extractedFields![fieldKey] = bestValue;
    }
  });

  // Calculate average confidence
  const confidences = extractions
    .map(e => e.confidence || 0)
    .filter(c => c > 0);
  
  if (confidences.length > 0) {
    merged.confidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  return merged;
};

/**
 * Validates mapped form data against expected types and constraints
 */
export const validateMappedData = (mappedData: FormData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Basic validation rules
  if (mappedData.total_hectares !== undefined && mappedData.total_hectares <= 0) {
    errors.push('Total hectares must be positive');
  }

  if (mappedData.staff_count !== undefined && mappedData.staff_count < 0) {
    errors.push('Staff count cannot be negative');
  }

  if (mappedData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mappedData.email)) {
    errors.push('Invalid email format');
  }

  if (mappedData.establishment_date) {
    const date = new Date(mappedData.establishment_date);
    if (date > new Date()) {
      errors.push('Establishment date cannot be in the future');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Utility function to get human-readable field names
 */
export const getFieldDisplayName = (fieldKey: string): string => {
  const mapping = [...farmProfileFieldMappings, ...subsidyDocumentMappings]
    .find(m => m.targetKey === fieldKey || m.sourceKey === fieldKey);
  
  if (mapping?.description) {
    return mapping.description;
  }
  
  // Fallback: convert camelCase/snake_case to readable format
  return fieldKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};