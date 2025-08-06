-- =========================================
-- MEDIUM PRIORITY FIX: HUMAN REVIEW WORKFLOW INTEGRATION  
-- Complete the manual review workflow for failed extractions
-- =========================================

-- Add change detection triggers to subsidies_structured
CREATE TRIGGER subsidies_content_change_detection
    AFTER INSERT OR UPDATE ON public.subsidies_structured
    FOR EACH ROW
    EXECUTE FUNCTION public.detect_content_changes();

-- Add change detection triggers to document_extractions  
CREATE TRIGGER extractions_content_change_detection
    AFTER INSERT OR UPDATE ON public.document_extractions
    FOR EACH ROW
    EXECUTE FUNCTION public.detect_content_changes();

-- =========================================
-- POPULATE EXISTING DATA WITH VERSIONS
-- Create initial version records for existing data
-- =========================================

-- Create initial versions for existing subsidies
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
);

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
);

-- =========================================
-- IMPROVED ERROR ANALYSIS AND RESOLUTION
-- Update error handling to track resolution status  
-- =========================================

-- Add resolution tracking to error_log
ALTER TABLE public.error_log 
ADD COLUMN IF NOT EXISTS resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'investigating', 'resolved', 'ignored')),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID,
ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Update existing pg_net errors as resolved since we fixed them
UPDATE public.error_log 
SET 
    resolution_status = 'resolved',
    resolved_at = now(),
    resolved_by = auth.uid(),
    resolution_notes = 'Fixed by enabling pg_net extension in migration'
WHERE error_type = 'auto_schema_extraction_trigger' 
AND error_message = 'schema "net" does not exist'
AND resolution_status = 'open';

-- =========================================
-- LOG CORRELATION IMPROVEMENTS
-- Add missing correlation fields and indexes
-- =========================================

-- Add correlation indexes for better log querying
CREATE INDEX IF NOT EXISTS idx_error_log_resolution_status ON public.error_log(resolution_status);
CREATE INDEX IF NOT EXISTS idx_error_log_error_type ON public.error_log(error_type);
CREATE INDEX IF NOT EXISTS idx_error_log_created_at ON public.error_log(created_at);

-- Add session correlation to scraper_logs if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scraper_logs' AND column_name = 'user_id') THEN
        ALTER TABLE public.scraper_logs ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Create index for scraper log correlation
CREATE INDEX IF NOT EXISTS idx_scraper_logs_session ON public.scraper_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_status ON public.scraper_logs(status);