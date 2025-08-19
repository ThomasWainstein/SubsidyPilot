-- Core subsidies table with comprehensive fields
CREATE TABLE subsidies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    api_source TEXT NOT NULL, -- 'les-aides', 'romania-gov', 'ted', etc.
    title TEXT NOT NULL,
    description TEXT,
    amount_min DECIMAL,
    amount_max DECIMAL,
    currency TEXT DEFAULT 'EUR',
    deadline DATE,
    eligibility_criteria JSONB,
    application_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_data JSONB -- Store complete API response
);

-- Enable RLS on subsidies
ALTER TABLE subsidies ENABLE ROW LEVEL SECURITY;

-- Allow public read access to subsidies
CREATE POLICY "Public subsidies read access" ON subsidies
    FOR SELECT USING (true);

-- Service role can manage subsidies
CREATE POLICY "Service role can manage subsidies" ON subsidies
    FOR ALL USING (auth.role() = 'service_role');

-- Geographic targeting
CREATE TABLE subsidy_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsidy_id UUID REFERENCES subsidies(id) ON DELETE CASCADE,
    country_code TEXT,
    region TEXT,
    city TEXT,
    postal_codes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on subsidy_locations
ALTER TABLE subsidy_locations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to locations
CREATE POLICY "Public locations read access" ON subsidy_locations
    FOR SELECT USING (true);

-- Service role can manage locations
CREATE POLICY "Service role can manage locations" ON subsidy_locations
    FOR ALL USING (auth.role() = 'service_role');

-- Categorization
CREATE TABLE subsidy_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsidy_id UUID REFERENCES subsidies(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    subcategory TEXT,
    sector TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on subsidy_categories
ALTER TABLE subsidy_categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to categories
CREATE POLICY "Public categories read access" ON subsidy_categories
    FOR SELECT USING (true);

-- Service role can manage categories
CREATE POLICY "Service role can manage categories" ON subsidy_categories
    FOR ALL USING (auth.role() = 'service_role');

-- Track API sync jobs
CREATE TABLE api_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_source TEXT NOT NULL,
    sync_type TEXT, -- 'full', 'incremental', 'single'
    status TEXT DEFAULT 'running',
    records_processed INTEGER DEFAULT 0,
    records_added INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    errors JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on api_sync_logs
ALTER TABLE api_sync_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view sync logs
CREATE POLICY "Admins can view sync logs" ON api_sync_logs
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Service role can manage sync logs
CREATE POLICY "Service role can manage sync logs" ON api_sync_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Update farms table to include additional fields for better matching
ALTER TABLE farms ADD COLUMN IF NOT EXISTS farm_type TEXT[];
ALTER TABLE farms ADD COLUMN IF NOT EXISTS operations JSONB;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT 0;

-- Function to update farm profile completion score
CREATE OR REPLACE FUNCTION update_farm_completion_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate completion score based on filled fields
    NEW.profile_completion_score := (
        CASE WHEN NEW.name IS NOT NULL AND NEW.name != '' THEN 10 ELSE 0 END +
        CASE WHEN NEW.address IS NOT NULL AND NEW.address != '' THEN 15 ELSE 0 END +
        CASE WHEN NEW.farm_type IS NOT NULL AND array_length(NEW.farm_type, 1) > 0 THEN 20 ELSE 0 END +
        CASE WHEN NEW.total_hectares IS NOT NULL THEN 15 ELSE 0 END +
        CASE WHEN NEW.operations IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN NEW.certifications IS NOT NULL AND array_length(NEW.certifications, 1) > 0 THEN 10 ELSE 0 END +
        CASE WHEN NEW.annual_revenue IS NOT NULL THEN 10 ELSE 0 END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update completion score
DROP TRIGGER IF EXISTS farm_completion_trigger ON farms;
CREATE TRIGGER farm_completion_trigger
    BEFORE INSERT OR UPDATE ON farms
    FOR EACH ROW
    EXECUTE FUNCTION update_farm_completion_score();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subsidies_api_source ON subsidies(api_source);
CREATE INDEX IF NOT EXISTS idx_subsidies_status ON subsidies(status);
CREATE INDEX IF NOT EXISTS idx_subsidies_deadline ON subsidies(deadline);
CREATE INDEX IF NOT EXISTS idx_subsidies_external_id ON subsidies(external_id);
CREATE INDEX IF NOT EXISTS idx_subsidy_locations_country ON subsidy_locations(country_code);
CREATE INDEX IF NOT EXISTS idx_subsidy_categories_category ON subsidy_categories(category);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_source ON api_sync_logs(api_source, status);