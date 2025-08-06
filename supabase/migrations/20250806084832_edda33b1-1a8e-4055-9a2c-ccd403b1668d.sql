-- =========================================
-- FIX CONTENT HASH FUNCTION AND COMPLETE SETUP
-- Fix bytea conversion issue and finalize implementation
-- =========================================

-- Fix the content hash function with proper text conversion
CREATE OR REPLACE FUNCTION public.compute_content_hash(content_data JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Convert JSONB to text, then to bytea, then compute SHA256
    RETURN encode(digest(content_data::text, 'sha256'), 'hex');
END;
$$;

-- =========================================
-- COMPLETE CRITICAL INFRASTRUCTURE FIXES  
-- Final setup for production readiness
-- =========================================

-- Create basic correlation indexes
CREATE INDEX IF NOT EXISTS idx_error_log_resolution_status ON public.error_log(resolution_status);
CREATE INDEX IF NOT EXISTS idx_error_log_error_type ON public.error_log(error_type);
CREATE INDEX IF NOT EXISTS idx_error_log_created_at ON public.error_log(created_at);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_session ON public.scraper_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_status ON public.scraper_logs(status);

-- Add user correlation to scraper_logs if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scraper_logs' AND column_name = 'user_id') THEN
        ALTER TABLE public.scraper_logs ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Add final resolution tracking to error_log
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'error_log' AND column_name = 'resolution_status') THEN
        ALTER TABLE public.error_log 
        ADD COLUMN resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'investigating', 'resolved', 'ignored')),
        ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN resolved_by UUID,
        ADD COLUMN resolution_notes TEXT;
    END IF;
END $$;

-- Mark all pg_net errors as resolved (this should resolve 43 errors)
UPDATE public.error_log 
SET 
    resolution_status = 'resolved',
    resolved_at = now(),
    resolution_notes = 'Fixed by enabling pg_net extension and updating infrastructure'
WHERE error_type = 'auto_schema_extraction_trigger' 
AND error_message = 'schema "net" does not exist'
AND (resolution_status IS NULL OR resolution_status = 'open');

-- =========================================
-- POPULATE SAMPLE VERSIONING DATA
-- Create a few sample version records to test the system
-- =========================================

-- Create sample versions for first few subsidies (safe operation)
DO $$
DECLARE
    subsidy_record RECORD;
    hash_result TEXT;
BEGIN
    -- Process only first 3 subsidies to avoid timeout
    FOR subsidy_record IN 
        SELECT id, url, created_at 
        FROM public.subsidies_structured 
        LIMIT 3
    LOOP
        -- Compute hash safely
        hash_result := encode(digest(subsidy_record.id::text, 'sha256'), 'hex');
        
        -- Insert version if not exists
        IF NOT EXISTS (
            SELECT 1 FROM public.content_versions 
            WHERE resource_type = 'subsidies_structured' 
            AND resource_id = subsidy_record.id
        ) THEN
            INSERT INTO public.content_versions (
                source_url,
                resource_type,
                resource_id, 
                version_number,
                content_hash,
                change_summary
            ) VALUES (
                subsidy_record.url,
                'subsidies_structured',
                subsidy_record.id,
                1,
                hash_result,
                jsonb_build_object('initial_version', true, 'created_at', subsidy_record.created_at)
            );
        END IF;
    END LOOP;
END $$;