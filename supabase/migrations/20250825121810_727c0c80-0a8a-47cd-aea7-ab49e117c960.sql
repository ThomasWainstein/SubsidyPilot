-- Phase 1: Database Schema Transformation for Universal Subsidy Platform (Fixed)
-- Transform from agricultural-focused to universal applicant system

-- Create applicant types enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'applicant_type') THEN
        CREATE TYPE public.applicant_type AS ENUM (
            'individual',
            'business', 
            'nonprofit',
            'municipality'
        );
    END IF;
END $$;

-- Create universal applicant profiles table
CREATE TABLE IF NOT EXISTS public.applicant_profiles (
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own applicant profiles" ON public.applicant_profiles;
DROP POLICY IF EXISTS "Users can create their own applicant profiles" ON public.applicant_profiles;
DROP POLICY IF EXISTS "Users can update their own applicant profiles" ON public.applicant_profiles;
DROP POLICY IF EXISTS "Service role can manage all applicant profiles" ON public.applicant_profiles;

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

-- Migrate existing farms to applicant profiles for backward compatibility (using correct columns)
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
    'locality', locality,
    'contact_info', jsonb_build_object(
      'phone', phone,
      'preferred_language', preferred_language
    ),
    'legacy_data', jsonb_build_object(
      'apia_region', apia_region,
      'own_or_lease', own_or_lease,
      'land_use_types', land_use_types,
      'livestock_present', livestock_present,
      'livestock', livestock,
      'environmental_permit', environmental_permit,
      'tech_docs', tech_docs,
      'subsidy_interest', subsidy_interest,
      'staff_count', staff_count,
      'certifications', certifications,
      'irrigation_method', irrigation_method,
      'revenue', revenue,
      'software_used', software_used
    )
  ) AS profile_data,
  0 AS completion_percentage, -- Default to 0, will calculate later
  id AS legacy_farm_id,
  created_at,
  updated_at
FROM public.farms
WHERE NOT EXISTS (
  SELECT 1 FROM public.applicant_profiles WHERE legacy_farm_id = farms.id
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_user_id ON public.applicant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_type ON public.applicant_profiles(applicant_type);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_active ON public.applicant_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_legacy_farm ON public.applicant_profiles(legacy_farm_id);

-- Create function to get user's applicant profiles
CREATE OR REPLACE FUNCTION get_user_applicant_profiles(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(
  id UUID,
  applicant_type public.applicant_type,
  profile_name TEXT,
  completion_percentage INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.id,
    ap.applicant_type,
    ap.profile_name,
    ap.completion_percentage,
    ap.is_active,
    ap.created_at,
    ap.updated_at
  FROM public.applicant_profiles ap
  WHERE ap.user_id = p_user_id 
  AND ap.is_active = true
  ORDER BY ap.created_at DESC;
END;
$$;