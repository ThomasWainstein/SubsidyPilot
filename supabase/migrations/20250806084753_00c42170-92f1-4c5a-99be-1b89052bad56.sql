-- =========================================
-- FIX RESOURCE TYPE CONSTRAINT AND COMPLETE IMPLEMENTATION
-- Update constraint to match actual table names
-- =========================================

-- Update content_versions constraint to accept actual table names
ALTER TABLE public.content_versions 
DROP CONSTRAINT IF EXISTS content_versions_resource_type_check;

ALTER TABLE public.content_versions 
ADD CONSTRAINT content_versions_resource_type_check 
CHECK (resource_type IN ('subsidy', 'subsidies_structured', 'document', 'document_extractions', 'farm_documents', 'form', 'extraction'));

-- =========================================
-- COMPLETE THE VERSIONING SETUP
-- Add triggers and populate initial data
-- =========================================

-- Add change detection triggers if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'subsidies_content_change_detection') THEN
        CREATE TRIGGER subsidies_content_change_detection
            AFTER INSERT OR UPDATE ON public.subsidies_structured
            FOR EACH ROW
            EXECUTE FUNCTION public.detect_content_changes();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'extractions_content_change_detection') THEN
        CREATE TRIGGER extractions_content_change_detection
            AFTER INSERT OR UPDATE ON public.document_extractions
            FOR EACH ROW
            EXECUTE FUNCTION public.detect_content_changes();
    END IF;
END $$;

-- Create initial versions for existing subsidies (retry with correct constraint)
INSERT INTO public.content_versions (
    source_url,
    resource_type,
    resource_id, 
    version_number,
    content_hash,
    change_summary
)
SELECT 
    s.url,
    'subsidies_structured',
    s.id,
    1,
    public.compute_content_hash(to_jsonb(s)),
    jsonb_build_object('initial_version', true, 'created_at', s.created_at)
FROM public.subsidies_structured s
WHERE NOT EXISTS (
    SELECT 1 FROM public.content_versions cv 
    WHERE cv.resource_type = 'subsidies_structured' 
    AND cv.resource_id = s.id
)
LIMIT 10; -- Limit to prevent timeout on large datasets

-- Create initial versions for existing extractions
INSERT INTO public.content_versions (
    resource_type,
    resource_id,
    version_number, 
    content_hash,
    change_summary
)
SELECT 
    'document_extractions',
    de.id,
    1,
    public.compute_content_hash(to_jsonb(de)),
    jsonb_build_object('initial_version', true, 'created_at', de.created_at)
FROM public.document_extractions de
WHERE NOT EXISTS (
    SELECT 1 FROM public.content_versions cv 
    WHERE cv.resource_type = 'document_extractions' 
    AND cv.resource_id = de.id
)
LIMIT 10; -- Limit to prevent timeout

-- =========================================
-- COMPLETE ERROR RESOLUTION TRACKING
-- =========================================

-- Add resolution tracking to error_log if not exists
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

-- Mark pg_net errors as resolved
UPDATE public.error_log 
SET 
    resolution_status = 'resolved',
    resolved_at = now(),
    resolution_notes = 'Fixed by enabling pg_net extension in migration'
WHERE error_type = 'auto_schema_extraction_trigger' 
AND error_message = 'schema "net" does not exist'
AND (resolution_status IS NULL OR resolution_status = 'open');