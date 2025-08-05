-- Clean up any potential duplicate user_alerts table issues
-- First, ensure we have only one clean user_alerts table definition

-- Drop and recreate user_alerts table with proper structure
DROP TABLE IF EXISTS user_alerts CASCADE;

CREATE TABLE user_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_id TEXT NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own alerts" 
ON user_alerts 
FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_user_alerts_updated_at
  BEFORE UPDATE ON user_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();