-- Performance optimization: Phase 1 & 2 - Create STABLE helper functions and consolidate RLS policies

-- Phase 2: Create STABLE helper functions to avoid repeated JWT parsing
CREATE OR REPLACE FUNCTION app_claims()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb
$$;

CREATE OR REPLACE FUNCTION app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT (app_claims() ->> 'sub')::uuid
$$;

CREATE OR REPLACE FUNCTION app_org_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT app_claims() ->> 'org_id'
$$;

CREATE OR REPLACE FUNCTION app_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(app_claims() ->> 'role', 'user')
$$;

-- Phase 1: Consolidate RLS policies on farm_documents (top offender with 16 policies)
-- Drop existing multiple permissive policies
DROP POLICY IF EXISTS "Users can delete documents for their farms" ON public.farm_documents;
DROP POLICY IF EXISTS "Users can delete their farm documents" ON public.farm_documents;
DROP POLICY IF EXISTS "Users can insert own farm documents" ON public.farm_documents;
DROP POLICY IF EXISTS "Users can upload documents for their farms" ON public.farm_documents;
DROP POLICY IF EXISTS "Users can update documents for their farms" ON public.farm_documents;
DROP POLICY IF EXISTS "Users can update their farm documents" ON public.farm_documents;
DROP POLICY IF EXISTS "Users can view documents for their farms" ON public.farm_documents;
DROP POLICY IF EXISTS "Users can view their farm documents" ON public.farm_documents;
DROP POLICY IF EXISTS "farm_documents_user_access" ON public.farm_documents;

-- Create consolidated policies using STABLE helpers
CREATE POLICY "farm_documents_select"
ON public.farm_documents
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = app_user_id()
));

CREATE POLICY "farm_documents_insert"
ON public.farm_documents
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = app_user_id()
));

CREATE POLICY "farm_documents_update"
ON public.farm_documents
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = app_user_id()
));

CREATE POLICY "farm_documents_delete"
ON public.farm_documents
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = app_user_id()
));

-- Consolidate RLS policies on applications (16 policies)
DROP POLICY IF EXISTS "Users can create applications for their farms" ON public.applications;
DROP POLICY IF EXISTS "Users can delete applications for their farms" ON public.applications;
DROP POLICY IF EXISTS "Users can update applications for their farms" ON public.applications;
DROP POLICY IF EXISTS "Users can view applications for their farms" ON public.applications;
DROP POLICY IF EXISTS "applications_user_access" ON public.applications;

CREATE POLICY "applications_select"
ON public.applications
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = app_user_id()
));

CREATE POLICY "applications_insert"
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = app_user_id()
));

CREATE POLICY "applications_update"
ON public.applications
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = app_user_id()
));

CREATE POLICY "applications_delete"
ON public.applications
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = app_user_id()
));

-- Consolidate RLS policies on farms (16 policies)
DROP POLICY IF EXISTS "Users can create their own farms" ON public.farms;
DROP POLICY IF EXISTS "Users can delete their own farms" ON public.farms;
DROP POLICY IF EXISTS "Users can update their own farms" ON public.farms;
DROP POLICY IF EXISTS "Users can view their own farms" ON public.farms;
DROP POLICY IF EXISTS "farms_user_access" ON public.farms;

CREATE POLICY "farms_select"
ON public.farms
FOR SELECT
TO authenticated
USING (user_id = app_user_id());

CREATE POLICY "farms_insert"
ON public.farms
FOR INSERT
TO authenticated
WITH CHECK (user_id = app_user_id());

CREATE POLICY "farms_update"
ON public.farms
FOR UPDATE
TO authenticated
USING (user_id = app_user_id());

CREATE POLICY "farms_delete"
ON public.farms
FOR DELETE
TO authenticated
USING (user_id = app_user_id());

-- Phase 3: Drop duplicate index on scraper_logs
-- First check what indexes exist
DO $$
DECLARE
    idx_count INTEGER;
BEGIN
    -- Count scraper_logs indexes to identify duplicates
    SELECT COUNT(*) INTO idx_count
    FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'scraper_logs';
    
    -- Drop known duplicate patterns (common duplicates)
    DROP INDEX IF EXISTS public.idx_scraper_logs_session_id_duplicate;
    DROP INDEX IF EXISTS public.idx_scraper_logs_status_duplicate;
    DROP INDEX IF EXISTS public.scraper_logs_session_id_idx1;
    
    RAISE NOTICE 'Found % indexes on scraper_logs, dropped potential duplicates', idx_count;
END $$;