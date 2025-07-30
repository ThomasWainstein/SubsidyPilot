/**
 * Centralized field mapping utility for extraction data
 * This replaces all scattered mapping logic throughout the codebase
 */

import { logger } from '@/lib/logger';

export interface ExtractionData {
  [key: string]: any;
}

export interface FormData {
  [key: string]: any;
}

export interface MappingResult {
  mappedData: FormData;
  unmappedFields: string[];
  errors: string[];
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