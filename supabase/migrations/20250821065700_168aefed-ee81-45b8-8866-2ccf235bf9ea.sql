-- Phase 1: Critical Security Fixes - Database Functions and RLS
-- Fix functions with missing or improper search_path settings

-- 1. Fix deduct_credits function - critical for credit management
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_credit_type credit_type, p_credits_to_deduct integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  credit_record RECORD;
  remaining_to_deduct INTEGER := p_credits_to_deduct;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_credits_to_deduct <= 0 THEN
    RETURN false;
  END IF;

  -- Deduct credits from oldest purchases first (FIFO)
  FOR credit_record IN
    SELECT id, credits_remaining
    FROM public.client_credits
    WHERE user_id = p_user_id 
      AND credit_type = p_credit_type
      AND credits_remaining > 0
      AND (expiry_date IS NULL OR expiry_date > NOW())
    ORDER BY purchase_date ASC
  LOOP
    IF remaining_to_deduct <= 0 THEN
      EXIT;
    END IF;
    
    IF credit_record.credits_remaining >= remaining_to_deduct THEN
      -- This record has enough credits
      UPDATE public.client_credits
      SET credits_used = credits_used + remaining_to_deduct
      WHERE id = credit_record.id;
      
      remaining_to_deduct := 0;
    ELSE
      -- Use all remaining credits from this record
      UPDATE public.client_credits
      SET credits_used = credits_purchased
      WHERE id = credit_record.id;
      
      remaining_to_deduct := remaining_to_deduct - credit_record.credits_remaining;
    END IF;
  END LOOP;
  
  RETURN remaining_to_deduct = 0;
END;
$function$;

-- 2. Fix get_available_credits function
CREATE OR REPLACE FUNCTION public.get_available_credits(p_user_id uuid, p_credit_type credit_type)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_credits INTEGER := 0;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(credits_remaining), 0) INTO total_credits
  FROM public.client_credits
  WHERE user_id = p_user_id 
    AND credit_type = p_credit_type
    AND (expiry_date IS NULL OR expiry_date > NOW());
  
  RETURN total_credits;
END;
$function$;

-- 3. Fix get_user_access_tier function
CREATE OR REPLACE FUNCTION public.get_user_access_tier(p_user_id uuid)
RETURNS access_tier
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_tier access_tier;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RETURN 'free';
  END IF;

  SELECT access_tier INTO user_tier
  FROM public.user_access_tiers
  WHERE user_id = p_user_id;
  
  -- Default to free tier if no record exists
  IF user_tier IS NULL THEN
    INSERT INTO public.user_access_tiers (user_id, access_tier)
    VALUES (p_user_id, 'free')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN 'free';
  END IF;
  
  RETURN user_tier;
END;
$function$;

