-- Fix security warning: Set search_path for update_pipeline_runs_updated_at function
CREATE OR REPLACE FUNCTION public.update_pipeline_runs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;