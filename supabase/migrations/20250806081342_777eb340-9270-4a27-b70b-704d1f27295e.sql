-- Phase 1: Critical Infrastructure Fixes for AgriTool Pipeline Hardening

-- 1. Install pg_net extension for async HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create user_actions table for comprehensive audit trails
CREATE TABLE IF NOT EXISTS public.user_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  action_type TEXT NOT NULL, -- 'pipeline_trigger', 'document_review', 'form_generation', etc.
  resource_type TEXT NOT NULL, -- 'subsidy', 'document', 'extraction', 'application', etc.
  resource_id UUID,
  action_data JSONB DEFAULT '{}', -- Additional context data
  triggered_by TEXT DEFAULT 'user', -- 'user', 'system', 'scheduler', 'webhook'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create document_subsidy_mappings table for explicit relationships
CREATE TABLE IF NOT EXISTS public.document_subsidy_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  subsidy_id UUID NOT NULL,
  mapping_type TEXT NOT NULL, -- 'form', 'application_guide', 'eligibility_doc', 'supporting_doc'
  confidence_score NUMERIC(3,2) DEFAULT 0.0, -- 0.0 to 1.0
  extraction_method TEXT, -- 'automatic', 'manual', 'ai_classified'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, subsidy_id, mapping_type)
);

-- 4. Add audit trail fields to existing pipeline tables
ALTER TABLE public.pipeline_executions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS triggered_by TEXT DEFAULT 'system';

ALTER TABLE public.document_extractions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS triggered_by TEXT DEFAULT 'system';

ALTER TABLE public.extraction_qa_results
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- 5. Enable Row Level Security
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_subsidy_mappings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for user_actions
CREATE POLICY "Users can view their own actions"
  ON public.user_actions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all user actions"
  ON public.user_actions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 7. Create RLS policies for document_subsidy_mappings
CREATE POLICY "Authenticated users can view document mappings"
  ON public.document_subsidy_mappings
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage document mappings"
  ON public.document_subsidy_mappings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON public.user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_resource ON public.user_actions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON public.user_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_document_subsidy_mappings_document ON public.document_subsidy_mappings(document_id);
CREATE INDEX IF NOT EXISTS idx_document_subsidy_mappings_subsidy ON public.document_subsidy_mappings(subsidy_id);

-- 9. Create trigger for updated_at on document_subsidy_mappings
CREATE TRIGGER update_document_subsidy_mappings_updated_at
  BEFORE UPDATE ON public.document_subsidy_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Insert sample audit trail entries to verify functionality
INSERT INTO public.user_actions (
  action_type,
  resource_type,
  resource_id,
  action_data,
  triggered_by
) VALUES
('system_initialization', 'pipeline', null, 
 '{"phase": "infrastructure_setup", "version": "1.0"}', 'system'),
('migration_applied', 'database', null,
 '{"migration": "phase_1_hardening", "tables_created": ["user_actions", "document_subsidy_mappings"]}', 'system');