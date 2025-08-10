-- Fix security warnings: Recreate helper functions with proper search_path in correct order

-- Drop functions first to avoid dependency issues
DROP FUNCTION IF EXISTS app_user_id();
DROP FUNCTION IF EXISTS app_org_id();
DROP FUNCTION IF EXISTS app_role();
DROP FUNCTION IF EXISTS app_claims();

-- Recreate functions with proper security settings in dependency order
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