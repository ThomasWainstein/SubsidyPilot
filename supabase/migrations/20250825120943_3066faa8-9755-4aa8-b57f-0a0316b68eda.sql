-- Security Fix: Restrict public access to business-critical data
-- Phase 1: Update RLS policies for sensitive tables

-- Fix subsidies table - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view subsidies" ON public.subsidies;
CREATE POLICY "Authenticated users can view subsidies" 
ON public.subsidies 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Fix subsidy_categories table - restrict to authenticated users only  
DROP POLICY IF EXISTS "Anyone can view subsidy categories" ON public.subsidy_categories;
CREATE POLICY "Authenticated users can view subsidy categories" 
ON public.subsidy_categories 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Fix subsidy_locations table - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view subsidy locations" ON public.subsidy_locations;  
CREATE POLICY "Authenticated users can view subsidy locations" 
ON public.subsidy_locations 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Fix scrape_runs table - restrict to admin users only (operational data)
DROP POLICY IF EXISTS "Anyone can view scrape runs" ON public.scrape_runs;
CREATE POLICY "Admin users can view scrape runs" 
ON public.scrape_runs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

-- Fix credit_packages table - already has correct policy, but ensure it's secure
DROP POLICY IF EXISTS "Anyone can view credit packages" ON public.credit_packages;
-- Keep existing policy: "Authenticated users can view active credit packages"

-- Create security audit log entry for this security update
INSERT INTO public.security_audit_log (
  event_type, 
  user_id, 
  message, 
  event_data, 
  risk_level
) VALUES (
  'security_policy_update',
  auth.uid(),
  'Updated RLS policies to restrict public access to business-critical data',
  jsonb_build_object(
    'tables_updated', ARRAY['subsidies', 'subsidy_categories', 'subsidy_locations', 'scrape_runs'],
    'security_level', 'critical',
    'access_changed_from', 'public',
    'access_changed_to', 'authenticated_only'
  ),
  'high'
);