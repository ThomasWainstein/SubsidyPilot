import { z } from 'zod';
import { standardSubsidyCategories, standardRegions, standardFundingTypes, standardLegalEntityTypes } from './subsidyValidation';

// Canonical fields for subsidies as defined in the requirements
export const CANONICAL_SUBSIDY_FIELDS = [
  'url', 'title', 'description', 'eligibility', 'documents', 'deadline',
  'amount', 'program', 'agency', 'region', 'sector', 'funding_type',
  'co_financing_rate', 'project_duration', 'payment_terms', 'application_method',
  'evaluation_criteria', 'previous_acceptance_rate', 'priority_groups',
  'legal_entity_type', 'funding_source', 'reporting_requirements',
  'compliance_requirements', 'language', 'technical_support', 'matching_algorithm_score'
] as const;

// Field mapping schema for import
export const fieldMappingSchema = z.object({
  sourceField: z.string(),
  canonicalField: z.enum(CANONICAL_SUBSIDY_FIELDS).optional(),
  transform: z.enum(['none', 'split_csv', 'parse_json', 'date_format', 'currency']).default('none'),
  required: z.boolean().default(false),
});

export type FieldMapping = z.infer<typeof fieldMappingSchema>;

// Import job schema
export const importJobSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['subsidies', 'farms', 'applications']),
  status: z.enum(['pending', 'mapping', 'validating', 'reviewing', 'importing', 'completed', 'failed', 'cancelled']),
  fileName: z.string(),
  fileSize: z.number(),
  totalRows: z.number(),
  processedRows: z.number().default(0),
  successRows: z.number().default(0),
  errorRows: z.number().default(0),
  fieldMappings: z.array(fieldMappingSchema).default([]),
  validationErrors: z.array(z.object({
    row: z.number(),
    field: z.string(),
    value: z.any(),
    error: z.string(),
    severity: z.enum(['error', 'warning']),
  })).default([]),
  duplicates: z.array(z.object({
    row: z.number(),
    duplicateField: z.string(),
    existingId: z.string().optional(),
    action: z.enum(['skip', 'overwrite', 'create_new']).optional(),
  })).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid(),
});

export type ImportJob = z.infer<typeof importJobSchema>;

// Validation schema for individual subsidy records during import
export const subsidyImportSchema = z.object({
  // Required canonical fields
  title: z.union([z.string(), z.record(z.string())]).transform((val) => {
    if (typeof val === 'string') return { en: val };
    return val;
  }),
  description: z.union([z.string(), z.record(z.string())]).transform((val) => {
    if (typeof val === 'string') return { en: val };
    return val;
  }),
  
  // Optional canonical fields
  url: z.string().url().optional(),
  eligibility: z.union([z.string(), z.record(z.string())]).optional(),
  documents: z.array(z.string()).default([]),
  deadline: z.string().datetime().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  program: z.string().optional(),
  agency: z.string().optional(),
  region: z.array(z.string()).default([]),
  sector: z.array(z.string()).default([]),
  funding_type: z.enum(standardFundingTypes).optional(),
  co_financing_rate: z.number().min(0).max(100).optional(),
  project_duration: z.string().optional(),
  payment_terms: z.string().optional(),
  application_method: z.string().optional(),
  evaluation_criteria: z.string().optional(),
  previous_acceptance_rate: z.number().min(0).max(100).optional(),
  priority_groups: z.array(z.string()).default([]),
  legal_entity_type: z.array(z.enum(standardLegalEntityTypes)).default([]),
  funding_source: z.string().optional(),
  reporting_requirements: z.string().optional(),
  compliance_requirements: z.string().optional(),
  language: z.array(z.string()).default(['en']),
  technical_support: z.string().optional(),
  matching_algorithm_score: z.number().min(0).max(100).optional(),
  
  // Internal fields for mapping to DB
  code: z.string().min(1),
  categories: z.array(z.string()).default([]),
  status: z.enum(['open', 'closed', 'upcoming']).default('open'),
});

export type SubsidyImportData = z.infer<typeof subsidyImportSchema>;

// Validation functions
export const validateImportData = (data: any[], type: 'subsidies' | 'farms' | 'applications') => {
  const errors: Array<{ row: number; field: string; value: any; error: string; severity: 'error' | 'warning' }> = [];
  
  data.forEach((row, index) => {
    try {
      if (type === 'subsidies') {
        subsidyImportSchema.parse(row);
      }
      // Add farm and application validation here when needed
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            row: index + 1,
            field: err.path.join('.'),
            value: row[err.path[0]] || 'unknown',
            error: err.message,
            severity: err.code === 'invalid_type' ? 'error' : 'warning',
          });
        });
      }
    }
  });
  
  return errors;
};

// Duplicate detection
export const detectDuplicates = (data: any[], existingData: any[], uniqueFields: string[]) => {
  const duplicates: Array<{ row: number; duplicateField: string; existingId?: string }> = [];
  
  data.forEach((row, index) => {
    uniqueFields.forEach(field => {
      if (row[field]) {
        const existing = existingData.find(item => item[field] === row[field]);
        if (existing) {
          duplicates.push({
            row: index + 1,
            duplicateField: field,
            existingId: existing.id,
          });
        }
      }
    });
  });
  
  return duplicates;
};

// Auto-mapping logic
export const autoMapFields = (sourceFields: string[]): FieldMapping[] => {
  const mappings: FieldMapping[] = [];
  
  sourceFields.forEach(field => {
    const normalized = field.toLowerCase().replace(/[_\s-]/g, '');
    let canonicalField: typeof CANONICAL_SUBSIDY_FIELDS[number] | undefined;
    
    // Auto-mapping logic
    if (normalized.includes('title') || normalized.includes('name')) {
      canonicalField = 'title';
    } else if (normalized.includes('description')) {
      canonicalField = 'description';
    } else if (normalized.includes('url') || normalized.includes('link')) {
      canonicalField = 'url';
    } else if (normalized.includes('deadline') || normalized.includes('date')) {
      canonicalField = 'deadline';
    } else if (normalized.includes('amount') || normalized.includes('funding')) {
      canonicalField = 'amount';
    } else if (normalized.includes('region')) {
      canonicalField = 'region';
    } else if (normalized.includes('sector') || normalized.includes('category')) {
      canonicalField = 'sector';
    } else if (normalized.includes('fundingtype') || normalized.includes('type')) {
      canonicalField = 'funding_type';
    }
    
    mappings.push({
      sourceField: field,
      canonicalField,
      transform: 'none',
      required: ['title', 'description'].includes(canonicalField || ''),
    });
  });
  
  return mappings;
};