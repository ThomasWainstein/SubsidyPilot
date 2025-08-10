-- Fix security warnings: Properly handle function dependencies

-- First, temporarily drop the policies that depend on the functions
DROP POLICY IF EXISTS "farm_documents_select" ON public.farm_documents;
DROP POLICY IF EXISTS "farm_documents_insert" ON public.farm_documents;
DROP POLICY IF EXISTS "farm_documents_update" ON public.farm_documents;
DROP POLICY IF EXISTS "farm_documents_delete" ON public.farm_documents;
DROP POLICY IF EXISTS "applications_select" ON public.applications;
DROP POLICY IF EXISTS "applications_insert" ON public.applications;
DROP POLICY IF EXISTS "applications_update" ON public.applications;
DROP POLICY IF EXISTS "applications_delete" ON public.applications;
DROP POLICY IF EXISTS "farms_select" ON public.farms;
DROP POLICY IF EXISTS "farms_insert" ON public.farms;
DROP POLICY IF EXISTS "farms_update" ON public.farms;
DROP POLICY IF EXISTS "farms_delete" ON public.farms;

-- Now drop and recreate functions with proper security settings
DROP FUNCTION IF EXISTS app_user_id();
DROP FUNCTION IF EXISTS app_org_id();
DROP FUNCTION IF EXISTS app_role();
DROP FUNCTION IF EXISTS app_claims();

-- Recreate functions with proper security settings
CREATE OR REPLACE FUNCTION app_claims()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb
$$;

CREATE OR REPLACE FUNCTION app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT (public.app_claims() ->> 'sub')::uuid
$$;

CREATE OR REPLACE FUNCTION app_org_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.app_claims() ->> 'org_id'
$$;

CREATE OR REPLACE FUNCTION app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(public.app_claims() ->> 'role', 'user')
$$;

-- Recreate the consolidated policies using the secure functions
CREATE POLICY "farm_documents_select"
ON public.farm_documents
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = public.app_user_id()
));

CREATE POLICY "farm_documents_insert"
ON public.farm_documents
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = public.app_user_id()
));

CREATE POLICY "farm_documents_update"
ON public.farm_documents
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = public.app_user_id()
));

CREATE POLICY "farm_documents_delete"
ON public.farm_documents
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = public.app_user_id()
));

CREATE POLICY "applications_select"
ON public.applications
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = public.app_user_id()
));

CREATE POLICY "applications_insert"
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = public.app_user_id()
));

CREATE POLICY "applications_update"
ON public.applications
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = public.app_user_id()
));

CREATE POLICY "applications_delete"
ON public.applications
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = public.app_user_id()
));

CREATE POLICY "farms_select"
ON public.farms
FOR SELECT
TO authenticated
USING (user_id = public.app_user_id());

CREATE POLICY "farms_insert"
ON public.farms
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.app_user_id());

CREATE POLICY "farms_update"
ON public.farms
FOR UPDATE
TO authenticated
USING (user_id = public.app_user_id());

CREATE POLICY "farms_delete"
ON public.farms
FOR DELETE
TO authenticated
USING (user_id = public.app_user_id());