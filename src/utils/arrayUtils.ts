/**
 * TypeScript Array Processing Utilities for AgriTool
 * Handles all forms of array input with comprehensive logging and audit trails
 */

// Canonical array fields configuration (TypeScript version)
export const CANONICAL_ARRAY_FIELDS = [
  'amount',
  'region', 
  'sector',
  'legal_entity_type',
  'objectives',
  'beneficiary_types',
  'investment_types',
  'rejection_conditions',
  'eligible_actions',
  'ineligible_actions',
  'requirements',
  'documents_required',
  'scoring_criteria_list',
  'funding_tranches',
  'priority_groups_list',
] as const;

export const ARRAY_FIELD_TYPES: Record<string, 'numeric' | 'text'> = {
  amount: 'numeric',
  region: 'text',
  sector: 'text',
  legal_entity_type: 'text',
  objectives: 'text',
  beneficiary_types: 'text',
  investment_types: 'text',
  rejection_conditions: 'text',
  eligible_actions: 'text',
  ineligible_actions: 'text',
  requirements: 'text',
  documents_required: 'text',
  scoring_criteria_list: 'text',
  funding_tranches: 'text',
  priority_groups_list: 'text',
};

export interface ArrayCoercionResult {
  value: any[];
  original: any;
  method: string;
  fieldName: string;
  warnings: string[];
  timestamp: string;
  success: boolean;
}

export interface ArrayProcessingStats {
  totalRecords: number;
  fieldsProcessed: Record<string, {
    presentCount: number;
    emptyCount: number;
    averageLength: number;
    maxLength: number;
    totalItems: number;
  }>;
  errorCount: number;
}

/**
 * Check if a field should be treated as an array
 */
export function isArrayField(fieldName: string): boolean {
  return CANONICAL_ARRAY_FIELDS.includes(fieldName as any);
}

/**
 * Get the expected data type for an array field
 */
export function getFieldType(fieldName: string): 'numeric' | 'text' {
  return ARRAY_FIELD_TYPES[fieldName] || 'text';
}

/**
 * Robust array coercion with comprehensive audit logging
 */
export function ensureArray(
  value: any, 
  fieldName: string = 'unknown'
): ArrayCoercionResult {
  const originalValue = value;
  const warnings: string[] = [];
  const timestamp = new Date().toISOString();

  console.log(`[ArrayUtils] Coercing field '${fieldName}': ${JSON.stringify(value)} (${typeof value})`);

  try {
    // Handle null, undefined, or empty values
    if (value === null || value === undefined) {
      return {
        value: [],
        original: originalValue,
        method: 'null_handling',
        fieldName,
        warnings,
        timestamp,
        success: true
      };
    }

    // Handle already-array values
    if (Array.isArray(value)) {
      // Clean existing array
      const cleaned = value.filter(item => 
        item !== null && 
        item !== undefined && 
        String(item).trim() !== ''
      );
      
      if (cleaned.length !== value.length) {
        warnings.push(`Filtered ${value.length - cleaned.length} empty/null items`);
      }

      console.log(`[ArrayUtils] Array cleanup: ${cleaned.length} items`);
      return {
        value: cleaned,
        original: originalValue,
        method: 'array_cleanup',
        fieldName,
        warnings,
        timestamp,
        success: true
      };
    }

    // Convert to string for processing
    const strValue = String(value).trim();

    // Handle empty strings and null-like values
    if (!strValue || ['null', 'none', 'undefined', '[]', '{}'].includes(strValue.toLowerCase())) {
      return {
        value: [],
        original: originalValue,
        method: 'empty_string',
        fieldName,
        warnings,
        timestamp,
        success: true
      };
    }

    // Try JSON parsing first (most reliable)
    if (strValue.startsWith('[') && strValue.endsWith(']')) {
      try {
        const parsed = JSON.parse(strValue);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(item => 
            item !== null && 
            item !== undefined && 
            String(item).trim() !== ''
          );
          
          console.log(`[ArrayUtils] JSON parse successful: ${cleaned.length} items`);
          return {
            value: cleaned,
            original: originalValue,
            method: 'json_parse',
            fieldName,
            warnings,
            timestamp,
            success: true
          };
        } else {
          warnings.push(`JSON parsed to non-array: ${typeof parsed}`);
        }
      } catch (e) {
        warnings.push(`JSON parse failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Try Python-style list parsing
    if (strValue.startsWith('[') && strValue.endsWith(']')) {
      try {
        const cleanStr = strValue.slice(1, -1).trim(); // Remove brackets
        const items: string[] = [];
        
        if (cleanStr) {
          // Split by comma, handling quotes
          const parts = cleanStr.split(/,(?=(?:[^"']*["'][^"']*["'])*[^"']*$)/);
          for (const part of parts) {
            const cleanPart = part.trim().replace(/^['"]|['"]$/g, '');
            if (cleanPart) {
              items.push(cleanPart);
            }
          }
        }

        console.log(`[ArrayUtils] Python-style parse successful: ${items.length} items`);
        return {
          value: items,
          original: originalValue,
          method: 'python_style',
          fieldName,
          warnings,
          timestamp,
          success: true
        };
      } catch (e) {
        warnings.push(`Python-style parse failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Handle comma-separated or semicolon-separated values
    if (strValue.includes(',') || strValue.includes(';')) {
      const separator = strValue.includes(',') ? ',' : ';';
      const items = strValue
        .split(separator)
        .map(item => item.trim())
        .filter(item => item);

      if (items.length > 0) {
        console.log(`[ArrayUtils] CSV parse successful: ${items.length} items`);
        return {
          value: items,
          original: originalValue,
          method: `csv_split_${separator}`,
          fieldName,
          warnings,
          timestamp,
          success: true
        };
      }
    }

    // Handle numeric fields specially
    const fieldType = getFieldType(fieldName);
    if (fieldType === 'numeric') {
      try {
        let numericValue: number;
        if (typeof value === 'number') {
          numericValue = value;
        } else {
          numericValue = strValue.includes('.') ? parseFloat(strValue) : parseInt(strValue, 10);
        }

        if (!isNaN(numericValue)) {
          console.log(`[ArrayUtils] Numeric wrap successful: [${numericValue}]`);
          return {
            value: [numericValue],
            original: originalValue,
            method: 'numeric_wrap',
            fieldName,
            warnings,
            timestamp,
            success: true
          };
        }
      } catch (e) {
        warnings.push(`Failed to convert to numeric: ${strValue}`);
      }
    }

    // Last resort: wrap as single item
    if (strValue) {
      console.log(`[ArrayUtils] Single wrap: ['${strValue}']`);
      return {
        value: [strValue],
        original: originalValue,
        method: 'single_wrap',
        fieldName,
        warnings,
        timestamp,
        success: true
      };
    } else {
      return {
        value: [],
        original: originalValue,
        method: 'empty_fallback',
        fieldName,
        warnings,
        timestamp,
        success: true
      };
    }

  } catch (error) {
    // Critical error - log and return empty array to prevent pipeline failure
    const errorMsg = `Array coercion critical error: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[ArrayUtils] ${errorMsg}`);
    warnings.push(errorMsg);

    return {
      value: [],
      original: originalValue,
      method: 'error_fallback',
      fieldName,
      warnings,
      timestamp,
      success: false
    };
  }
}

/**
 * Process all array fields in a record
 */
export function processRecordArrays(record: Record<string, any>): {
  processedRecord: Record<string, any>;
  auditEntries: ArrayCoercionResult[];
} {
  const processedRecord = { ...record };
  const auditEntries: ArrayCoercionResult[] = [];

  console.log(`[ArrayUtils] Processing record with ${CANONICAL_ARRAY_FIELDS.length} potential array fields`);

  for (const fieldName of CANONICAL_ARRAY_FIELDS) {
    if (fieldName in record) {
      const result = ensureArray(record[fieldName], fieldName);
      processedRecord[fieldName] = result.value;
      auditEntries.push(result);

      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.warn(`[ArrayUtils] Field '${fieldName}': ${warning}`);
        }
      }
    }
  }

  console.log(`[ArrayUtils] Record processing complete: ${auditEntries.length} fields processed`);
  return { processedRecord, auditEntries };
}

