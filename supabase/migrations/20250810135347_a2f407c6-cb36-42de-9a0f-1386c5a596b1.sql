-- Fix remaining security issues

-- Remove materialized view from API access (it can be manually refreshed)
REVOKE ALL ON TABLE review_queue_stats FROM anon;
REVOKE ALL ON TABLE review_queue_stats FROM authenticated;

-- Create regular view instead of materialized view for API access
CREATE OR REPLACE VIEW review_queue_summary AS
SELECT 
    count(*) FILTER (WHERE status = 'pending') as pending_count,
    count(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
    count(*) FILTER (WHERE status = 'completed') as completed_count,
    avg(priority) as avg_priority
FROM review_assignments;

-- Grant access to the regular view instead
GRANT SELECT ON review_queue_summary TO authenticated;

-- Add RLS to the view if needed
ALTER VIEW review_queue_summary SET (security_barrier = true);

-- Fix search paths for the remaining functions that don't have them set
CREATE OR REPLACE FUNCTION public.sync_subsidies_to_final_table()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Insert or update in subsidies table when subsidies_structured is modified
    INSERT INTO public.subsidies (
        code, title, description, eligibility_criteria, deadline,
        agency, region, tags, funding_type, status, source_url,
        created_at, updated_at
    )
    VALUES (
        COALESCE(NEW.url, 'franceagrimer-' || NEW.id::text),
        jsonb_build_object('fr', NEW.title),
        jsonb_build_object('fr', NEW.description),
        jsonb_build_object('fr', NEW.eligibility),
        NEW.deadline,
        NEW.agency,
        CASE WHEN NEW.region IS NOT NULL THEN ARRAY[NEW.region] ELSE NULL END,
        CASE WHEN NEW.sector IS NOT NULL THEN NEW.sector ELSE NULL END,
        NEW.funding_type,
        'open',
        NEW.url,
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (code) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        eligibility_criteria = EXCLUDED.eligibility_criteria,
        deadline = EXCLUDED.deadline,
        agency = EXCLUDED.agency,
        region = EXCLUDED.region,
        tags = EXCLUDED.tags,
        funding_type = EXCLUDED.funding_type,
        source_url = EXCLUDED.source_url,
        updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
END;
$function$;