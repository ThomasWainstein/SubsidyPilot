/**
 * Centralized field mapping utility for extraction data
 * This replaces all scattered mapping logic throughout the codebase
 */

import { logger } from '@/lib/logger';
import { 
  CanonicalSubsidyData, 
  FIELD_MAPPINGS as CANONICAL_FIELD_MAPPINGS, 
  validateCanonicalData, 
  CANONICAL_FIELD_PRIORITIES 
} from './canonicalSchema';

export interface ExtractionData {
  [key: string]: any;
}

export interface FormData {
  [key: string]: any;
}

export interface MappingResult {
  mappedData: FormData | CanonicalSubsidyData;
  unmappedFields: string[];
  errors: string[];
  flaggedForAdmin?: string[];
  provenance?: Record<string, string | string[]>;
  mappingStats: {
    totalFields: number;
    mappedFields: number;
    successRate: number;
  };
}

/**
 * Master field mapping configuration
 * This is the single source of truth for all field mappings
 */
export const FIELD_MAPPINGS: Record<string, string> = {
  // Farm Identity
  farmName: 'name',
  ownerName: 'ownerName',
  
  // Address & Location
  address: 'address',
  country: 'country',
  department: 'department',
  locality: 'locality',
  
  // Legal Information
  legalStatus: 'legal_status',
  registrationNumber: 'cnp_or_cui',
  
  // Farm Details
  totalHectares: 'total_hectares',
  activities: 'land_use_types',
  cropTypes: 'land_use_types',
  
  // Livestock
  livestockPresent: 'livestock_present',
  livestockTypes: 'livestock',
  
  // Contact
  email: 'email',
  phoneNumber: 'phone',
  
  // Technical
  irrigationMethods: 'irrigation_method',
  numberOfEmployees: 'staff_count',
  softwareUsed: 'software_used',
  certifications: 'certifications',
  
  // Financial
  revenue: 'revenue',
  
  // Compliance
  technicalDocs: 'tech_docs',
  environmentalPermit: 'environmental_permit',
  
  // Subsidy Interests
  subsidyInterests: 'subsidy_interest',
  
  // Ownership
  ownOrLease: 'own_or_lease'
};

/**
 * Reverse mapping for bidirectional synchronization
 */
export const REVERSE_MAPPINGS: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_MAPPINGS).map(([k, v]) => [v, k])
);

/**
 * Value transformation functions
 */
export const VALUE_TRANSFORMERS: Record<string, (value: any) => any> = {
  total_hectares: (value: any) => {
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
  },
  
  staff_count: (value: any) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
  },
  
  livestock_present: (value: any) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
    }
    return Boolean(value);
  },
  
  land_use_types: (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Convert activities/crops to land use types
      const activities = value.toLowerCase();
      const landUseTypes: string[] = [];
      
      if (activities.includes('vegetable') || activities.includes('zucchini') || activities.includes('tomato')) {
        landUseTypes.push('vegetables');
      }
      if (activities.includes('olive') || activities.includes('fruit')) {
        landUseTypes.push('fruit_orchards');
      }
      if (activities.includes('vine') || activities.includes('wine')) {
        landUseTypes.push('vineyards');
      }
      if (activities.includes('cereal') || activities.includes('grain')) {
        landUseTypes.push('cereals');
      }
      if (activities.includes('sheep') || activities.includes('grazing')) {
        landUseTypes.push('pasture_grassland');
      }
      if (activities.includes('honey') || activities.includes('other')) {
        landUseTypes.push('other');
      }
      
      return landUseTypes.length > 0 ? landUseTypes : ['other'];
    }
    return [];
  },
  
  country: (value: any) => {
    if (!value) return '';
    const countryMappings: Record<string, string> = {
      'romania': 'RO',
      'italy': 'IT',
      'spania': 'ES',
      'spain': 'ES',
      'germany': 'DE',
      'deutschland': 'DE'
    };
    
    const normalized = value.toString().toLowerCase();
    return countryMappings[normalized] || value;
  },
  
  legal_status: (value: any) => {
    if (!value) return '';
    const statusMappings: Record<string, string> = {
      'snc': 'snc',
      'srl': 'srl',
      's.a.': 'sa',
      'sa': 'sa',
      'gmbh': 'gmbh',
      'pfa': 'pfa'
    };
    
    const normalized = value.toString().toLowerCase().replace(/\./g, '');
    return statusMappings[normalized] || value;
  }
};

/**
 * Maps extraction data to form data using centralized mapping rules
 */
export function mapExtractionToForm(extractionData: ExtractionData): MappingResult {
  const mappedData: FormData = {};
  const unmappedFields: string[] = [];
  const errors: string[] = [];
  
  logger.debug('Starting extraction to form mapping', { extractionData });
  
  try {
    Object.entries(extractionData).forEach(([sourceKey, value]) => {
      const targetKey = FIELD_MAPPINGS[sourceKey];
      
      if (targetKey) {
        try {
          // Apply transformation if available
          const transformer = VALUE_TRANSFORMERS[targetKey];
          const transformedValue = transformer ? transformer(value) : value;
          
          mappedData[targetKey] = transformedValue;
          
          logger.debug(`Mapped field: ${sourceKey} → ${targetKey}`, {
            originalValue: value,
            transformedValue
          });
        } catch (transformError) {
          errors.push(`Failed to transform ${sourceKey}: ${transformError}`);
          logger.warn(`Transform error for ${sourceKey}`, { error: transformError });
        }
      } else {
        unmappedFields.push(sourceKey);
        logger.debug(`Unmapped field: ${sourceKey}`, { value });
      }
    });
    
    const mappingStats = {
      totalFields: Object.keys(extractionData).length,
      mappedFields: Object.keys(mappedData).length,
      successRate: Object.keys(extractionData).length > 0 
        ? (Object.keys(mappedData).length / Object.keys(extractionData).length) * 100 
        : 0
    };
    
    logger.success('Extraction mapping completed', { mappingStats });
    
    return {
      mappedData,
      unmappedFields,
      errors,
      mappingStats
    };
  } catch (error) {
    logger.error('Critical error in extraction mapping', error as Error);
    throw error;
  }
}

