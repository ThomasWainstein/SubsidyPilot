-- Requeue the document with fixed base64 encoding
UPDATE document_processing_jobs 
SET status = 'queued',
    error_message = NULL,
    retry_attempt = 0,
    started_at = NULL,
    updated_at = NOW()
WHERE document_id = '25a35139-7552-4de6-9122-bc819f267ff5';