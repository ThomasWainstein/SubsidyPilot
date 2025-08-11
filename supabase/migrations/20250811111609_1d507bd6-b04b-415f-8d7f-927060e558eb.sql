-- Fix critical RLS policy issues and strengthen authentication

-- 1. Fix overly permissive RLS policies
DROP POLICY IF EXISTS "Combined form instances view policy" ON application_form_instances;
CREATE POLICY "Users can view form instances for their sessions" 
ON application_form_instances 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM application_sessions 
    WHERE application_sessions.form_instance_id = application_form_instances.id 
    AND application_sessions.user_id = auth.uid()
  )
);

-- 2. Add proper user ownership policy for form instances
CREATE POLICY "Service role can manage form instances" 
ON application_form_instances 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

-- 3. Fix overly broad access on content_change_log
DROP POLICY IF EXISTS "Unified change log access" ON content_change_log;
CREATE POLICY "Authenticated users can view change log" 
ON content_change_log 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 4. Fix content_versions policy to be more restrictive
DROP POLICY IF EXISTS "Content versions access" ON content_versions;
CREATE POLICY "Authenticated users can view content versions" 
ON content_versions 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 5. Restrict quality_metrics access
DROP POLICY IF EXISTS "Combined access policy for quality metrics" ON quality_metrics;
CREATE POLICY "Authenticated users can view quality metrics" 
ON quality_metrics 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 6. Add proper service role management for extraction batches
CREATE POLICY "Service role can update extraction batches" 
ON extraction_batches 
FOR UPDATE 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete extraction batches" 
ON extraction_batches 
FOR DELETE 
USING (auth.role() = 'service_role');

-- 7. Strengthen user role assignment security
CREATE OR REPLACE FUNCTION public.ensure_user_has_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure new users get a default 'farmer' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'farmer')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-assign farmer role to new users
DROP TRIGGER IF EXISTS ensure_default_role_trigger ON auth.users;
CREATE TRIGGER ensure_default_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_has_default_role();

-- 8. Create secure admin check function to replace deprecated getIsAdmin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 9. Add security logging for role assignments
CREATE OR REPLACE FUNCTION public.log_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_actions (
    user_id, action_type, resource_type, resource_id, action_data, triggered_by
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'role_assigned'
      WHEN TG_OP = 'DELETE' THEN 'role_revoked'
      ELSE 'role_modified'
    END,
    'user_role',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'role', COALESCE(NEW.role, OLD.role),
      'operation', TG_OP
    ),
    'system'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_role_changes_trigger ON user_roles;
CREATE TRIGGER log_role_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_assignment();

-- 10. Strengthen farm document access
DROP POLICY IF EXISTS "farm_documents_select" ON farm_documents;
CREATE POLICY "farm_documents_select" 
ON farm_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM farms 
    WHERE farms.id = farm_documents.farm_id 
    AND farms.user_id = auth.uid()
  )
  OR auth.role() = 'service_role'
);