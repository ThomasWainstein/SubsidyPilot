-- Requeue the failed document for reprocessing with detailed error logging
UPDATE document_processing_jobs 
SET status = 'queued',
    error_message = NULL,
    retry_attempt = 0,
    updated_at = NOW()
WHERE document_id = '221ea333-3f30-452d-b2cc-6b83e32a673b';