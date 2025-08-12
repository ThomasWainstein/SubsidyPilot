-- First, let's test current AI processing
-- We'll upgrade the AI content processor to handle comprehensive extraction

-- Add new comprehensive fields to subsidies_structured table
ALTER TABLE subsidies_structured 
ADD COLUMN IF NOT EXISTS reference_code TEXT,
ADD COLUMN IF NOT EXISTS managing_agency TEXT,
ADD COLUMN IF NOT EXISTS categories TEXT[],
ADD COLUMN IF NOT EXISTS funding_programme TEXT,
ADD COLUMN IF NOT EXISTS policy_objective TEXT,
ADD COLUMN IF NOT EXISTS call_type TEXT,
ADD COLUMN IF NOT EXISTS status_detailed TEXT,

-- Dates section
ADD COLUMN IF NOT EXISTS publication_date DATE,
ADD COLUMN IF NOT EXISTS opening_date DATE,
ADD COLUMN IF NOT EXISTS evaluation_start_date DATE,
ADD COLUMN IF NOT EXISTS signature_date DATE,
ADD COLUMN IF NOT EXISTS extended_deadlines JSONB,
ADD COLUMN IF NOT EXISTS payment_schedule JSONB,
ADD COLUMN IF NOT EXISTS timeline_notes TEXT,

-- Enhanced eligibility
ADD COLUMN IF NOT EXISTS eligible_entities TEXT[],
ADD COLUMN IF NOT EXISTS geographic_eligibility JSONB,
ADD COLUMN IF NOT EXISTS entity_size TEXT,
ADD COLUMN IF NOT EXISTS activity_sector_codes TEXT[],
ADD COLUMN IF NOT EXISTS previous_award_restrictions TEXT,
ADD COLUMN IF NOT EXISTS special_conditions TEXT,

-- Enhanced funding details
ADD COLUMN IF NOT EXISTS total_budget NUMERIC,
ADD COLUMN IF NOT EXISTS funding_rate_details JSONB,
ADD COLUMN IF NOT EXISTS duration_limits TEXT,
ADD COLUMN IF NOT EXISTS cofinancing_sources JSONB,
ADD COLUMN IF NOT EXISTS payment_modality TEXT,
ADD COLUMN IF NOT EXISTS budget_tranches JSONB,

-- Project scope & objectives
ADD COLUMN IF NOT EXISTS objectives_detailed TEXT,
ADD COLUMN IF NOT EXISTS expected_results TEXT,
ADD COLUMN IF NOT EXISTS impact_indicators JSONB,
ADD COLUMN IF NOT EXISTS eligible_expenses_detailed JSONB,
ADD COLUMN IF NOT EXISTS ineligible_expenses JSONB,
ADD COLUMN IF NOT EXISTS priority_themes TEXT[],

-- Application process details
ADD COLUMN IF NOT EXISTS process_steps JSONB,
ADD COLUMN IF NOT EXISTS application_language TEXT,
ADD COLUMN IF NOT EXISTS required_documents_detailed JSONB,
ADD COLUMN IF NOT EXISTS submission_method_detailed TEXT,
ADD COLUMN IF NOT EXISTS submission_format TEXT,
ADD COLUMN IF NOT EXISTS contact_information JSONB,
ADD COLUMN IF NOT EXISTS support_resources JSONB,

-- Evaluation & selection
ADD COLUMN IF NOT EXISTS selection_criteria JSONB,
ADD COLUMN IF NOT EXISTS evaluation_committee TEXT,
ADD COLUMN IF NOT EXISTS evaluation_phases JSONB,
ADD COLUMN IF NOT EXISTS conflict_of_interest_notes TEXT,
ADD COLUMN IF NOT EXISTS decision_publication_method TEXT,

-- Enhanced documents & annexes
ADD COLUMN IF NOT EXISTS regulatory_references JSONB,
ADD COLUMN IF NOT EXISTS verbatim_blocks JSONB,
ADD COLUMN IF NOT EXISTS forms_detected JSONB,
ADD COLUMN IF NOT EXISTS forms_recreated JSONB,

-- Meta & cross-references
ADD COLUMN IF NOT EXISTS translations JSONB,
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS related_programmes TEXT[],
ADD COLUMN IF NOT EXISTS cross_funding_links JSONB,

-- Compliance & transparency
ADD COLUMN IF NOT EXISTS beneficiary_reporting_requirements TEXT,
ADD COLUMN IF NOT EXISTS compliance_audit_mechanisms TEXT,
ADD COLUMN IF NOT EXISTS sanctions_for_non_compliance TEXT,
ADD COLUMN IF NOT EXISTS transparency_notes TEXT,
ADD COLUMN IF NOT EXISTS previous_recipients_list TEXT,
ADD COLUMN IF NOT EXISTS procurement_obligations TEXT,
ADD COLUMN IF NOT EXISTS environmental_social_safeguards TEXT,
ADD COLUMN IF NOT EXISTS additional_support_mechanisms TEXT,

-- Processing metadata
ADD COLUMN IF NOT EXISTS extraction_completeness_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS extraction_model TEXT,
ADD COLUMN IF NOT EXISTS extraction_version TEXT DEFAULT 'v2_comprehensive',
ADD COLUMN IF NOT EXISTS document_analysis_performed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS forms_analysis_performed BOOLEAN DEFAULT FALSE;