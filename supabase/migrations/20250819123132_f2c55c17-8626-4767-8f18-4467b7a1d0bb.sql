-- Enable RLS on subsidy-related tables and add security policies

-- Enable RLS on subsidies table
ALTER TABLE subsidies ENABLE ROW LEVEL SECURITY;

-- Enable RLS on subsidy_locations table  
ALTER TABLE subsidy_locations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on subsidy_categories table
ALTER TABLE subsidy_categories ENABLE ROW LEVEL SECURITY;

-- Add policies for subsidies table (public read, service role manage)
CREATE POLICY "Public can view subsidies" ON subsidies
FOR SELECT USING (true);

CREATE POLICY "Service role can manage subsidies" ON subsidies
FOR ALL USING (auth.role() = 'service_role');

-- Add policies for subsidy_locations table
CREATE POLICY "Public can view subsidy locations" ON subsidy_locations  
FOR SELECT USING (true);

CREATE POLICY "Service role can manage subsidy locations" ON subsidy_locations
FOR ALL USING (auth.role() = 'service_role');

-- Add policies for subsidy_categories table
CREATE POLICY "Public can view subsidy categories" ON subsidy_categories
FOR SELECT USING (true); 

CREATE POLICY "Service role can manage subsidy categories" ON subsidy_categories
FOR ALL USING (auth.role() = 'service_role');