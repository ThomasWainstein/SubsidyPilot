-- Update the ai-content-processor to test with FCO subsidy
-- Test the improved extraction on the FCO page

-- First, let's check the current state
SELECT id, source_url, status FROM raw_scraped_pages 
WHERE source_url LIKE '%fievre-catarrhale%' OR source_url LIKE '%fco%'
LIMIT 5;