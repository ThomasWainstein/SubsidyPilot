-- Fix security warnings by setting search_path for functions
DROP FUNCTION IF EXISTS public.acquire_processing_lock(UUID);
DROP FUNCTION IF EXISTS public.release_processing_lock(UUID);

-- Create function for advisory locks with proper search_path
CREATE OR REPLACE FUNCTION public.acquire_processing_lock(log_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Try to acquire advisory lock using the log_id hash
    RETURN pg_try_advisory_lock(hashtext(log_id::text));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.release_processing_lock(log_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Release advisory lock using the log_id hash
    RETURN pg_advisory_unlock(hashtext(log_id::text));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;