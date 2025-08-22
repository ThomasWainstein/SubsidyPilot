-- Phase 4D: Security Hardening - Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read security logs
CREATE POLICY "Admins can read security logs" ON public.security_audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- System can insert security logs
CREATE POLICY "System can insert security logs" ON public.security_audit_log
  FOR INSERT WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_risk_level ON public.security_audit_log(risk_level);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_message TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_risk_level TEXT DEFAULT 'low',
  p_target_user_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    target_user_id,
    event_type,
    message,
    event_data,
    risk_level
  ) VALUES (
    auth.uid(),
    p_target_user_id,
    p_event_type,
    p_message,
    p_event_data,
    p_risk_level
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;