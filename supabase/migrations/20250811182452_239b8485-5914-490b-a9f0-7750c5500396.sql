-- Create unique constraint for fingerprint (corrected syntax)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT constraint_name FROM information_schema.table_constraints 
                   WHERE table_name = 'subsidies_structured' 
                   AND constraint_name = 'subsidies_structured_fingerprint_unique') THEN
        ALTER TABLE subsidies_structured 
        ADD CONSTRAINT subsidies_structured_fingerprint_unique UNIQUE (fingerprint);
    END IF;
END $$;