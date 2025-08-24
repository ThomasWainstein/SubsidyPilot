-- Update failed jobs to queued so they can be reprocessed
UPDATE document_processing_jobs 
SET status = 'queued', error_message = NULL, updated_at = NOW()
WHERE status = 'failed' 
AND file_name LIKE '%avis-%' 
AND created_at > NOW() - INTERVAL '1 day';

-- Add needs_review status to extraction status enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'extraction_status_enum'::regtype AND enumlabel = 'needs_review') THEN
        ALTER TYPE extraction_status_enum ADD VALUE 'needs_review';
    END IF;
END $$;