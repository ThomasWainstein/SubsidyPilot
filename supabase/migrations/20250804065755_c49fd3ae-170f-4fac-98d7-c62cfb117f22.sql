-- Fix the function search path security issue
ALTER FUNCTION trigger_auto_schema_extraction() SET search_path = public;

COMMENT ON FUNCTION trigger_auto_schema_extraction() IS 'Automatically triggers schema extraction when new subsidies are added or URLs change - with secure search_path';