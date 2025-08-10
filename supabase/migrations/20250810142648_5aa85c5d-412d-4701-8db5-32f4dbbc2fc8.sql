-- Fix security warnings: Set search_path for STABLE helper functions

-- Update helper functions with proper search_path security
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
  SELECT (app_claims() ->> 'sub')::uuid
$$;

CREATE OR REPLACE FUNCTION app_org_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT app_claims() ->> 'org_id'
$$;

CREATE OR REPLACE FUNCTION app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(app_claims() ->> 'role', 'user')
$$;