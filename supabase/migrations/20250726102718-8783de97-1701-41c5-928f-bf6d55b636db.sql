-- Create table for storing raw scraped pages data
CREATE TABLE public.raw_scraped_pages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    source_url text NOT NULL UNIQUE,
    source_site text,
    scrape_date timestamp with time zone DEFAULT now(),
    raw_html text,
    raw_text text,
    attachment_paths jsonb DEFAULT '[]'::jsonb,
    attachment_count integer DEFAULT 0,
    status text DEFAULT 'raw'::text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.raw_scraped_pages ENABLE ROW LEVEL SECURITY;

-- Create policies for raw scraped pages access
CREATE POLICY "Service role can manage raw scraped pages" 
ON public.raw_scraped_pages 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Authenticated users can view raw scraped pages" 
ON public.raw_scraped_pages 
FOR SELECT 
USING (auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text]));

-- Create indexes for performance
CREATE INDEX idx_raw_scraped_pages_source_url ON public.raw_scraped_pages(source_url);
CREATE INDEX idx_raw_scraped_pages_source_site ON public.raw_scraped_pages(source_site);
CREATE INDEX idx_raw_scraped_pages_status ON public.raw_scraped_pages(status);
CREATE INDEX idx_raw_scraped_pages_scrape_date ON public.raw_scraped_pages(scrape_date);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_raw_scraped_pages_updated_at
    BEFORE UPDATE ON public.raw_scraped_pages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();