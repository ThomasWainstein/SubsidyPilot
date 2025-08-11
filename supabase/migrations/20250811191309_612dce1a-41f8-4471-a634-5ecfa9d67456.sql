-- Fix the sync_subsidies_to_final_table function that's causing the trigger failure
-- The issue is that the function doesn't return NEW at the end

CREATE OR REPLACE FUNCTION public.sync_subsidies_to_final_table()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert or update in subsidies table when subsidies_structured is modified
    INSERT INTO public.subsidies (
        code, title, description, eligibility_criteria, deadline,
        agency, region, tags, funding_type, status, source_url,
        created_at, updated_at
    )
    VALUES (
        COALESCE(NEW.url, 'apia-' || NEW.id::text),
        jsonb_build_object('ro', NEW.title),
        jsonb_build_object('ro', NEW.description),
        jsonb_build_object('ro', NEW.eligibility),
        NEW.deadline,
        NEW.agency,
        CASE WHEN NEW.region IS NOT NULL THEN ARRAY[NEW.region] ELSE NULL END,
        CASE WHEN NEW.sector IS NOT NULL THEN ARRAY[NEW.sector] ELSE NULL END,
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
    
    -- CRITICAL: Must return NEW for INSERT/UPDATE triggers
    RETURN NEW;
END;
$function$;