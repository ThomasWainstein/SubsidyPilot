-- Create trigger function to automatically enrich subsidies when they're inserted
CREATE OR REPLACE FUNCTION public.trigger_automatic_subsidy_enrichment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger for new subsidies (INSERT) or when content changes significantly (UPDATE)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title OR 
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.funding_markdown IS DISTINCT FROM NEW.funding_markdown
  )) THEN
    -- Make an async call to the automatic subsidy enrichment edge function
    PERFORM net.http_post(
      'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/automatic-subsidy-enrichment',
      jsonb_build_object('subsidyId', NEW.id::text),
      'application/json',
      jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
        'Content-Type', 'application/json'
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    INSERT INTO error_log (error_type, error_message, metadata)
    VALUES (
      'automatic_subsidy_enrichment_trigger',
      SQLERRM,
      jsonb_build_object(
        'subsidy_id', NEW.id,
        'trigger_op', TG_OP,
        'timestamp', now()
      )
    );
    RETURN NEW;
END;
$function$;

-- Create trigger on subsidies table
DROP TRIGGER IF EXISTS automatic_subsidy_enrichment_trigger ON public.subsidies;
CREATE TRIGGER automatic_subsidy_enrichment_trigger
  AFTER INSERT OR UPDATE ON public.subsidies
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_automatic_subsidy_enrichment();