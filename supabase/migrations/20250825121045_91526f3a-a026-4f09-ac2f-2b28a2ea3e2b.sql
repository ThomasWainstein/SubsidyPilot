-- Security Fix: Update RLS policies to restrict public access to business data
-- Critical security update to prevent unauthorized data access

-- Fix subsidies table - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view subsidies" ON public.subsidies;
DROP POLICY IF EXISTS "Public access to subsidies" ON public.subsidies;
DROP POLICY IF EXISTS "Authenticated users can view subsidies" ON public.subsidies;

CREATE POLICY "Authenticated users can view subsidies" 
ON public.subsidies 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Fix subsidy_categories table - restrict to authenticated users only  
DROP POLICY IF EXISTS "Anyone can view subsidy categories" ON public.subsidy_categories;
DROP POLICY IF EXISTS "Public access to categories" ON public.subsidy_categories;
DROP POLICY IF EXISTS "Authenticated users can view subsidy categories" ON public.subsidy_categories;

CREATE POLICY "Authenticated users can view subsidy categories" 
ON public.subsidy_categories 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Fix subsidy_locations table - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view subsidy locations" ON public.subsidy_locations;
DROP POLICY IF EXISTS "Public access to locations" ON public.subsidy_locations;  
DROP POLICY IF EXISTS "Authenticated users can view subsidy locations" ON public.subsidy_locations;

CREATE POLICY "Authenticated users can view subsidy locations" 
ON public.subsidy_locations 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Fix scrape_runs table - restrict to admin users only (operational data)
DROP POLICY IF EXISTS "Anyone can view scrape runs" ON public.scrape_runs;
DROP POLICY IF EXISTS "Public access to scrape runs" ON public.scrape_runs;
DROP POLICY IF EXISTS "Admin users can view scrape runs" ON public.scrape_runs;

CREATE POLICY "Admin users can view scrape runs" 
ON public.scrape_runs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');