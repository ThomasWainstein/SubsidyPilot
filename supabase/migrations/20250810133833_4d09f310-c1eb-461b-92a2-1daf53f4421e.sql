-- CRITICAL SECURITY FIXES - Phase 1: Database Function Security

-- 1. Fix all database functions to use secure search_path
-- This prevents SQL injection through search_path manipulation

-- Update existing functions with secure search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.get_data_summary()
RETURNS TABLE(table_name text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 'subsidies'::TEXT as table_name, COUNT(*)::BIGINT as count FROM public.subsidies
  UNION ALL
  SELECT 'subsidies_structured'::TEXT as table_name, COUNT(*)::BIGINT as count FROM public.subsidies_structured
  UNION ALL
  SELECT 'raw_scraped_pages'::TEXT as table_name, COUNT(*)::BIGINT as count FROM public.raw_scraped_pages
  UNION ALL
  SELECT 'raw_logs'::TEXT as table_name, COUNT(*)::BIGINT as count FROM public.raw_logs
  ORDER BY table_name;
END;
$$;

-- 2. Add user role management functions with security controls
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role app_role, _assigned_by uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can assign roles
  IF NOT public.has_role(_assigned_by, 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only admins can assign roles';
  END IF;
  
  -- Prevent self-elevation unless already admin
  IF _user_id = _assigned_by AND _role = 'admin' AND NOT public.has_role(_assigned_by, 'admin') THEN
    RAISE EXCEPTION 'Security violation: Cannot self-assign admin role';
  END IF;
  
  -- Insert or update user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the role assignment
  INSERT INTO public.user_actions (
    user_id, action_type, resource_type, resource_id, action_data, triggered_by
  ) VALUES (
    _assigned_by, 'role_assigned', 'user', _user_id,
    jsonb_build_object('role', _role, 'target_user', _user_id),
    'admin_action'
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_user_role(_user_id uuid, _role app_role, _revoked_by uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can revoke roles
  IF NOT public.has_role(_revoked_by, 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only admins can revoke roles';
  END IF;
  
  -- Prevent self-demotion from admin
  IF _user_id = _revoked_by AND _role = 'admin' THEN
    RAISE EXCEPTION 'Security violation: Cannot revoke own admin role';
  END IF;
  
  DELETE FROM public.user_roles 
  WHERE user_id = _user_id AND role = _role;
  
  -- Log the role revocation
  INSERT INTO public.user_actions (
    user_id, action_type, resource_type, resource_id, action_data, triggered_by
  ) VALUES (
    _revoked_by, 'role_revoked', 'user', _user_id,
    jsonb_build_object('role', _role, 'target_user', _user_id),
    'admin_action'
  );
  
  RETURN TRUE;
END;
$$;

-- 3. Create security audit log table for monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  target_user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  event_data jsonb DEFAULT '{}',
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security audit log" 
ON public.security_audit_log FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert audit events
CREATE POLICY "Service role can log security events" 
ON public.security_audit_log FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- 4. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _target_user_id uuid DEFAULT NULL,
  _event_data jsonb DEFAULT '{}',
  _risk_level text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type, user_id, target_user_id, event_data, risk_level
  ) VALUES (
    _event_type, auth.uid(), _target_user_id, _event_data, _risk_level
  );
END;
$$;