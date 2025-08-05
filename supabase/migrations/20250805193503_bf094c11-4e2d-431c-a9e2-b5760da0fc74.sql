-- Create pipeline orchestration tables for integration and monitoring

-- Pipeline execution tracking
CREATE TABLE IF NOT EXISTS pipeline_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_type TEXT NOT NULL CHECK (execution_type IN ('scraping', 'ai_processing', 'form_generation', 'validation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  config JSONB NOT NULL DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  error_details JSONB DEFAULT '{}',
  country TEXT,
  batch_size INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  tags JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Quality monitoring and trends
CREATE TABLE IF NOT EXISTS quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES pipeline_executions(id) ON DELETE CASCADE,
  component TEXT NOT NULL,
  quality_type TEXT NOT NULL,
  score NUMERIC CHECK (score >= 0 AND score <= 1),
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  details JSONB DEFAULT '{}',
  benchmark_comparison JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Application form instances (generated from schemas)
CREATE TABLE IF NOT EXISTS application_form_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subsidy_id UUID NOT NULL,
  form_schema_id UUID REFERENCES subsidy_form_schemas(id) ON DELETE CASCADE,
  generated_config JSONB NOT NULL DEFAULT '{}',
  validation_rules JSONB DEFAULT '{}',
  auto_population_config JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'error')),
  generation_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User application sessions for tracking form completion
CREATE TABLE IF NOT EXISTS application_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  farm_id UUID,
  subsidy_id UUID NOT NULL,
  form_instance_id UUID REFERENCES application_form_instances(id) ON DELETE CASCADE,
  session_data JSONB NOT NULL DEFAULT '{}',
  completion_percentage NUMERIC DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  current_step INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Integration audit log
CREATE TABLE IF NOT EXISTS integration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  component_from TEXT NOT NULL,
  component_to TEXT NOT NULL,
  operation_data JSONB DEFAULT '{}',
  success BOOLEAN NOT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE pipeline_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_form_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage pipeline executions" ON pipeline_executions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view pipeline executions" ON pipeline_executions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage health metrics" ON system_health_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view health metrics" ON system_health_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage quality metrics" ON quality_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view quality metrics" ON quality_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Everyone can view form instances" ON application_form_instances
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage form instances" ON application_form_instances
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can manage their own application sessions" ON application_sessions
  FOR ALL USING (
    user_id = auth.uid() OR 
    (farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farms WHERE farms.id = application_sessions.farm_id AND farms.user_id = auth.uid()
    ))
  );

CREATE POLICY "Service role can manage audit log" ON integration_audit_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view audit log" ON integration_audit_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX idx_pipeline_executions_type_country ON pipeline_executions(execution_type, country);
CREATE INDEX idx_pipeline_executions_started_at ON pipeline_executions(started_at);

CREATE INDEX idx_system_health_metrics_type_name ON system_health_metrics(metric_type, metric_name);
CREATE INDEX idx_system_health_metrics_timestamp ON system_health_metrics(timestamp);

CREATE INDEX idx_quality_metrics_execution_id ON quality_metrics(execution_id);
CREATE INDEX idx_quality_metrics_component ON quality_metrics(component);

CREATE INDEX idx_application_form_instances_subsidy_id ON application_form_instances(subsidy_id);
CREATE INDEX idx_application_form_instances_status ON application_form_instances(status);

CREATE INDEX idx_application_sessions_user_farm ON application_sessions(user_id, farm_id);
CREATE INDEX idx_application_sessions_form_instance ON application_sessions(form_instance_id);
CREATE INDEX idx_application_sessions_status ON application_sessions(status);

CREATE INDEX idx_integration_audit_timestamp ON integration_audit_log(timestamp);
CREATE INDEX idx_integration_audit_components ON integration_audit_log(component_from, component_to);

-- Triggers for updated_at
CREATE TRIGGER update_pipeline_executions_updated_at
  BEFORE UPDATE ON pipeline_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_form_instances_updated_at
  BEFORE UPDATE ON application_form_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_sessions_updated_at
  BEFORE UPDATE ON application_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();