-- Fix Security Definer views by converting to functions
-- These views bypass RLS and should be converted to secure functions

-- Drop the security definer views if they exist
DROP VIEW IF EXISTS public.admin_dashboard_stats;
DROP VIEW IF EXISTS public.extraction_summary_view;

-- Create secure replacement functions instead of views
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  total_users bigint,
  total_farms bigint,
  total_documents bigint,
  total_extractions bigint
) AS $$
BEGIN
  -- Only allow admins to access this data
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM public.farms) as total_farms,
    (SELECT COUNT(*) FROM public.farm_documents) as total_documents,
    (SELECT COUNT(*) FROM public.document_extractions) as total_extractions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

-- Create secure extraction summary function
CREATE OR REPLACE FUNCTION public.get_extraction_summary(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  document_id uuid,
  extraction_count bigint,
  latest_status text,
  confidence_avg numeric
) AS $$
BEGIN
  -- Users can only see their own data, admins can see all
  IF p_user_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Can only view own data';
  END IF;
  
  RETURN QUERY
  SELECT 
    de.document_id,
    COUNT(*) as extraction_count,
    (array_agg(de.status ORDER BY de.created_at DESC))[1] as latest_status,
    AVG(de.confidence_score) as confidence_avg
  FROM public.document_extractions de
  JOIN public.farm_documents fd ON de.document_id = fd.id
  JOIN public.farms f ON fd.farm_id = f.id
  WHERE f.user_id = p_user_id
  GROUP BY de.document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';