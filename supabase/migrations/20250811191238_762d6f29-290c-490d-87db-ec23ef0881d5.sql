-- Check if there are any triggers on subsidies_structured causing the insertion failures
-- First let's check what triggers exist
SELECT schemaname, tablename, triggerdef 
FROM pg_triggers 
WHERE tablename = 'subsidies_structured';

-- Check if sync_subsidies_to_final_table trigger exists and examine it
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'sync_subsidies_to_final_table';