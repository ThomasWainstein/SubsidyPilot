-- Attach remaining substantial pages to the stuck run
UPDATE raw_scraped_pages
SET run_id = 'b4abb47a-428e-4ad1-ad76-1cc3eb4853d8'
WHERE run_id IS NULL
  AND created_at > now() - interval '6 hours'
  AND length(coalesce(text_markdown, raw_text, raw_html)) >= 1000
  AND source_site IN ('franceagrimer','afir-romania')
RETURNING id, source_url;