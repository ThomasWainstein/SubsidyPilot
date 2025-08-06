-- Execute complete data purge to start fresh
SELECT complete_data_purge();

-- Verify the purge was successful by checking table counts
SELECT 
  'subsidies' as table_name, 
  COUNT(*) as remaining_records 
FROM subsidies
UNION ALL
SELECT 
  'subsidies_structured' as table_name, 
  COUNT(*) as remaining_records 
FROM subsidies_structured
UNION ALL
SELECT 
  'raw_scraped_pages' as table_name, 
  COUNT(*) as remaining_records 
FROM raw_scraped_pages
ORDER BY table_name;