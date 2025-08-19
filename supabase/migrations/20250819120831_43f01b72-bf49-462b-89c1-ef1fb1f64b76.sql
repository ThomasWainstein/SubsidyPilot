-- Fix RLS policies for backup tables
CREATE POLICY "Admins can manage location backup data" ON subsidy_locations_backup
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage location backup data" ON subsidy_locations_backup
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage category backup data" ON subsidy_categories_backup
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage category backup data" ON subsidy_categories_backup
  FOR ALL USING (auth.role() = 'service_role');