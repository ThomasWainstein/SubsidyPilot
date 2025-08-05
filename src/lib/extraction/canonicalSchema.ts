/**
 * Canonical schema for AgriTool subsidy mapping
 * Based on EU data standards, FranceAgriMer, EAFRD, WTO, and international grant systems
 */

export interface CanonicalSubsidyData {
  // High Priority Fields
  scheme_id?: string;
  scheme_title?: string;
  scheme_title_en?: string;
  legal_basis?: string;
  aid_category?: string;
  wto_classification?: string;
  eligible_countries?: string[];
  eligible_regions?: string[];
  application_deadline?: string;
  scheme_duration?: string;
  funding_source?: string;
  total_budget?: number;
  aid_intensity_max?: number;
  minimum_aid_amount?: number;
  maximum_aid_amount?: number;
  eligible_beneficiary_types?: string[];
  enterprise_size_criteria?: string;
  sectoral_scope?: string[];
  financial_thresholds?: string;

  // Medium Priority Fields
  land_requirements?: string;
  livestock_requirements?: string;
  farming_practices?: string[];
  crop_specifications?: string[];
  application_method?: string;
  required_documents?: string[];
  assessment_criteria?: string;
  monitoring_requirements?: string;
  cross_compliance?: string;
  state_aid_cumulation?: string;
  primary_objective?: string;
  sustainability_goals?: string[];

  // Optional Fields
  managing_authority?: string;
  data_source?: string[];
  last_updated?: string;
  quality_flags?: string[];

  // System Fields
  flagged_for_admin?: string[];
  source?: Record<string, string | string[]>;
}

export const CANONICAL_FIELD_PRIORITIES = {
  high: [
    'scheme_id',
    'scheme_title',
    'scheme_title_en',
    'legal_basis',
    'aid_category',
    'wto_classification',
    'eligible_countries',
    'eligible_regions',
    'application_deadline',
    'scheme_duration',
    'funding_source',
    'total_budget',
    'aid_intensity_max',
    'minimum_aid_amount',
    'maximum_aid_amount',
    'eligible_beneficiary_types',
    'enterprise_size_criteria',
    'sectoral_scope',
    'financial_thresholds'
  ],
  medium: [
    'land_requirements',
    'livestock_requirements',
    'farming_practices',
    'crop_specifications',
    'application_method',
    'required_documents',
    'assessment_criteria',
    'monitoring_requirements',
    'cross_compliance',
    'state_aid_cumulation',
    'primary_objective',
    'sustainability_goals'
  ],
  optional: [
    'managing_authority',
    'data_source',
    'last_updated',
    'quality_flags'
  ]
} as const;

export const FIELD_MAPPINGS: Record<string, string> = {
  // Common aliases to canonical field mapping
  'id': 'scheme_id',
  'code': 'scheme_id',
  'title': 'scheme_title',
  'name': 'scheme_title',
  'titre': 'scheme_title',
  'deadline': 'application_deadline',
  'date_limite': 'application_deadline',
  'budget': 'total_budget',
  'amount': 'total_budget',
  'montant': 'total_budget',
  'description': 'primary_objective',
  'eligibility': 'eligible_beneficiary_types',
  'beneficiaires': 'eligible_beneficiary_types',
  'documents': 'required_documents',
  'pieces_jointes': 'required_documents',
  'region': 'eligible_regions',
  'regions': 'eligible_regions',
  'sector': 'sectoral_scope',
  'secteur': 'sectoral_scope',
  'funding_type': 'funding_source',
  'source_financement': 'funding_source',
  'objectives': 'primary_objective',
  'objectifs': 'primary_objective',
  'criteria': 'assessment_criteria',
  'criteres': 'assessment_criteria'
};

export function validateCanonicalData(data: CanonicalSubsidyData): {
  isValid: boolean;
  missingHighPriority: string[];
  flaggedForAdmin: string[];
} {
  const missingHighPriority: string[] = [];
  const flaggedForAdmin: string[] = [];

  // Check high priority fields
  for (const field of CANONICAL_FIELD_PRIORITIES.high) {
    const value = (data as any)[field];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      missingHighPriority.push(field);
      flaggedForAdmin.push(field);
    }
  }

  // Add any existing flagged fields
  if (data.flagged_for_admin) {
    flaggedForAdmin.push(...data.flagged_for_admin);
  }

  return {
    isValid: missingHighPriority.length === 0,
    missingHighPriority: [...new Set(missingHighPriority)],
    flaggedForAdmin: [...new Set(flaggedForAdmin)]
  };
}