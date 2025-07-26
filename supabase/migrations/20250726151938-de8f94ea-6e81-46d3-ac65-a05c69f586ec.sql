-- Add new fields to subsidies_structured table for application requirements and questionnaires
ALTER TABLE public.subsidies_structured 
ADD COLUMN IF NOT EXISTS application_requirements jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS questionnaire_steps jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS requirements_extraction_status text DEFAULT 'pending';