-- Phase 2A: Create missing universal tables first
-- Fix the migration by creating tables before altering them

-- Create universal applications table (referenced but not created in Phase 1)
CREATE TABLE IF NOT EXISTS public.universal_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_profile_id UUID NOT NULL REFERENCES public.applicant_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subsidy_id UUID NOT NULL REFERENCES public.subsidies(id),
  application_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  review_status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  deadline_date TIMESTAMP WITH TIME ZONE,
  awarded_amount DECIMAL(15,2),
  decision_date TIMESTAMP WITH TIME ZONE,
  application_reference TEXT,
  currency_code TEXT DEFAULT 'EUR',
  notes TEXT,
  history JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for universal applications
ALTER TABLE public.universal_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for universal applications
DROP POLICY IF EXISTS "Users can view their own universal applications" ON public.universal_applications;
DROP POLICY IF EXISTS "Users can create their own universal applications" ON public.universal_applications;
DROP POLICY IF EXISTS "Users can update their own universal applications" ON public.universal_applications;
DROP POLICY IF EXISTS "Service role can manage all universal applications" ON public.universal_applications;

CREATE POLICY "Users can view their own universal applications"
ON public.universal_applications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own universal applications"
ON public.universal_applications
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own universal applications"
ON public.universal_applications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all universal applications"
ON public.universal_applications
FOR ALL
USING (auth.role() = 'service_role');

-- Create universal documents table (referenced but not created in Phase 1)
CREATE TABLE IF NOT EXISTS public.universal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_profile_id UUID NOT NULL REFERENCES public.applicant_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  document_type TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  processing_status TEXT DEFAULT 'upload_pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for universal documents
ALTER TABLE public.universal_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for universal documents
DROP POLICY IF EXISTS "Users can view their own universal documents" ON public.universal_documents;
DROP POLICY IF EXISTS "Users can create their own universal documents" ON public.universal_documents;
DROP POLICY IF EXISTS "Users can update their own universal documents" ON public.universal_documents;
DROP POLICY IF EXISTS "Service role can manage all universal documents" ON public.universal_documents;

CREATE POLICY "Users can view their own universal documents"
ON public.universal_documents
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own universal documents"
ON public.universal_documents
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own universal documents"
ON public.universal_documents
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all universal documents"
ON public.universal_documents
FOR ALL
USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_universal_documents_profile_id ON public.universal_documents(applicant_profile_id);
CREATE INDEX IF NOT EXISTS idx_universal_applications_profile_id ON public.universal_applications(applicant_profile_id);
CREATE INDEX IF NOT EXISTS idx_universal_applications_status ON public.universal_applications(status);
CREATE INDEX IF NOT EXISTS idx_universal_applications_review_status ON public.universal_applications(review_status);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_universal_documents_updated_at
    BEFORE UPDATE ON public.universal_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_universal_applications_updated_at
    BEFORE UPDATE ON public.universal_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();