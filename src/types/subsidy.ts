
export interface MultilingualText extends Record<string, string> {
  en: string;
  fr: string;
  es: string;
  ro: string;
  pl: string;
}

export interface Subsidy {
  // Core identification
  id: string;
  raw_log_id?: string;
  
  // Basic subsidy information
  url: string | null;
  title: string | null;
  description: string | null;
  eligibility: string | null;
  
  // Funding details
  amount: number[] | null; // Support for [min, max] ranges
  co_financing_rate: number | null;
  previous_acceptance_rate: number | null;
  
  // Timing and application
  deadline: string | null;
  project_duration: string | null;
  payment_terms: string | null;
  application_method: string | null;
  
  // Classification and targeting
  program: string | null;
  agency: string | null;
  region: string[] | null;
  sector: string[] | null;
  funding_type: string | null;
  funding_source: string | null;
  
  // Evaluation and requirements
  evaluation_criteria: string | null;
  priority_groups: any[] | null;
  legal_entity_type: string[] | null;
  
  // Compliance and support
  reporting_requirements: string | null;
  compliance_requirements: string | null;
  language: string | null;
  technical_support: string | null;
  
  // Application logic
  application_requirements: any[] | null;
  questionnaire_steps: any[] | null;
  requirements_extraction_status: string | null;
  
  // Documents and attachments
  documents: any[] | null;
  
  // Extended classification
  objectives: string[] | null;
  eligible_actions: string[] | null;
  ineligible_actions: string[] | null;
  beneficiary_types: string[] | null;
  investment_types: string[] | null;
  geographic_scope: any | null;
  conditional_eligibility: any | null;
  
  // Funding details (enhanced)
  funding_tranches: any[] | null;
  co_financing_rates_by_category: any | null;
  
  // Application timing (enhanced)
  application_window_start: string | null;
  application_window_end: string | null;
  submission_conditions: string | null;
  
  // Scoring and evaluation (enhanced)
  scoring_criteria: any[] | null;
  minimum_score: number | null;
  rejection_conditions: string[] | null;
  
  // System fields
  matchConfidence: number;
  matching_algorithm_score: number | null;
  audit: any | null;
  missing_fields: string[] | null;
  audit_notes: string | null;
  created_at?: string;
  updated_at?: string;
  
  // Legacy fields for backward compatibility
  categories?: string[];
  amount_min?: number;
  amount_max?: number;
}
