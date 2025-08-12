// Enhanced subsidy schema types based on the AgriTool reference schema

export interface SourceReference {
  type: 'web' | 'doc';
  url?: string;
  filename?: string;
  page?: number;
}

export interface ValueWithSource<T = any> {
  value: T;
  source: SourceReference[];
}

export interface ValueWithSourceAndLang<T = any> extends ValueWithSource<T> {
  lang?: string;
}

export interface FundingRateRule {
  category: 'immaterial' | 'material';
  pme_max_pct: number;
  ge_max_pct: number;
  dom_max_pct?: number;
  cap_per_project_eur: number;
  source: SourceReference[];
}

export interface ProjectMinSpend {
  value: number;
  eur: boolean;
  dom_exception?: number;
  source: SourceReference[];
}

export interface StatusTimeline {
  published_on: ValueWithSource<string | null>;
  opens_on: ValueWithSource<string | null>;
  deadline: ValueWithSource<string | null>;
  suspension_or_notes: ValueWithSource<string | null>;
}

export interface Financials {
  envelope_total: ValueWithSource<number | null> & { currency: string };
  funding_rate_rules: FundingRateRule[];
  project_min_spend: ProjectMinSpend;
}

export interface Beneficiaries {
  eligible_entities: ValueWithSource<string[]>;
  ineligible_entities: ValueWithSource<string[]>;
  partnership_requirements: ValueWithSource<string | null>;
}

export interface ObjectivesScope {
  objectives: ValueWithSource<string[]>;
  eligible_actions: ValueWithSource<string[]>;
  ineligible_costs: ValueWithSource<string[]>;
  geographic_scope: ValueWithSource<string | null>;
  target_products_crops: ValueWithSource<string[]>;
}

export interface Application {
  how_to_apply: ValueWithSource<string | null>;
  required_documents: ValueWithSource<string[]>;
  selection_process: ValueWithSource<string | null>;
  selection_criteria: ValueWithSource<string | null>;
  payment_schedule: ValueWithSource<string | null>;
  reporting_requirements: ValueWithSource<string | null>;
  contact: ValueWithSource<string | null>;
  faq: ValueWithSource<string | null>;
}

export interface SubsidyDocument {
  title: string;
  type: 'template' | 'form' | 'decision' | 'faq' | 'guideline' | 'addendum';
  filename: string;
  mime: string;
  lang: string;
  source: SourceReference[];
}

export interface UIMapping {
  overview_blocks: any[];
  eligibility_blocks: any[];
  budget_blocks: any[];
  process_blocks: any[];
  documents_section: string;
}

export interface Compliance {
  notes: string | null;
  state_aid_regimes: string[];
}

export interface EnhancedSubsidy {
  id: string;
  ingestion: {
    fetched_at: string;
    source_type: string;
    source_urls: string[];
    source_notes: string;
  };
  subsidy_identity: {
    title: ValueWithSourceAndLang<string | null>;
    program_name: ValueWithSource<string | null>;
    issuing_body: ValueWithSource<string | null>;
    country_region: ValueWithSource<string | null>;
    sectors: ValueWithSource<string[]>;
    languages: string[];
  };
  status_timeline: StatusTimeline;
  financials: Financials;
  beneficiaries: Beneficiaries;
  objectives_scope: ObjectivesScope;
  application: Application;
  verbatim_blocks: any[];
  documents: SubsidyDocument[];
  ui_mapping: UIMapping;
  compliance: Compliance;
  provenance: Record<string, any>;
}

// Utility type to check if a subsidy is using the enhanced format
export function isEnhancedSubsidy(subsidy: any): subsidy is EnhancedSubsidy {
  return subsidy && 
         typeof subsidy === 'object' && 
         'subsidy_identity' in subsidy &&
         'status_timeline' in subsidy &&
         'financials' in subsidy;
}