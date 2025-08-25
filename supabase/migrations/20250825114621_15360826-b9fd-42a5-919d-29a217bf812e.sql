-- CRITICAL SECURITY FIX: Update existing public policies to require authentication

-- Check and update subsidies table policy if it's currently public
DO $$
BEGIN
    -- Drop and recreate policies that allow public access
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subsidies' AND policyname = 'Anyone can view subsidies') THEN
        DROP POLICY "Anyone can view subsidies" ON public.subsidies;
        CREATE POLICY "Authenticated users can view subsidies" ON public.subsidies
            FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_packages' AND policyname = 'Anyone can view active credit packages') THEN
        DROP POLICY "Anyone can view active credit packages" ON public.credit_packages;
        CREATE POLICY "Authenticated users can view active credit packages" ON public.credit_packages
            FOR SELECT USING ((active = true) AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subsidy_categories' AND policyname = 'Anyone can view subsidy categories') THEN
        DROP POLICY "Anyone can view subsidy categories" ON public.subsidy_categories;
        CREATE POLICY "Authenticated users can view subsidy categories" ON public.subsidy_categories
            FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subsidy_locations' AND policyname = 'Anyone can view subsidy locations') THEN
        DROP POLICY "Anyone can view subsidy locations" ON public.subsidy_locations;  
        CREATE POLICY "Authenticated users can view subsidy locations" ON public.subsidy_locations
            FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'applicant_types' AND policyname = 'Anyone can view applicant types') THEN
        DROP POLICY "Anyone can view applicant types" ON public.applicant_types;
        CREATE POLICY "Authenticated users can view applicant types" ON public.applicant_types
            FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    END IF;
END $$;