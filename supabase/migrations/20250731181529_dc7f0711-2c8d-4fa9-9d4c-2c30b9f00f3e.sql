-- Purge all existing subsidy data for fresh testing
-- Delete from dependent tables first to avoid foreign key issues

DELETE FROM subsidy_applications;
DELETE FROM subsidy_matches;
DELETE FROM subsidy_form_schemas;
DELETE FROM subsidies_structured;
DELETE FROM subsidies;