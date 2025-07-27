-- Comprehensive schema update for AgriTool canonical subsidy structure
-- Drop and recreate subsidies_structured with the canonical schema

DROP TABLE IF EXISTS subsidies_structured CASCADE;

CREATE TABLE public.subsidies_structured (
  -- Core identification
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_log_id UUID REFERENCES raw_logs(id),
  
  -- Basic subsidy information
  url TEXT,
  title TEXT,
  description TEXT,
  eligibility TEXT,
  
  -- Funding details
  amount NUMERIC[], -- Support for [min, max] ranges
  co_financing_rate NUMERIC,
  previous_acceptance_rate NUMERIC,
  
  -- Timing and application
  deadline DATE,
  project_duration TEXT,
  payment_terms TEXT,
  application_method TEXT,
  
  -- Classification and targeting
  program TEXT,
  agency TEXT,
  region TEXT[],
  sector TEXT[],
  funding_type TEXT,
  funding_source TEXT,
  
  -- Evaluation and requirements
  evaluation_criteria TEXT,
  priority_groups JSONB DEFAULT '[]'::jsonb,
  legal_entity_type TEXT[],
  
  -- Compliance and support
  reporting_requirements TEXT,
  compliance_requirements TEXT,
  language TEXT DEFAULT 'fr',
  technical_support TEXT,
  
  -- Application logic (NEW canonical fields)
  application_requirements JSONB DEFAULT '[]'::jsonb,
  questionnaire_steps JSONB DEFAULT '[]'::jsonb,
  requirements_extraction_status TEXT DEFAULT 'pending',
  
  -- Documents and attachments
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Extended classification (NEW)
  objectives TEXT[], -- thematic categories: productivity, climate, etc.
  eligible_actions TEXT[],
  ineligible_actions TEXT[],
  beneficiary_types TEXT[], -- PME, cooperative, research orgs, etc.
  investment_types TEXT[], -- new, used, lease
  geographic_scope JSONB DEFAULT '{}'::jsonb, -- detailed region/department
  conditional_eligibility JSONB DEFAULT '{}'::jsonb, -- special cases: JA, NI, CUMA
  
  -- Funding details (enhanced)
  funding_tranches JSONB DEFAULT '[]'::jsonb,
  co_financing_rates_by_category JSONB DEFAULT '{}'::jsonb,
  
  -- Application timing (enhanced)
  application_window_start DATE,
  application_window_end DATE,
  submission_conditions TEXT,
  
  -- Scoring and evaluation (enhanced)
  scoring_criteria JSONB DEFAULT '[]'::jsonb,
  minimum_score NUMERIC,
  rejection_conditions TEXT[],
  
  -- System fields
  matching_algorithm_score NUMERIC,
  audit JSONB DEFAULT '{}'::jsonb,
  missing_fields TEXT[] DEFAULT '{}',
  audit_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subsidies_structured ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view subsidies_structured" 
ON public.subsidies_structured 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage subsidies_structured" 
ON public.subsidies_structured 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Create indexes for better performance
CREATE INDEX idx_subsidies_structured_region ON public.subsidies_structured USING GIN(region);
CREATE INDEX idx_subsidies_structured_sector ON public.subsidies_structured USING GIN(sector);
CREATE INDEX idx_subsidies_structured_beneficiary_types ON public.subsidies_structured USING GIN(beneficiary_types);
CREATE INDEX idx_subsidies_structured_objectives ON public.subsidies_structured USING GIN(objectives);
CREATE INDEX idx_subsidies_structured_deadline ON public.subsidies_structured (deadline);
CREATE INDEX idx_subsidies_structured_application_window ON public.subsidies_structured (application_window_start, application_window_end);

-- Add trigger for updated_at
CREATE TRIGGER update_subsidies_structured_updated_at
BEFORE UPDATE ON public.subsidies_structured
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();