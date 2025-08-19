-- Add currency column to subsidies table
ALTER TABLE public.subsidies 
ADD COLUMN currency text DEFAULT 'EUR';