-- Reset FCO page to be reprocessed with enhanced verbatim extraction
UPDATE raw_scraped_pages 
SET status = 'scraped' 
WHERE source_url LIKE '%fievre-catarrhale%';

-- Clear old incomplete data
DELETE FROM subsidies_structured 
WHERE url LIKE '%fievre-catarrhale%';

-- Verify the page is ready for reprocessing
SELECT id, source_url, status, LENGTH(raw_html) as content_length
FROM raw_scraped_pages 
WHERE source_url LIKE '%fievre-catarrhale%';