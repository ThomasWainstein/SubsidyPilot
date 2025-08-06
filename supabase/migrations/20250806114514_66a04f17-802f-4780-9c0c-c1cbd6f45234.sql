-- Add unique constraint on source_url for subsidies table to enable proper upserts
ALTER TABLE subsidies ADD CONSTRAINT subsidies_source_url_unique UNIQUE (source_url);