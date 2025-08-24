-- Requeue the document with the new PDF handling approach
UPDATE document_processing_jobs 
SET status = 'queued',
    error_message = NULL,
    retry_attempt = 0,
    updated_at = NOW()
WHERE document_id = '9eb5934a-cf8e-49aa-aac4-6ced270498dd';