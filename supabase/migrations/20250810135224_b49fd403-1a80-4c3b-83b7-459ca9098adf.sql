-- CRITICAL SECURITY FIX: Secure subsidies_structured table
-- Ensure RLS is ON
ALTER TABLE subsidies_structured ENABLE ROW LEVEL SECURITY;

-- Drop permissive policy that exposed all data publicly
DROP POLICY IF EXISTS "Public can view subsidies_structured" ON subsidies_structured;

-- Only authenticated users can read subsidies (no longer public)
CREATE POLICY "authenticated_users_can_read_subsidies"
ON subsidies_structured
FOR SELECT
TO authenticated
USING (true);

-- Create a safe public view with limited columns for any data that MUST be public
CREATE OR REPLACE VIEW subsidies_public AS
SELECT 
    id, 
    title, 
    program,
    region,
    deadline,
    agency,
    funding_type,
    created_at
FROM subsidies_structured
WHERE COALESCE(archived, false) = false;

-- Set proper ownership
ALTER VIEW subsidies_public OWNER TO postgres;

-- Restrict anon role access to base table
REVOKE ALL ON TABLE subsidies_structured FROM anon;

-- Grant limited access to public view only
GRANT SELECT ON TABLE subsidies_public TO anon;

-- Log this critical security fix
INSERT INTO security_audit_log (
    event_type,
    user_id,
    event_data,
    risk_level
) VALUES (
    'data_exposure_fixed',
    NULL,
    jsonb_build_object(
        'action', 'secured_subsidies_table',
        'description', 'Removed public access to subsidies_structured, created limited public view',
        'timestamp', now()
    ),
    'critical'
);