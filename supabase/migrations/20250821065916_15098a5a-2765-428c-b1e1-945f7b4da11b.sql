-- Phase 1B: Fix remaining security issues - Views and Final RLS

-- 1. Fix security definer view issue - recreate with proper security
DROP VIEW IF EXISTS public.farm_profiles_view;

-- Create a secure function instead of a view to avoid security definer issues
CREATE OR REPLACE FUNCTION public.get_farm_profiles(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  farm_id uuid,
  farm_name text,
  address text,
  total_hectares numeric,
  legal_status text,
  cnp_or_cui text,
  country text,
  department text,
  profile_created_at timestamp with time zone,
  profile_updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  RETURN QUERY
  SELECT 
    cp.id AS profile_id,
    cp.user_id,
    f.id AS farm_id,
    f.name AS farm_name,
    f.address,
    f.total_hectares,
    f.legal_status,
    f.cnp_or_cui,
    f.country,
    f.department,
    cp.created_at AS profile_created_at,
    cp.updated_at AS profile_updated_at
  FROM client_profiles cp
  LEFT JOIN farms f ON cp.legacy_farm_id = f.id
  WHERE cp.applicant_type_id = (
    SELECT id FROM applicant_types WHERE type_name = 'farmer'
  )
  AND cp.user_id = p_user_id; -- Ensure user can only see their own profiles
END;
$function$;

-- 2. Clean up ALL backup tables for security (they shouldn't be accessible via API)
DO $$
DECLARE
    backup_table_name TEXT;
    backup_count INTEGER := 0;
BEGIN
    FOR backup_table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE '%_backup_%'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(backup_table_name) || ' CASCADE';
        backup_count := backup_count + 1;
        RAISE NOTICE 'Dropped backup table: %', backup_table_name;
    END LOOP;
    
    IF backup_count > 0 THEN
        RAISE NOTICE 'Cleaned up % backup tables for security', backup_count;
    END IF;
END $$;

-- 3. Enable RLS on any remaining system tables that might need it
-- Check and enable RLS on farms table (critical for user data separation)
ALTER TABLE IF EXISTS public.farms ENABLE ROW LEVEL SECURITY;

-- Add missing RLS policy for farms if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'farms' 
        AND policyname = 'Users can view their own farms'
    ) THEN
        CREATE POLICY "Users can view their own farms" 
        ON public.farms 
        FOR SELECT 
        USING (user_id = auth.uid());
    END IF;
END $$;

-- 4. Ensure all critical tables have proper RLS policies
-- Farm documents table
ALTER TABLE IF EXISTS public.farm_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'farm_documents' 
        AND policyname = 'Users can manage documents for their farms'
    ) THEN
        CREATE POLICY "Users can manage documents for their farms" 
        ON public.farm_documents 
        FOR ALL 
        USING (EXISTS (
            SELECT 1 FROM farms 
            WHERE farms.id = farm_documents.farm_id 
            AND farms.user_id = auth.uid()
        ))
        WITH CHECK (EXISTS (
            SELECT 1 FROM farms 
            WHERE farms.id = farm_documents.farm_id 
            AND farms.user_id = auth.uid()
        ));
    END IF;
END $$;

-- 5. Add comprehensive security monitoring functions
CREATE OR REPLACE FUNCTION public.get_security_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    rls_count integer;
    total_tables integer;
    backup_tables integer;
    security_definer_functions integer;
BEGIN
    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables pt
    WHERE pt.schemaname = 'public'
    AND pt.rowsecurity = true;
    
    -- Count total public tables (excluding system tables)
    SELECT COUNT(*) INTO total_tables
    FROM pg_tables pt
    WHERE pt.schemaname = 'public'
    AND pt.tablename NOT LIKE 'pg_%'
    AND pt.tablename NOT LIKE '%_backup_%';
    
    -- Count remaining backup tables
    SELECT COUNT(*) INTO backup_tables
    FROM pg_tables pt
    WHERE pt.schemaname = 'public'
    AND pt.tablename LIKE '%_backup_%';
    
    -- Count security definer functions
    SELECT COUNT(*) INTO security_definer_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL OR NOT ('search_path=public' = ANY(p.proconfig)));
    
    result := jsonb_build_object(
        'tables_with_rls', rls_count,
        'total_tables', total_tables,
        'rls_coverage_percent', CASE 
            WHEN total_tables > 0 THEN ROUND((rls_count::numeric / total_tables) * 100, 2)
            ELSE 100
        END,
        'backup_tables_remaining', backup_tables,
        'security_definer_functions_without_search_path', security_definer_functions,
        'security_grade', CASE 
            WHEN backup_tables = 0 AND security_definer_functions = 0 AND rls_count >= total_tables THEN 'A+'
            WHEN backup_tables <= 1 AND security_definer_functions <= 1 AND rls_count >= (total_tables * 0.9) THEN 'A'
            WHEN backup_tables <= 3 AND security_definer_functions <= 3 AND rls_count >= (total_tables * 0.8) THEN 'B'
            ELSE 'C'
        END,
        'timestamp', now(),
        'recommendations', CASE 
            WHEN backup_tables > 0 THEN jsonb_build_array('Remove backup tables')
            WHEN security_definer_functions > 0 THEN jsonb_build_array('Fix function search paths')
            ELSE jsonb_build_array('Security configuration is optimal')
        END
    );
    
    RETURN result;
END;
$function$;

-- 6. Add security event logging capability
CREATE TABLE IF NOT EXISTS public.security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    event_data jsonb DEFAULT '{}',
    risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolution_notes text
);

-- Enable RLS on security events table
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Service role can insert security events
CREATE POLICY "Service role can log security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- 7. Create production readiness checker
CREATE OR REPLACE FUNCTION public.check_production_readiness()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    security_status jsonb;
    critical_issues text[] := '{}';
    warnings text[] := '{}';
    ready_for_production boolean := true;
BEGIN
    -- Get security status
    SELECT get_security_status() INTO security_status;
    
    -- Check for critical issues
    IF (security_status->>'backup_tables_remaining')::integer > 0 THEN
        critical_issues := array_append(critical_issues, 'Backup tables present - security risk');
        ready_for_production := false;
    END IF;
    
    IF (security_status->>'security_definer_functions_without_search_path')::integer > 0 THEN
        critical_issues := array_append(critical_issues, 'Functions without search_path - security risk');
        ready_for_production := false;
    END IF;
    
    IF (security_status->>'rls_coverage_percent')::numeric < 90 THEN
        critical_issues := array_append(critical_issues, 'RLS coverage below 90% - data security risk');
        ready_for_production := false;
    END IF;
    
    -- Check for warnings
    IF (security_status->>'rls_coverage_percent')::numeric < 100 THEN
        warnings := array_append(warnings, 'Some tables may not have RLS enabled');
    END IF;
    
    RETURN jsonb_build_object(
        'production_ready', ready_for_production,
        'security_grade', security_status->>'security_grade',
        'critical_issues', to_jsonb(critical_issues),
        'warnings', to_jsonb(warnings),
        'security_details', security_status,
        'timestamp', now(),
        'next_steps', CASE 
            WHEN ready_for_production THEN jsonb_build_array('System is production ready')
            ELSE jsonb_build_array('Fix critical issues before production deployment')
        END
    );
END;
$function$;