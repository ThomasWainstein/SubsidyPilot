-- Create API sync logs table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS api_sync_logs (
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

-- Create subsidy_locations table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS subsidy_locations (
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

-- Create subsidy_categories table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS subsidy_categories (
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

-- Add missing columns to subsidies table if they don't exist
ALTER TABLE subsidies ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE subsidies ADD COLUMN IF NOT EXISTS api_source TEXT;
ALTER TABLE subsidies ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- Create unique constraint on external_id if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS subsidies_external_id_unique ON subsidies(external_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subsidies_api_source ON subsidies(api_source);
CREATE INDEX IF NOT EXISTS idx_subsidy_locations_country ON subsidy_locations(country_code);
CREATE INDEX IF NOT EXISTS idx_subsidy_categories_category ON subsidy_categories(category);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_source ON api_sync_logs(api_source, status);