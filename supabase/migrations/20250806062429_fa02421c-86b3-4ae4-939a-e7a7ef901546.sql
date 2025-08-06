-- Add RLS policies to allow DELETE operations on subsidies_structured table for admin functionality

-- Allow service role to delete subsidies_structured (for edge functions and admin operations)
CREATE POLICY "Service role can delete subsidies_structured" 
ON public.subsidies_structured 
FOR DELETE 
USING (auth.role() = 'service_role');

-- Allow authenticated admin users to delete subsidies_structured from admin interface
CREATE POLICY "Admin users can delete subsidies_structured" 
ON public.subsidies_structured 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Also add INSERT and UPDATE policies for admin functionality
CREATE POLICY "Service role can insert subsidies_structured" 
ON public.subsidies_structured 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update subsidies_structured" 
ON public.subsidies_structured 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Allow admin users to update subsidies_structured (for editing functionality)
CREATE POLICY "Admin users can update subsidies_structured" 
ON public.subsidies_structured 
FOR UPDATE 
USING (auth.role() = 'authenticated');