/**
 * Validate that all required array fields are properly formatted
 */
export function validateArrayFields(record: Record<string, any>): string[] {
  const errors: string[] = [];

  for (const fieldName of CANONICAL_ARRAY_FIELDS) {
    if (fieldName in record) {
      const value = record[fieldName];
      
      if (!Array.isArray(value)) {
        errors.push(`Field '${fieldName}' is not an array: ${typeof value}`);
      } else if (getFieldType(fieldName) === 'numeric') {
        // Validate numeric arrays
        for (const item of value) {
          if (typeof item !== 'number') {
            const numValue = Number(item);
            if (isNaN(numValue)) {
              errors.push(`Field '${fieldName}' contains non-numeric value: ${JSON.stringify(item)}`);
            }
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Get statistics about array field processing
 */
export function getArrayStatistics(records: Record<string, any>[]): ArrayProcessingStats {
  const stats: ArrayProcessingStats = {
    totalRecords: records.length,
    fieldsProcessed: {},
    errorCount: 0
  };

  // Initialize field statistics
  for (const fieldName of CANONICAL_ARRAY_FIELDS) {
    stats.fieldsProcessed[fieldName] = {
      presentCount: 0,
      emptyCount: 0,
      averageLength: 0,
      maxLength: 0,
      totalItems: 0
    };
  }

  // Process records
  for (const record of records) {
    for (const fieldName of CANONICAL_ARRAY_FIELDS) {
      if (fieldName in record) {
        const fieldStats = stats.fieldsProcessed[fieldName];
        fieldStats.presentCount += 1;

        const value = record[fieldName];
        if (Array.isArray(value)) {
          const length = value.length;
          fieldStats.totalItems += length;
          fieldStats.maxLength = Math.max(fieldStats.maxLength, length);

          if (length === 0) {
            fieldStats.emptyCount += 1;
          }
        }
      }
    }
  }

  // Calculate averages
  for (const fieldName of CANONICAL_ARRAY_FIELDS) {
    const fieldStats = stats.fieldsProcessed[fieldName];
    if (fieldStats.presentCount > 0) {
      fieldStats.averageLength = fieldStats.totalItems / fieldStats.presentCount;
    }
  }

  return stats;
}