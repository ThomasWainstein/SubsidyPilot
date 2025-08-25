-- Phase 2: Enhanced Database Schema for Enterprise-Ready Universal Platform
-- Implementing key improvements from strategic review

-- Create sectors taxonomy table (aligned with EU NACE codes)
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nace_code TEXT UNIQUE NOT NULL,
  sector_name JSONB NOT NULL DEFAULT '{}', -- Multi-language support
  parent_sector_id UUID REFERENCES public.sectors(id),
  level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for sectors
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active sectors" ON public.sectors FOR SELECT USING (is_active = true);
CREATE POLICY "Service role can manage sectors" ON public.sectors FOR ALL USING (auth.role() = 'service_role');

-- Enhanced universal applications with lifecycle tracking
ALTER TABLE public.universal_applications ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'draft';
ALTER TABLE public.universal_applications ADD COLUMN IF NOT EXISTS awarded_amount DECIMAL(15,2);
ALTER TABLE public.universal_applications ADD COLUMN IF NOT EXISTS decision_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.universal_applications ADD COLUMN IF NOT EXISTS application_reference TEXT;
ALTER TABLE public.universal_applications ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES public.sectors(id);
ALTER TABLE public.universal_applications ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'EUR';
ALTER TABLE public.universal_applications ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]';

-- Document processing logs for AI transparency
CREATE TABLE public.document_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  applicant_profile_id UUID REFERENCES public.applicant_profiles(id),
  processing_type TEXT NOT NULL, -- 'extraction', 'validation', 'translation'
  ai_model TEXT,
  processing_status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'retry'
  confidence_score DECIMAL(3,2),
  input_data JSONB,
  output_data JSONB,
  error_details JSONB,
  processing_time_ms INTEGER,
  credits_used INTEGER DEFAULT 0,
  retry_attempt INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for document processing logs
ALTER TABLE public.document_processing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view logs for their profiles" ON public.document_processing_logs 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.applicant_profiles ap 
    WHERE ap.id = document_processing_logs.applicant_profile_id 
    AND ap.user_id = auth.uid()
  )
);
CREATE POLICY "Service role can manage all processing logs" ON public.document_processing_logs 
FOR ALL USING (auth.role() = 'service_role');

-- Enhanced applicant profiles with audit trail and completion tracking
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS sector_ids UUID[] DEFAULT '{}';
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS target_currencies TEXT[] DEFAULT '{"EUR"}';
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS missing_fields JSONB DEFAULT '[]';
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]';
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS gdpr_consent_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Multi-user access for organizations (municipalities, enterprises)
CREATE TABLE public.profile_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_profile_id UUID NOT NULL REFERENCES public.applicant_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id),
  access_level TEXT NOT NULL DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  invitation_status TEXT DEFAULT 'active', -- 'pending', 'active', 'revoked'
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(applicant_profile_id, user_id)
);

-- Enable RLS for profile collaborators
ALTER TABLE public.profile_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view collaborations they're part of" ON public.profile_collaborators 
FOR SELECT USING (user_id = auth.uid() OR invited_by = auth.uid());
CREATE POLICY "Profile owners can manage collaborators" ON public.profile_collaborators 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.applicant_profiles ap 
    WHERE ap.id = profile_collaborators.applicant_profile_id 
    AND ap.user_id = auth.uid()
  )
);

-- Notification system for smart alerts
CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_profile_id UUID REFERENCES public.applicant_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'deadline_warning', 'new_match', 'profile_incomplete', 'application_update'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.user_notifications 
FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role can manage all notifications" ON public.user_notifications 
FOR ALL USING (auth.role() = 'service_role');

-- Insert sample sectors (EU NACE aligned)
INSERT INTO public.sectors (nace_code, sector_name, level) VALUES
('A', '{"en": "Agriculture, forestry and fishing", "fr": "Agriculture, sylviculture et pêche", "ro": "Agricultură, silvicultură și pescuit"}', 1),
('B', '{"en": "Mining and quarrying", "fr": "Industries extractives", "ro": "Industria extractivă"}', 1),
('C', '{"en": "Manufacturing", "fr": "Industrie manufacturière", "ro": "Industria prelucrătoare"}', 1),
('D', '{"en": "Electricity, gas, steam", "fr": "Production électricité, gaz, vapeur", "ro": "Producția și furnizarea de energie electrică"}', 1),
('E', '{"en": "Water supply, waste management", "fr": "Production eau, assainissement", "ro": "Distribuția apei, salubritate"}', 1),
('F', '{"en": "Construction", "fr": "Construction", "ro": "Construcții"}', 1),
('G', '{"en": "Wholesale and retail trade", "fr": "Commerce de gros et de détail", "ro": "Comerț cu ridicata și cu amănuntul"}', 1),
('H', '{"en": "Transportation and storage", "fr": "Transports et entreposage", "ro": "Transport și depozitare"}', 1),
('I', '{"en": "Accommodation and food service", "fr": "Hébergement et restauration", "ro": "Hoteluri și restaurante"}', 1),
('J', '{"en": "Information and communication", "fr": "Information et communication", "ro": "Informații și comunicații"}', 1),
('K', '{"en": "Financial and insurance activities", "fr": "Activités financières et assurance", "ro": "Activități financiare și de asigurări"}', 1),
('L', '{"en": "Real estate activities", "fr": "Activités immobilières", "ro": "Tranzacții imobiliare"}', 1),
('M', '{"en": "Professional, scientific activities", "fr": "Activités spécialisées, scientifiques", "ro": "Activități profesionale, științifice și tehnice"}', 1),
('N', '{"en": "Administrative and support services", "fr": "Activités services administratifs", "ro": "Activități de servicii administrative"}', 1),
('O', '{"en": "Public administration and defence", "fr": "Administration publique", "ro": "Administrația publică și apărarea"}', 1),
('P', '{"en": "Education", "fr": "Enseignement", "ro": "Învățământ"}', 1),
('Q', '{"en": "Human health and social work", "fr": "Santé humaine et action sociale", "ro": "Sănătatea și asistența socială"}', 1),
('R', '{"en": "Arts, entertainment and recreation", "fr": "Arts, spectacles et loisirs", "ro": "Activități de spectacole, culturale și recreative"}', 1),
('S', '{"en": "Other service activities", "fr": "Autres activités de services", "ro": "Alte activități de servicii"}', 1),
('T', '{"en": "Household activities", "fr": "Activités ménages", "ro": "Activități ale gospodăriilor"}', 1);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sectors_nace_code ON public.sectors(nace_code);
CREATE INDEX IF NOT EXISTS idx_sectors_parent ON public.sectors(parent_sector_id);
CREATE INDEX IF NOT EXISTS idx_universal_applications_sector ON public.universal_applications(sector_id);
CREATE INDEX IF NOT EXISTS idx_universal_applications_review_status ON public.universal_applications(review_status);
CREATE INDEX IF NOT EXISTS idx_document_processing_logs_profile ON public.document_processing_logs(applicant_profile_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_logs_status ON public.document_processing_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_profile_collaborators_profile ON public.profile_collaborators(applicant_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON public.user_notifications(user_id, read_at) WHERE read_at IS NULL;