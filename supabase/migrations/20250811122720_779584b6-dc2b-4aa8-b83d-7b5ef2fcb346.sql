-- Fix the security definer view issue by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.v_ai_run_summary;

CREATE VIEW public.v_ai_run_summary AS
SELECT 
  run_id,
  COUNT(*) as pages,
  COUNT(*) FILTER (WHERE ok) as pages_ok,
  COUNT(*) FILTER (WHERE NOT ok) as pages_failed,
  AVG(content_length) as avg_content_length
FROM (
  SELECT 
    p.id as page_id, 
    p.run_id,
    COALESCE(LENGTH(p.text_markdown), 0) + 
    COALESCE(LENGTH(p.raw_text), 0) + 
    COALESCE(LENGTH(p.raw_html), 0) as content_length,
    (COALESCE(LENGTH(p.text_markdown), 0) + 
     COALESCE(LENGTH(p.raw_text), 0) + 
     COALESCE(LENGTH(p.raw_html), 0)) >= 200 as ok
  FROM raw_scraped_pages p
  WHERE p.run_id IS NOT NULL
) x 
GROUP BY run_id;

-- Add RLS policy for the view
CREATE POLICY "Users can view AI run summary" ON public.raw_scraped_pages
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');