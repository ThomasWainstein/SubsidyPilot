-- CRITICAL SECURITY FIX: Enable RLS on exposed tables
-- Phase 1B: Client Profile System Migration

-- Step 1: Fix critical security issues first
ALTER TABLE public.extraction_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_logs ENABLE ROW LEVEL SECURITY;

-- Step 2: Create applicant types system for Phase 1B
CREATE TABLE public.applicant_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name TEXT NOT NULL CHECK (type_name IN ('farmer', 'individual', 'business', 'municipality', 'ngo')),
  display_name JSONB NOT NULL DEFAULT '{}', -- Multilingual display names
  schema_config JSONB NOT NULL DEFAULT '{}',
  required_documents TEXT[] DEFAULT '{}',
  validation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type_name)
);

-- Step 3: Create unified client profiles system 
CREATE TABLE public.client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  applicant_type_id UUID REFERENCES public.applicant_types(id) NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}',
  legacy_farm_id UUID REFERENCES public.farms(id), -- Backward compatibility
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure user can only have one profile per applicant type
  UNIQUE(user_id, applicant_type_id)
);

-- Step 4: Enable RLS on new tables
ALTER TABLE public.applicant_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for new tables
CREATE POLICY "Anyone can view applicant types" ON public.applicant_types
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage applicant types" ON public.applicant_types
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Client profiles policies
CREATE POLICY "Users can view their own profiles" ON public.client_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own profiles" ON public.client_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profiles" ON public.client_profiles
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.client_profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Step 6: Insert default applicant types
INSERT INTO public.applicant_types (type_name, display_name, schema_config, required_documents) VALUES
('farmer', 
 '{"en": "Farmer/Agricultural Producer", "fr": "Agriculteur/Producteur Agricole", "ro": "Fermier/Producător Agricol"}',
 '{"fields": ["farm_name", "owner_name", "address", "total_hectares", "legal_status", "cnp_or_cui", "country", "department", "crops", "livestock_present"]}',
 '{"registration", "identity", "land_ownership"}'),
('individual', 
 '{"en": "Individual/Natural Person", "fr": "Particulier/Personne Physique", "ro": "Persoană Fizică"}',
 '{"fields": ["first_name", "last_name", "birth_date", "nationality", "address", "phone", "email", "tax_number"]}',
 '{"identity", "address_proof", "tax_documents"}'),
('business', 
 '{"en": "Business/Company", "fr": "Entreprise/Société", "ro": "Întreprindere/Societate"}',
 '{"fields": ["company_name", "legal_status", "siret", "address", "sector", "registration_date", "contact_person"]}',
 '{"business_registration", "tax_documents", "statutes"}'),
('municipality', 
 '{"en": "Municipality/Local Authority", "fr": "Municipalité/Collectivité Locale", "ro": "Primărie/Autoritate Locală"}',
 '{"fields": ["municipality_name", "region", "population", "budget", "contact_person", "address"]}',
 '{"municipal_registration", "budget_documents", "deliberations"}'),
('ngo', 
 '{"en": "NGO/Association", "fr": "ONG/Association", "ro": "ONG/Asociație"}',
 '{"fields": ["organization_name", "registration_number", "legal_status", "purpose", "president", "address"]}',
 '{"statutes", "registration", "activity_report"}');

-- Step 7: Create backward compatibility view for farms
CREATE VIEW public.farm_profiles_view AS 
SELECT 
  cp.id as profile_id,
  cp.user_id,
  f.id as farm_id,
  f.name as farm_name,
  f.address,
  f.total_hectares,
  f.legal_status,
  f.cnp_or_cui,
  f.country,
  f.department,
  cp.created_at as profile_created_at,
  cp.updated_at as profile_updated_at
FROM public.client_profiles cp
LEFT JOIN public.farms f ON cp.legacy_farm_id = f.id
WHERE cp.applicant_type_id = (SELECT id FROM public.applicant_types WHERE type_name = 'farmer');

-- Step 8: Create updated_at trigger for client_profiles
CREATE OR REPLACE FUNCTION update_client_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_client_profiles_updated_at();

-- Step 9: Add indexes for performance
CREATE INDEX idx_client_profiles_user_id ON public.client_profiles(user_id);
CREATE INDEX idx_client_profiles_applicant_type ON public.client_profiles(applicant_type_id);
CREATE INDEX idx_client_profiles_legacy_farm ON public.client_profiles(legacy_farm_id) WHERE legacy_farm_id IS NOT NULL;