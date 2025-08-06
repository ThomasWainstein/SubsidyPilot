-- Fix data sync - copy processed subsidies_structured to subsidies using correct schema
-- Copy all processed subsidies_structured to subsidies table with proper field mapping
INSERT INTO public.subsidies (
    code, title, description, eligibility_criteria, deadline,
    agency, region, tags, funding_type, status, source_url,
    created_at, updated_at
)
SELECT 
    COALESCE(url, 'franceagrimer-' || id::text) as code,
    jsonb_build_object('fr', title) as title,
    jsonb_build_object('fr', description) as description,
    jsonb_build_object('fr', eligibility) as eligibility_criteria,
    deadline,
    agency,
    CASE WHEN region IS NOT NULL THEN ARRAY[region] ELSE NULL END as region,
    CASE WHEN sector IS NOT NULL THEN sector ELSE NULL END as tags,
    funding_type,
    'open' as status,
    url as source_url,
    created_at,
    updated_at
FROM public.subsidies_structured 
WHERE record_status = 'active'
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

-- Create a function to automatically sync subsidies_structured to subsidies with correct mapping
CREATE OR REPLACE FUNCTION public.sync_subsidies_to_final_table()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to auto-sync future changes
DROP TRIGGER IF EXISTS trigger_sync_subsidies ON public.subsidies_structured;
CREATE TRIGGER trigger_sync_subsidies
    AFTER INSERT OR UPDATE ON public.subsidies_structured
    FOR EACH ROW 
    WHEN (NEW.record_status = 'active')
    EXECUTE FUNCTION public.sync_subsidies_to_final_table();