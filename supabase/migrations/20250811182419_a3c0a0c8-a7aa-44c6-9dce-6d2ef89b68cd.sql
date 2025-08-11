-- Add fingerprint column for duplicate detection in AI processing
ALTER TABLE subsidies_structured 
ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Create index for efficient fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_subsidies_structured_fingerprint 
ON subsidies_structured(fingerprint);

-- Add unique constraint to prevent duplicates
ALTER TABLE subsidies_structured 
ADD CONSTRAINT IF NOT EXISTS subsidies_structured_fingerprint_unique 
UNIQUE (fingerprint);