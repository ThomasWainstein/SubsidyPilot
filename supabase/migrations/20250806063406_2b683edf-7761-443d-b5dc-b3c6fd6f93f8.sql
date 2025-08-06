-- Reset pages marked as 'processed' but with no corresponding subsidies_structured records
-- This will allow them to be reprocessed by the AI
UPDATE raw_scraped_pages 
SET status = 'scraped' 
WHERE status = 'processed' 
AND id NOT IN (
  SELECT DISTINCT raw_log_id 
  FROM subsidies_structured 
  WHERE raw_log_id IS NOT NULL
);

-- Also reset pages that were processed but failed (have no structured data)
UPDATE raw_scraped_pages 
SET status = 'scraped'
WHERE status = 'processed'
AND NOT EXISTS (
  SELECT 1 FROM subsidies_structured 
  WHERE subsidies_structured.url = raw_scraped_pages.source_url
);