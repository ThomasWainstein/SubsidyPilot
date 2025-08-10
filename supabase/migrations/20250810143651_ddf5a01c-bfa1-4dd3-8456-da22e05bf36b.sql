-- Fix RLS performance warnings: Wrap auth.* and current_setting() calls in sub-SELECTs
-- This converts direct function calls to initplan constants, dramatically improving query performance

-- 1) Back up current policies for safety
CREATE SCHEMA IF NOT EXISTS _backup;

CREATE TABLE IF NOT EXISTS _backup.pg_policies_snapshot AS
SELECT now() AS captured_at, p.*
FROM pg_policies p
WHERE schemaname = 'public';

-- 2) Create helper function to wrap auth calls
CREATE OR REPLACE FUNCTION _backup.wrap_auth_calls(expr TEXT) 
RETURNS TEXT 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF expr IS NULL THEN
    RETURN NULL;
  END IF;

  -- auth.uid() -> (select auth.uid())
  expr := regexp_replace(expr, '\bauth\.uid\(\)', '(select auth.uid())', 'gi');

  -- auth.role() -> (select auth.role())  
  expr := regexp_replace(expr, '\bauth\.role\(\)', '(select auth.role())', 'gi');

  -- auth.jwt() -> (select auth.jwt())
  expr := regexp_replace(expr, '\bauth\.jwt\(\)', '(select auth.jwt())', 'gi');

  -- current_setting('request.jwt.claims', true) -> (select current_setting('request.jwt.claims', true))
  expr := regexp_replace(
    expr,
    '\bcurrent_setting\(\s*''request\.jwt\.claims''\s*,\s*true\s*\)',
    '(select current_setting(''request.jwt.claims'', true))',
    'gi'
  );

  -- current_setting('request.jwt.claims') -> (select current_setting('request.jwt.claims'))
  expr := regexp_replace(
    expr,
    '\bcurrent_setting\(\s*''request\.jwt\.claims''\s*\)',
    '(select current_setting(''request.jwt.claims''))',
    'gi'
  );

  RETURN expr;
END;
$$;

-- 3) Auto-fix all policies that call auth.* or current_setting()
DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_check TEXT;
  roles_text TEXT;
  permissive_text TEXT;
  cmd_text TEXT;
  fq_table TEXT;
  create_sql TEXT;
BEGIN
  FOR r IN
    SELECT *
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND (qual ILIKE '%auth.%' OR qual ILIKE '%current_setting(%'))
        OR (with_check IS NOT NULL AND (with_check ILIKE '%auth.%' OR with_check ILIKE '%current_setting(%'))
      )
    ORDER BY schemaname, tablename, policyname
  LOOP
    new_qual  := _backup.wrap_auth_calls(r.qual);
    new_check := _backup.wrap_auth_calls(r.with_check);

    -- Format roles list
    SELECT string_agg(quote_ident(rolname), ', ' ORDER BY rolname)
    INTO roles_text
    FROM unnest(r.roles) AS rolname;

    IF roles_text IS NULL OR roles_text = '' THEN
      roles_text := 'public';
    END IF;

    -- PERMISSIVE/RESTRICTIVE
    permissive_text := CASE WHEN r.permissive THEN 'AS PERMISSIVE' ELSE 'AS RESTRICTIVE' END;

    -- Command
    cmd_text := 'FOR ' || upper(r.cmd);

    fq_table := quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);

    create_sql :=
      'CREATE POLICY ' || quote_ident(r.policyname) || ' ON ' || fq_table || ' ' ||
      permissive_text || ' ' || cmd_text || ' TO ' || roles_text ||
      CASE WHEN new_qual  IS NOT NULL THEN ' USING (' || new_qual  || ')' ELSE '' END ||
      CASE WHEN new_check IS NOT NULL THEN ' WITH CHECK (' || new_check || ')' ELSE '' END || ';';

    RAISE NOTICE 'Fixing policy %.%', r.tablename, r.policyname;

    EXECUTE 'DROP POLICY ' || quote_ident(r.policyname) || ' ON ' || fq_table || ';';
    EXECUTE create_sql;
  END LOOP;
END $$;

-- 4) Clean up helper function
DROP FUNCTION _backup.wrap_auth_calls(TEXT);