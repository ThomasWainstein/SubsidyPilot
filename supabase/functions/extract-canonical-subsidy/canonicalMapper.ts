/**
 * Canonical mapping functions for subsidy extraction
 */

export const CANONICAL_FIELD_PRIORITIES = {
  high: [
    'scheme_id', 'scheme_title', 'scheme_title_en', 'legal_basis', 'aid_category',
    'wto_classification', 'eligible_countries', 'eligible_regions', 'application_deadline',
    'scheme_duration', 'funding_source', 'total_budget', 'aid_intensity_max',
    'minimum_aid_amount', 'maximum_aid_amount', 'eligible_beneficiary_types',
    'enterprise_size_criteria', 'sectoral_scope', 'financial_thresholds'
  ],
  medium: [
    'land_requirements', 'livestock_requirements', 'farming_practices', 'crop_specifications',
    'application_method', 'required_documents', 'assessment_criteria', 'monitoring_requirements',
    'cross_compliance', 'state_aid_cumulation', 'primary_objective', 'sustainability_goals'
  ],
  optional: [
    'managing_authority', 'data_source', 'last_updated', 'quality_flags'
  ]
};

export const FIELD_MAPPINGS: Record<string, string> = {
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

export function mapToCanonicalSchema(extractedData: Record<string, any>, sourceInfo: Record<string, string> = {}): Record<string, any> {
  const canonicalData: Record<string, any> = {};
  const provenance: Record<string, string | string[]> = {};
  const flaggedForAdmin: string[] = [];

  // Map extracted data to canonical fields
  for (const [key, value] of Object.entries(extractedData)) {
    if (!value || value === '') continue;

    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const canonicalField = FIELD_MAPPINGS[normalizedKey] || FIELD_MAPPINGS[key];

    if (canonicalField) {
      try {
        canonicalData[canonicalField] = transformValue(canonicalField, value);
        provenance[canonicalField] = sourceInfo[key] || 'extraction';
      } catch (error) {
        console.error(`Error mapping ${key} to ${canonicalField}:`, error);
      }
    } else if (key in CANONICAL_FIELD_PRIORITIES.high || 
               key in CANONICAL_FIELD_PRIORITIES.medium || 
               key in CANONICAL_FIELD_PRIORITIES.optional) {
      canonicalData[key] = transformValue(key, value);
      provenance[key] = sourceInfo[key] || 'extraction';
    }
  }

  // Check for missing high-priority fields
  for (const field of CANONICAL_FIELD_PRIORITIES.high) {
    if (!canonicalData[field]) {
      flaggedForAdmin.push(field);
    }
  }

  canonicalData.flagged_for_admin = flaggedForAdmin;
  canonicalData.source = provenance;
  canonicalData.last_updated = new Date().toISOString();

  return canonicalData;
}

function transformValue(fieldName: string, value: any): any {
  // Handle arrays
  const arrayFields = [
    'eligible_countries', 'eligible_regions', 'sectoral_scope', 'farming_practices',
    'crop_specifications', 'required_documents', 'sustainability_goals',
    'eligible_beneficiary_types', 'data_source'
  ];
  
  if (arrayFields.includes(fieldName)) {
    if (typeof value === 'string') {
      return value.split(/[,;]/).map(v => v.trim()).filter(v => v);
    }
    return Array.isArray(value) ? value : [value];
  }

  // Handle numbers
  const numberFields = ['total_budget', 'aid_intensity_max', 'minimum_aid_amount', 'maximum_aid_amount'];
  if (numberFields.includes(fieldName)) {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : Number(value);
    return isNaN(num) ? undefined : num;
  }

  // Handle dates
  const dateFields = ['application_deadline', 'scheme_duration', 'last_updated'];
  if (dateFields.includes(fieldName)) {
    try {
      return new Date(value).toISOString();
    } catch {
      return value;
    }
  }

  return value;
}