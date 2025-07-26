-- Allow authenticated and anonymous users to read subsidies_structured data
CREATE POLICY "Public can view subsidies_structured" 
ON public.subsidies_structured 
FOR SELECT 
USING (true);