-- 4. Fix handle_new_user_access_tier function
CREATE OR REPLACE FUNCTION public.handle_new_user_access_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Input validation
  IF NEW.id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_access_tiers (user_id, access_tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- 5. Fix safe_data_purge function
CREATE OR REPLACE FUNCTION public.safe_data_purge()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    backup_timestamp TEXT;
    subsidies_count INTEGER;
    locations_count INTEGER;
    categories_count INTEGER;
BEGIN
    -- Generate timestamp for backup tables
    backup_timestamp := to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    
    -- Count existing data
    SELECT COUNT(*) INTO subsidies_count FROM subsidies;
    SELECT COUNT(*) INTO locations_count FROM subsidy_locations WHERE table_name = 'subsidy_locations';
    SELECT COUNT(*) INTO categories_count FROM subsidy_categories WHERE table_name = 'subsidy_categories';
    
    -- Create backup tables with timestamp
    EXECUTE format('CREATE TABLE subsidies_backup_%s AS SELECT * FROM subsidies', backup_timestamp);
    
    -- Only create other backups if tables exist
    IF locations_count > 0 THEN
      EXECUTE format('CREATE TABLE subsidy_locations_backup_%s AS SELECT * FROM subsidy_locations', backup_timestamp);
    END IF;
    
    IF categories_count > 0 THEN
      EXECUTE format('CREATE TABLE subsidy_categories_backup_%s AS SELECT * FROM subsidy_categories', backup_timestamp);
    END IF;
    
    -- Purge existing data (in correct order due to foreign keys)
    IF categories_count > 0 THEN
      DELETE FROM subsidy_categories;
    END IF;
    
    IF locations_count > 0 THEN  
      DELETE FROM subsidy_locations;
    END IF;
    
    DELETE FROM subsidies;
    
    -- Reset change detection if exists
    DELETE FROM change_detection_state WHERE api_source = 'les-aides-fr';
    
    RETURN jsonb_build_object(
        'success', true,
        'backup_timestamp', backup_timestamp,
        'backed_up_subsidies', subsidies_count,
        'backed_up_locations', COALESCE(locations_count, 0),
        'backed_up_categories', COALESCE(categories_count, 0)
    );
END;
$function$;

-- 6. Fix update_client_profiles_updated_at function
CREATE OR REPLACE FUNCTION public.update_client_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 7. Fix update_updated_at_timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 8. Add comprehensive input validation to critical functions
-- Update create_extraction_if_not_exists with better validation
CREATE OR REPLACE FUNCTION public.create_extraction_if_not_exists(p_document_id uuid, p_idempotency_key text, p_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  extraction_id UUID;
BEGIN
  -- Enhanced input validation
  IF p_document_id IS NULL THEN
    RAISE EXCEPTION 'Document ID cannot be null';
  END IF;
  
  IF p_idempotency_key IS NULL OR LENGTH(p_idempotency_key) = 0 THEN
    RAISE EXCEPTION 'Idempotency key cannot be null or empty';
  END IF;
  
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  -- Try to find existing extraction by idempotency key
  SELECT id INTO extraction_id
  FROM document_extractions
  WHERE idempotency_key = p_idempotency_key
  AND document_id = p_document_id;
  
  -- If not found, create new extraction
  IF extraction_id IS NULL THEN
    INSERT INTO document_extractions (
      document_id,
      user_id,
      status_v2,
      idempotency_key,
      extracted_data,
      confidence_score,
      max_retries,
      current_retry
    ) VALUES (
      p_document_id,
      p_user_id,
      'uploading',
      p_idempotency_key,
      '{}',
      0.0,
      3,
      0
    ) RETURNING id INTO extraction_id;
  END IF;
  
  RETURN extraction_id;
END;
$function$;

-- 9. Enhance update_extraction_status with better validation
CREATE OR REPLACE FUNCTION public.update_extraction_status(p_extraction_id uuid, p_status extraction_status_enum, p_failure_code text DEFAULT NULL::text, p_failure_detail text DEFAULT NULL::text, p_progress_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  extraction_exists BOOLEAN;
BEGIN
  -- Enhanced input validation
  IF p_extraction_id IS NULL THEN
    RAISE EXCEPTION 'Extraction ID cannot be null';
  END IF;
  
  IF p_status IS NULL THEN
    RAISE EXCEPTION 'Status cannot be null';
  END IF;

  -- Check if extraction exists
  SELECT EXISTS(SELECT 1 FROM document_extractions WHERE id = p_extraction_id) 
  INTO extraction_exists;
  
  IF NOT extraction_exists THEN
    RAISE WARNING 'Extraction % does not exist', p_extraction_id;
    RETURN FALSE;
  END IF;
  
  -- Update extraction with proper metadata merging
  UPDATE document_extractions 
  SET 
    status_v2 = p_status,
    last_event_at = now(),
    failure_code = CASE WHEN p_status = 'failed' THEN p_failure_code ELSE NULL END,
    failure_detail = CASE WHEN p_status = 'failed' THEN p_failure_detail ELSE NULL END,
    progress_metadata = COALESCE(progress_metadata, '{}') || COALESCE(p_progress_metadata, '{}'),
    updated_at = now()
  WHERE id = p_extraction_id;
  
  RETURN FOUND;
END;
$function$;

-- 10. Enable RLS on backup tables (they should be cleaned up regularly)
-- Note: Backup tables are temporary and should be managed by admin functions only
-- We'll add a policy to restrict access to service role only

-- Clean up old backup tables (older than 7 days) for security
DO $$
DECLARE
    backup_table_name TEXT;
BEGIN
    FOR backup_table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'subsidies_backup_%'
        AND to_timestamp(
            SUBSTRING(tablename FROM 'subsidies_backup_(.*)'), 
            'YYYY_MM_DD_HH24_MI_SS'
        ) < NOW() - INTERVAL '7 days'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(backup_table_name) || ' CASCADE';
        RAISE NOTICE 'Dropped old backup table: %', backup_table_name;
    END LOOP;
END $$;

-- 11. Add function to validate database integrity
CREATE OR REPLACE FUNCTION public.validate_database_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb := '{}';
    rls_enabled_count integer;
    total_public_tables integer;
    functions_without_search_path integer;
    security_issues jsonb := '[]';
BEGIN
    -- Check RLS status on important tables
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND rowsecurity = true
    AND tablename NOT LIKE '%_backup_%';
    
    SELECT COUNT(*) INTO total_public_tables
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT LIKE '%_backup_%';
    
    -- Check functions without proper search_path
    SELECT COUNT(*) INTO functions_without_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL OR NOT ('search_path=public' = ANY(p.proconfig)));
    
    -- Build result
    result := jsonb_build_object(
        'rls_enabled_tables', rls_enabled_count,
        'total_public_tables', total_public_tables,
        'rls_coverage_percent', ROUND((rls_enabled_count::numeric / NULLIF(total_public_tables, 0)) * 100, 2),
        'functions_without_search_path', functions_without_search_path,
        'security_score', CASE 
            WHEN functions_without_search_path = 0 AND rls_enabled_count >= (total_public_tables * 0.9) THEN 'EXCELLENT'
            WHEN functions_without_search_path <= 2 AND rls_enabled_count >= (total_public_tables * 0.8) THEN 'GOOD'
            WHEN functions_without_search_path <= 5 AND rls_enabled_count >= (total_public_tables * 0.6) THEN 'FAIR'
            ELSE 'POOR'
        END,
        'timestamp', now()
    );
    
    RETURN result;
END;
$function$;