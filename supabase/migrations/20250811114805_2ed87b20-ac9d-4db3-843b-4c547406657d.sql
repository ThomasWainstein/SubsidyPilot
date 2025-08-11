-- Manually trigger the stuck pipeline run
SELECT supabase.functions.invoke('pipeline-orchestrator', '{"action": "orchestrate", "runId": "93fd1a6c-053d-426e-84a1-01c93c4edce5"}'::jsonb);