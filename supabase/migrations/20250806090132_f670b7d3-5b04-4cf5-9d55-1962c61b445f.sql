-- Fix data flow issues and copy processed subsidies to final table
-- Copy all processed subsidies_structured to subsidies table
INSERT INTO public.subsidies (
    url, title, description, eligibility, amount, deadline, application_method, 
    program, agency, region, sector, funding_type, evaluation_criteria,
    legal_entity_type, reporting_requirements, compliance_requirements,
    created_at, updated_at
)
SELECT 
    url, title, description, eligibility, amount, deadline, application_method,
    program, agency, region, sector, funding_type, evaluation_criteria,
    legal_entity_type, reporting_requirements, compliance_requirements,
    created_at, updated_at
FROM public.subsidies_structured 
WHERE record_status = 'active'
ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    eligibility = EXCLUDED.eligibility,
    amount = EXCLUDED.amount,
    deadline = EXCLUDED.deadline,
    application_method = EXCLUDED.application_method,
    program = EXCLUDED.program,
    agency = EXCLUDED.agency,
    region = EXCLUDED.region,
    sector = EXCLUDED.sector,
    funding_type = EXCLUDED.funding_type,
    evaluation_criteria = EXCLUDED.evaluation_criteria,
    legal_entity_type = EXCLUDED.legal_entity_type,
    reporting_requirements = EXCLUDED.reporting_requirements,
    compliance_requirements = EXCLUDED.compliance_requirements,
    updated_at = EXCLUDED.updated_at;

-- Create a function to automatically sync subsidies_structured to subsidies
CREATE OR REPLACE FUNCTION public.sync_subsidies_to_final_table()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update in subsidies table when subsidies_structured is modified
    INSERT INTO public.subsidies (
        url, title, description, eligibility, amount, deadline, application_method, 
        program, agency, region, sector, funding_type, evaluation_criteria,
        legal_entity_type, reporting_requirements, compliance_requirements,
        created_at, updated_at
    )
    VALUES (
        NEW.url, NEW.title, NEW.description, NEW.eligibility, NEW.amount, NEW.deadline, NEW.application_method,
        NEW.program, NEW.agency, NEW.region, NEW.sector, NEW.funding_type, NEW.evaluation_criteria,
        NEW.legal_entity_type, NEW.reporting_requirements, NEW.compliance_requirements,
        NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (url) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        eligibility = EXCLUDED.eligibility,
        amount = EXCLUDED.amount,
        deadline = EXCLUDED.deadline,
        application_method = EXCLUDED.application_method,
        program = EXCLUDED.program,
        agency = EXCLUDED.agency,
        region = EXCLUDED.region,
        sector = EXCLUDED.sector,
        funding_type = EXCLUDED.funding_type,
        evaluation_criteria = EXCLUDED.evaluation_criteria,
        legal_entity_type = EXCLUDED.legal_entity_type,
        reporting_requirements = EXCLUDED.reporting_requirements,
        compliance_requirements = EXCLUDED.compliance_requirements,
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