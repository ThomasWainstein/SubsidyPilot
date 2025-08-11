-- Fix RLS policy issue for policy_backup table
ALTER TABLE policy_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view policy backup" 
ON policy_backup FOR SELECT 
TO public 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "Service role can manage policy backup" 
ON policy_backup FOR ALL 
TO public 
USING ((SELECT auth.role()) = 'service_role') 
WITH CHECK ((SELECT auth.role()) = 'service_role');