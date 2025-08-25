-- Phase 1: Database Schema Transformation for Universal Subsidy Platform
-- Transform from agricultural-focused to universal applicant system

-- Create applicant types enum
CREATE TYPE public.applicant_type AS ENUM (
  'individual',
  'business', 
  'nonprofit',
  'municipality'
);

-- Create universal applicant profiles table
CREATE TABLE public.applicant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_type public.applicant_type NOT NULL,
  profile_name TEXT NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}',
  completion_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  legacy_farm_id UUID, -- For backward compatibility with existing farm data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for applicant profiles
ALTER TABLE public.applicant_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for applicant profiles
CREATE POLICY "Users can view their own applicant profiles"
ON public.applicant_profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own applicant profiles"
ON public.applicant_profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own applicant profiles"
ON public.applicant_profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all applicant profiles"
ON public.applicant_profiles
FOR ALL
USING (auth.role() = 'service_role');

-- Create universal documents table (expand from farm_documents)
CREATE TABLE public.universal_documents (
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

-- Create universal applications table (expand from applications)
CREATE TABLE public.universal_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_profile_id UUID NOT NULL REFERENCES public.applicant_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subsidy_id UUID NOT NULL REFERENCES public.subsidies(id),
  application_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  deadline_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for universal applications
ALTER TABLE public.universal_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for universal applications
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

-- Migrate existing farms to applicant profiles for backward compatibility
INSERT INTO public.applicant_profiles (
  user_id,
  applicant_type,
  profile_name,
  profile_data,
  completion_percentage,
  legacy_farm_id,
  created_at,
  updated_at
)
SELECT 
  user_id,
  'individual'::public.applicant_type, -- Default existing farms to individual type
  name AS profile_name,
  jsonb_build_object(
    'address', address,
    'total_hectares', total_hectares,
    'legal_status', legal_status,
    'cnp_or_cui', cnp_or_cui,
    'country', country,
    'department', department,
    'contact_info', jsonb_build_object(
      'phone', phone,
      'email', email,
      'iban', iban,
      'website', website
    ),
    'legacy_data', jsonb_build_object(
      'main_crops', main_crops,
      'certification_status', certification_status,
      'slope_percentage', slope_percentage,
      'altitude', altitude,
      'bio_certification', bio_certification,
      'natura_2000', natura_2000
    )
  ) AS profile_data,
  COALESCE(completion_percentage, 0),
  id AS legacy_farm_id,
  created_at,
  updated_at
FROM public.farms
WHERE EXISTS (SELECT 1 FROM public.farms);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applicant_profiles_updated_at
    BEFORE UPDATE ON public.applicant_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_universal_documents_updated_at
    BEFORE UPDATE ON public.universal_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_universal_applications_updated_at
    BEFORE UPDATE ON public.universal_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_applicant_profiles_user_id ON public.applicant_profiles(user_id);
CREATE INDEX idx_applicant_profiles_type ON public.applicant_profiles(applicant_type);
CREATE INDEX idx_applicant_profiles_active ON public.applicant_profiles(is_active);
CREATE INDEX idx_universal_documents_profile_id ON public.universal_documents(applicant_profile_id);
CREATE INDEX idx_universal_applications_profile_id ON public.universal_applications(applicant_profile_id);
CREATE INDEX idx_universal_applications_status ON public.universal_applications(status);