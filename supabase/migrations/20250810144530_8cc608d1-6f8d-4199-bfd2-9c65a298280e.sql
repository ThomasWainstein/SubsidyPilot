-- Step 1: Inventory all offending policies
-- List policies whose USING/WITH CHECK contains inline auth.*() or current_setting()
WITH pol AS (
  SELECT
    n.nspname    AS schema_name,
    c.relname    AS table_name,
    p.polname    AS policy_name,
    p.polcmd     AS cmd,
    pg_get_expr(p.polqual,  p.polrelid)   AS using_expr,
    pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
  FROM pg_policy p
  JOIN pg_class  c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
)
SELECT schema_name, table_name, policy_name, cmd, using_expr, check_expr
FROM pol
WHERE
  COALESCE(using_expr, '')     ~* '\bauth\.[a-z_0-9]+\(\)'
  OR COALESCE(check_expr, '')  ~* '\bauth\.[a-z_0-9]+\(\)'
  OR COALESCE(using_expr, '')  ~* '\bcurrent_setting\('
  OR COALESCE(check_expr, '')  ~* '\bcurrent_setting\('
ORDER BY schema_name, table_name, policy_name;

-- Step 2: Create a safe place to store originals (rollback safety)
CREATE SCHEMA IF NOT EXISTS admin_tools;

CREATE TABLE IF NOT EXISTS admin_tools.policy_backups (
  backup_id      BIGSERIAL PRIMARY KEY,
  backed_up_at   TIMESTAMPTZ DEFAULT NOW(),
  schema_name    TEXT NOT NULL,
  table_name     TEXT NOT NULL,
  policy_name    TEXT NOT NULL,
  polcmd         TEXT,
  using_expr     TEXT,
  check_expr     TEXT,
  definition_sql TEXT NOT NULL
);

-- Step 3: Auto-generate fixed policy SQL function
CREATE OR REPLACE FUNCTION admin_tools.generate_fixed_policy_sql(
  p_schema TEXT,
  p_table  TEXT,
  p_policy TEXT
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  fixed_using  TEXT;
  fixed_check  TEXT;
  cmd_text     TEXT;
  create_sql   TEXT;
  drop_sql     TEXT;
  full_sql     TEXT;
BEGIN
  SELECT
    p.polcmd,
    pg_get_expr(p.polqual,  p.polrelid)   AS using_expr,
    pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
  INTO r
  FROM pg_policy p
  JOIN pg_class  c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = p_schema AND c.relname = p_table AND p.polname = p_policy;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Policy %.%.% not found', p_schema, p_table, p_policy;
  END IF;

  -- Replace inline auth.*() with (select auth.*())
  fixed_using := r.using_expr;
  fixed_check := r.check_expr;

  IF fixed_using IS NOT NULL THEN
    fixed_using := regexp_replace(fixed_using, '\bauth\.([a-z_0-9]+)\(\)', '(select auth.\1())', 'gi');
    fixed_using := regexp_replace(fixed_using, '\bcurrent_setting\(', '(select current_setting(', 'gi');
  END IF;

  IF fixed_check IS NOT NULL THEN
    fixed_check := regexp_replace(fixed_check, '\bauth\.([a-z_0-9]+)\(\)', '(select auth.\1())', 'gi');
    fixed_check := regexp_replace(fixed_check, '\bcurrent_setting\(', '(select current_setting(', 'gi');
  END IF;

  -- Translate polcmd to CREATE POLICY USING/WITH CHECK block
  cmd_text := CASE r.polcmd
    WHEN 'r' THEN 'FOR SELECT'
    WHEN 'a' THEN 'FOR ALL'
    WHEN 'w' THEN 'FOR UPDATE'
    WHEN 'd' THEN 'FOR DELETE'
    WHEN 'i' THEN 'FOR INSERT'
    ELSE 'FOR ALL'
  END;

  drop_sql := format('DROP POLICY IF EXISTS %I ON %I.%I;', p_policy, p_schema, p_table);

  create_sql := format('CREATE POLICY %I ON %I.%I %s', p_policy, p_schema, p_table, cmd_text);

  IF fixed_using IS NOT NULL THEN
    create_sql := create_sql || format(' USING (%s)', fixed_using);
  END IF;

  IF fixed_check IS NOT NULL THEN
    create_sql := create_sql || format(' WITH CHECK (%s)', fixed_check);
  END IF;

  create_sql := create_sql || ';';

  full_sql := drop_sql || E'\n' || create_sql;
  RETURN full_sql;
END;
$$;

-- Step 4: Apply fixes in one shot (with backup)
DO $$
DECLARE
  r RECORD;
  ddl TEXT;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, p.polname AS policy_name,
           p.polcmd,
           pg_get_expr(p.polqual,  p.polrelid)   AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE
      COALESCE(pg_get_expr(p.polqual, p.polrelid),'')     ~* '\bauth\.[a-z_0-9]+\(\)'
      OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid),'')  ~* '\bauth\.[a-z_0-9]+\(\)'
      OR COALESCE(pg_get_expr(p.polqual, p.polrelid),'')       ~* '\bcurrent_setting\('
      OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid),'')  ~* '\bcurrent_setting\('
  LOOP
    -- Backup original definition
    INSERT INTO admin_tools.policy_backups(schema_name, table_name, policy_name, polcmd, using_expr, check_expr, definition_sql)
    VALUES (
      r.schema_name, r.table_name, r.policy_name, r.polcmd, r.using_expr, r.check_expr,
      format(
        'CREATE POLICY %I ON %I.%I %s%s%s;',
        r.policy_name, r.schema_name, r.table_name,
        CASE r.polcmd
          WHEN 'r' THEN 'FOR SELECT'
          WHEN 'a' THEN 'FOR ALL'
          WHEN 'w' THEN 'FOR UPDATE'
          WHEN 'd' THEN 'FOR DELETE'
          WHEN 'i' THEN 'FOR INSERT'
          ELSE 'FOR ALL'
        END,
        CASE WHEN r.using_expr IS NOT NULL THEN format(' USING (%s)', r.using_expr) ELSE '' END,
        CASE WHEN r.check_expr IS NOT NULL THEN format(' WITH CHECK (%s)', r.check_expr) ELSE '' END
      )
    );

    -- Build fixed DDL and execute
    ddl := admin_tools.generate_fixed_policy_sql(r.schema_name, r.table_name, r.policy_name);
    EXECUTE ddl;
    
    RAISE NOTICE 'Fixed policy: %.%.%', r.schema_name, r.table_name, r.policy_name;
  END LOOP;
END $$;

-- Step 5: Verify (should drop to 0 offenders)
WITH pol AS (
  SELECT n.nspname schema_name, c.relname table_name, p.polname policy_name,
         pg_get_expr(p.polqual,  p.polrelid)   AS using_expr,
         pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
)
SELECT COUNT(*) AS remaining_offenders
FROM pol
WHERE
  COALESCE(using_expr, '')    ~* '\bauth\.[a-z_0-9]+\(\)'
  OR COALESCE(check_expr, '') ~* '\bauth\.[a-z_0-9]+\(\)'
  OR COALESCE(using_expr, '') ~* '\bcurrent_setting\('
  OR COALESCE(check_expr, '') ~* '\bcurrent_setting\(';

-- Step 6: Create helper functions for future use
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_uid() RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT auth.uid() $$;

CREATE OR REPLACE FUNCTION app.current_role() RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT auth.role() $$;

-- Clean up the helper function
DROP FUNCTION admin_tools.generate_fixed_policy_sql(TEXT, TEXT, TEXT);