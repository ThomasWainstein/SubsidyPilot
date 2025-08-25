-- Create API rate limiting table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_source TEXT NOT NULL,
  date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(api_source, date)
);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage rate limits" ON public.api_rate_limits
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to increment rate count
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
$$ LANGUAGE plpgsql;