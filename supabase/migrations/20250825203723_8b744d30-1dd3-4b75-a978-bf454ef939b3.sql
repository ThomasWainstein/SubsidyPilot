-- Fix function search path security issue
CREATE OR REPLACE FUNCTION increment_api_rate_count(p_api_source TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.api_rate_limits (api_source, date, request_count)
  VALUES (p_api_source, p_date, 1)
  ON CONFLICT (api_source, date)
  DO UPDATE SET 
    request_count = api_rate_limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql
SET search_path = public;