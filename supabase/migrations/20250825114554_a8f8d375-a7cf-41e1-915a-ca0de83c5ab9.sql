-- CRITICAL SECURITY FIX: Restrict public access to business-critical data

-- Fix subsidies table - require authentication instead of public access
DROP POLICY IF EXISTS "Anyone can view subsidies" ON public.subsidies;
CREATE POLICY "Authenticated users can view subsidies" ON public.subsidies
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Fix credit_packages table - protect pricing strategy
DROP POLICY IF EXISTS "Anyone can view active credit packages" ON public.credit_packages;
CREATE POLICY "Authenticated users can view active credit packages" ON public.credit_packages
    FOR SELECT USING ((active = true) AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));

-- Fix subsidy_categories table - protect classification system
DROP POLICY IF EXISTS "Anyone can view subsidy categories" ON public.subsidy_categories;
CREATE POLICY "Authenticated users can view subsidy categories" ON public.subsidy_categories
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Fix subsidy_locations table - protect geographic targeting data
DROP POLICY IF EXISTS "Anyone can view subsidy locations" ON public.subsidy_locations;  
CREATE POLICY "Authenticated users can view subsidy locations" ON public.subsidy_locations
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Fix applicant_types table - protect form generation logic
DROP POLICY IF EXISTS "Anyone can view applicant types" ON public.applicant_types;
CREATE POLICY "Authenticated users can view applicant types" ON public.applicant_types
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Log security fix
INSERT INTO public.user_actions (
    user_id, 
    action_type, 
    resource_type, 
    action_data, 
    triggered_by
) VALUES (
    NULL,
    'security_fix_applied',
    'rls_policies', 
    jsonb_build_object(
        'description', 'Restricted public access to business-critical tables',
        'tables_affected', ARRAY['subsidies', 'credit_packages', 'subsidy_categories', 'subsidy_locations', 'applicant_types'],
        'timestamp', now()
    ),
    'security_audit'
);