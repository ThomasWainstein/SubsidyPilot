-- Reset the FCO page status so it can be reprocessed with the new verbatim extraction
UPDATE raw_scraped_pages 
SET status = 'scraped' 
WHERE source_url LIKE '%fievre-catarrhale%';

-- Delete the old incomplete FCO subsidy data 
DELETE FROM subsidies_structured 
WHERE url LIKE '%fievre-catarrhale%';

-- Check the updated status
SELECT id, source_url, status 
FROM raw_scraped_pages 
WHERE source_url LIKE '%fievre-catarrhale%';