-- Create subsidy_matches table for tracking farm-subsidy matching
CREATE TABLE public.subsidy_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  subsidy_id UUID NOT NULL REFERENCES public.subsidies_structured(id) ON DELETE CASCADE,
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  match_criteria JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'dismissed'))
);

-- Create user_alerts table for tracking dismissed alerts
CREATE TABLE public.user_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id TEXT NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, alert_id)
);

-- Enable RLS
ALTER TABLE public.subsidy_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for subsidy_matches
CREATE POLICY "Users can view matches for their farms" 
ON public.subsidy_matches 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.farms 
  WHERE farms.id = subsidy_matches.farm_id 
  AND farms.user_id = auth.uid()
));

-- RLS policies for user_alerts  
CREATE POLICY "Users can manage their own alerts" 
ON public.user_alerts 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX idx_subsidy_matches_farm_id ON public.subsidy_matches(farm_id);
CREATE INDEX idx_subsidy_matches_confidence ON public.subsidy_matches(confidence DESC);
CREATE INDEX idx_user_alerts_user_id ON public.user_alerts(user_id);
CREATE INDEX idx_user_alerts_alert_id ON public.user_alerts(alert_id);

-- Add trigger for updated_at
CREATE TRIGGER update_subsidy_matches_updated_at
  BEFORE UPDATE ON public.subsidy_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_alerts_updated_at
  BEFORE UPDATE ON public.user_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();