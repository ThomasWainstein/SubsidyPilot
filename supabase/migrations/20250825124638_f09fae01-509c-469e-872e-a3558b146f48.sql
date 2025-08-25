-- Create function to fix subsidies source data with proper permissions
CREATE OR REPLACE FUNCTION public.fix_subsidies_source_data()
RETURNS TABLE(updated_count INTEGER, total_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_rows INTEGER;
  total_rows INTEGER;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total_rows FROM public.subsidies;
  
  -- Update subsidies without source or with manual source to les-aides-fr
  UPDATE public.subsidies 
  SET source = 'les-aides-fr',
      last_synced_at = now()
  WHERE source IS NULL OR source = 'manual' OR source = '';
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  RETURN QUERY SELECT updated_rows, total_rows;
END;
$$;