-- Fix Security Definer Views and Function Search Path issues
-- Remove SECURITY DEFINER from subsidies_public view
DROP VIEW IF EXISTS subsidies_public;

-- Recreate view without SECURITY DEFINER (safer)
CREATE VIEW subsidies_public AS
SELECT 
    id, 
    title, 
    program,
    region,
    deadline,
    agency,
    funding_type,
    created_at
FROM subsidies_structured
WHERE COALESCE(archived, false) = false;

-- Fix function search paths for remaining functions
ALTER FUNCTION public.trigger_auto_schema_extraction() SET search_path = public;
ALTER FUNCTION public.trigger_qa_validation() SET search_path = public;
ALTER FUNCTION public.auto_assign_for_review() SET search_path = public;
ALTER FUNCTION public.detect_content_changes() SET search_path = public;