-- Fix function search path security warnings

-- Fix ensure_user_has_default_role function
CREATE OR REPLACE FUNCTION public.ensure_user_has_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure new users get a default 'farmer' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'farmer')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Fix log_role_assignment function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Fix is_current_user_admin function
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';