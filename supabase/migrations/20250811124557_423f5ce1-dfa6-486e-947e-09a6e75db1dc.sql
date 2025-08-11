-- Update recent substantial pages to be associated with the stuck run
UPDATE raw_scraped_pages 
SET run_id = 'b4abb47a-428e-4ad1-ad76-1cc3eb4853d8'::uuid
WHERE id IN (
  '58747921-8735-4ed4-b853-c67fb741ba8a',
  '2d99b55d-89cf-4bef-9381-2cca0755bca7',
  '095e96cb-bf94-41ad-9c6f-2949d32bf153'
) AND run_id IS NULL;