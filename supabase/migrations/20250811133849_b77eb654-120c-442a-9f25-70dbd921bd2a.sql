-- Fix critical security issues (safe version with IF NOT EXISTS)

-- 1. Fix user_roles RLS policies to use proper database functions instead of JWT
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- Create proper RLS policies for user_roles using existing security definer functions
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Only add security_audit_log policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_audit_log' 
        AND policyname = 'Admins can view security audit log'
    ) THEN
        EXECUTE 'CREATE POLICY "Admins can view security audit log" ON public.security_audit_log FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_audit_log' 
        AND policyname = 'Service role can manage security audit log'
    ) THEN
        EXECUTE 'CREATE POLICY "Service role can manage security audit log" ON public.security_audit_log FOR ALL USING (auth.role() = ''service_role''::text) WITH CHECK (auth.role() = ''service_role''::text)';
    END IF;
END
$$;

-- 3. Update content_versions policies to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can view content versions" ON public.content_versions;
DROP POLICY IF EXISTS "Service role can manage content versions" ON public.content_versions;

CREATE POLICY "Admins can view content versions" 
ON public.content_versions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage content versions" 
ON public.content_versions 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- 4. Secure ai_content_errors and ai_content_runs tables
DROP POLICY IF EXISTS "Authenticated users can view AI content errors" ON public.ai_content_errors;
DROP POLICY IF EXISTS "Authenticated users can view AI content runs" ON public.ai_content_runs;

CREATE POLICY "Admins can view AI content errors" 
ON public.ai_content_errors 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view AI content runs" 
ON public.ai_content_runs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));