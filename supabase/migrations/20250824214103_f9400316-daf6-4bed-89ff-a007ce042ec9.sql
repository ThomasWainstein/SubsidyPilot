-- Requeue the failed document to retry with proper Google Vision API configuration
UPDATE document_processing_jobs 
SET status = 'queued',
    error_message = NULL,
    retry_attempt = 0,
    updated_at = NOW()
WHERE document_id = '7282bdb5-86f1-4877-8a69-e650af5e37b7';