/**
 * Maps form data back to extraction format for bidirectional sync
 */
export function mapFormToExtraction(formData: FormData): ExtractionData {
  const extractionData: ExtractionData = {};
  
  Object.entries(formData).forEach(([formKey, value]) => {
    const extractionKey = REVERSE_MAPPINGS[formKey];
    if (extractionKey) {
      extractionData[extractionKey] = value;
    }
  });
  
  return extractionData;
}

/**
 * Maps extraction data to canonical subsidy schema
 */
export function mapToCanonicalSchema(
  extractionData: ExtractionData, 
  sourceInfo: Record<string, string> = {}
): MappingResult {
  const canonicalData: CanonicalSubsidyData = {};
  const unmappedFields: string[] = [];
  const errors: string[] = [];
  const provenance: Record<string, string | string[]> = {};
  let mappedCount = 0;

  logger.debug('Starting canonical schema mapping', { extractionData });

  // Map extracted data to canonical fields
  for (const [key, value] of Object.entries(extractionData)) {
    if (!value || value === '') continue;

    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const canonicalField = CANONICAL_FIELD_MAPPINGS[normalizedKey] || CANONICAL_FIELD_MAPPINGS[key];

    if (canonicalField) {
      try {
        // Apply transformations based on field type
        const transformedValue = transformCanonicalValue(canonicalField, value);
        (canonicalData as any)[canonicalField] = transformedValue;
        
        // Track provenance
        const source = sourceInfo[key] || 'extraction';
        provenance[canonicalField] = source;
        
        mappedCount++;
        logger.debug(`Mapped canonical field: ${key} → ${canonicalField}`, {
          originalValue: value,
          transformedValue
        });
      } catch (error) {
        errors.push(`Error mapping ${key} to ${canonicalField}: ${error}`);
        logger.warn(`Transform error for ${key}`, { error });
      }
    } else {
      unmappedFields.push(key);
      logger.debug(`Unmapped field: ${key}`, { value });
    }
  }

  // Validate and flag missing high-priority fields
  const validation = validateCanonicalData(canonicalData);
  canonicalData.flagged_for_admin = validation.flaggedForAdmin;
  canonicalData.source = provenance;
  canonicalData.last_updated = new Date().toISOString();

  const mappingStats = {
    totalFields: Object.keys(extractionData).length,
    mappedFields: mappedCount,
    successRate: Object.keys(extractionData).length > 0 
      ? (mappedCount / Object.keys(extractionData).length) * 100 
      : 0
  };

  logger.success('Canonical mapping completed', { mappingStats, flaggedFields: validation.flaggedForAdmin.length });

  return {
    mappedData: canonicalData,
    unmappedFields,
    errors,
    flaggedForAdmin: validation.flaggedForAdmin,
    provenance,
    mappingStats
  };
}

function transformCanonicalValue(fieldName: string, value: any): any {
  // Handle arrays
  if (['eligible_countries', 'eligible_regions', 'sectoral_scope', 'farming_practices', 
       'crop_specifications', 'required_documents', 'sustainability_goals', 
       'eligible_beneficiary_types', 'data_source'].includes(fieldName)) {
    if (typeof value === 'string') {
      return value.split(/[,;]/).map(v => v.trim()).filter(v => v);
    }
    return Array.isArray(value) ? value : [value];
  }

  // Handle numbers
  if (['total_budget', 'aid_intensity_max', 'minimum_aid_amount', 'maximum_aid_amount'].includes(fieldName)) {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : Number(value);
    return isNaN(num) ? undefined : num;
  }

  // Handle dates
  if (['application_deadline', 'scheme_duration', 'last_updated'].includes(fieldName)) {
    try {
      return new Date(value).toISOString();
    } catch {
      return value; // Keep original if can't parse
    }
  }

  return value;
}

/**
 * Validates mapped data for common issues
 */
export function validateMappedData(data: FormData): string[] {
  const validationErrors: string[] = [];
  
  // Required field validations
  if (!data.name || data.name.trim() === '') {
    validationErrors.push('Farm name is required');
  }
  
  if (data.total_hectares !== undefined && (data.total_hectares < 0 || data.total_hectares > 100000)) {
    validationErrors.push('Total hectares must be between 0 and 100,000');
  }
  
  if (data.staff_count !== undefined && (data.staff_count < 0 || data.staff_count > 10000)) {
    validationErrors.push('Staff count must be between 0 and 10,000');
  }
  
  // Email validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    validationErrors.push('Invalid email format');
  }
  
  return validationErrors;
}