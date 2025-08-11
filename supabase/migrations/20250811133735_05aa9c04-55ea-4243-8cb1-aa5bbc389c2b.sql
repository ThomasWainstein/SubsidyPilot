-- Fix critical security issues

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

-- 2. Add missing RLS policies for security_audit_log
CREATE POLICY "Admins can view security audit log" 
ON public.security_audit_log 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage security audit log" 
ON public.security_audit_log 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

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

-- 5. Add RLS policy for review_assignments if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'review_assignments') THEN
        EXECUTE 'CREATE POLICY "Users can view their assigned reviews" ON public.review_assignments FOR SELECT USING (assigned_to = auth.uid())';
        EXECUTE 'CREATE POLICY "Admins can manage all reviews" ON public.review_assignments FOR ALL USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))';
    END IF;
END
$$;

-- 6. Add RLS policy for review_decisions if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'review_decisions') THEN
        EXECUTE 'CREATE POLICY "Users can view their review decisions" ON public.review_decisions FOR SELECT USING (reviewed_by = auth.uid())';
        EXECUTE 'CREATE POLICY "Admins can view all review decisions" ON public.review_decisions FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
    END IF;
END
$$;