-- Add RLS policies to allow DELETE operations on subsidies table for admin functionality

-- Allow service role to delete subsidies (for edge functions and admin operations)
CREATE POLICY "Service role can delete subsidies" 
ON public.subsidies 
FOR DELETE 
USING (auth.role() = 'service_role');

-- Allow authenticated admin users to delete subsidies from admin interface
CREATE POLICY "Admin users can delete subsidies" 
ON public.subsidies 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Also add INSERT and UPDATE policies for admin functionality
CREATE POLICY "Service role can insert subsidies" 
ON public.subsidies 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update subsidies" 
ON public.subsidies 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Allow admin users to update subsidies (for editing functionality)
CREATE POLICY "Admin users can update subsidies" 
ON public.subsidies 
FOR UPDATE 
USING (auth.role() = 'authenticated');