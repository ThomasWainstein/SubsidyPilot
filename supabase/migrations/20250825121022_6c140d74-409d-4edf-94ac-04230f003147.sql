-- Security Fix: Update existing RLS policies for business-critical data
-- Phase 1: Properly update existing policies

-- Check and update subsidies table policy
DO $$
BEGIN
    -- Drop existing overly permissive policies
    DROP POLICY IF EXISTS "Anyone can view subsidies" ON public.subsidies;
    DROP POLICY IF EXISTS "Public access to subsidies" ON public.subsidies;
    DROP POLICY IF EXISTS "Authenticated users can view subsidies" ON public.subsidies;
    
    -- Create secure policy
    CREATE POLICY "Authenticated users can view subsidies" 
    ON public.subsidies 
    FOR SELECT 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN
        -- Policy already exists, alter it
        NULL;
END $$;

-- Check and update subsidy_categories table policy  
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view subsidy categories" ON public.subsidy_categories;
    DROP POLICY IF EXISTS "Public access to categories" ON public.subsidy_categories;
    DROP POLICY IF EXISTS "Authenticated users can view subsidy categories" ON public.subsidy_categories;
    
    CREATE POLICY "Authenticated users can view subsidy categories" 
    ON public.subsidy_categories 
    FOR SELECT 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Check and update subsidy_locations table policy
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view subsidy locations" ON public.subsidy_locations;
    DROP POLICY IF EXISTS "Public access to locations" ON public.subsidy_locations;  
    DROP POLICY IF EXISTS "Authenticated users can view subsidy locations" ON public.subsidy_locations;
    
    CREATE POLICY "Authenticated users can view subsidy locations" 
    ON public.subsidy_locations 
    FOR SELECT 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Check and update scrape_runs table policy (admin only)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view scrape runs" ON public.scrape_runs;
    DROP POLICY IF EXISTS "Public access to scrape runs" ON public.scrape_runs;
    DROP POLICY IF EXISTS "Admin users can view scrape runs" ON public.scrape_runs;
    
    CREATE POLICY "Admin users can view scrape runs" 
    ON public.scrape_runs 
    FOR SELECT 
    USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Log security update
INSERT INTO public.security_audit_log (
  event_type, 
  user_id, 
  message, 
  event_data, 
  risk_level
) VALUES (
  'rls_policy_security_fix',
  auth.uid(),
  'CRITICAL: Restricted public access to business-sensitive tables',
  jsonb_build_object(
    'tables_secured', ARRAY['subsidies', 'subsidy_categories', 'subsidy_locations', 'scrape_runs'],
    'previous_access', 'public',
    'new_access', 'authenticated_users_only',
    'admin_only_tables', ARRAY['scrape_runs']
  ),
  'critical'
);