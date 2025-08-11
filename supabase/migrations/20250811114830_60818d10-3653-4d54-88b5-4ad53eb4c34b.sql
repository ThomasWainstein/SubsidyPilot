-- Update the stuck pipeline run to canceled status
UPDATE pipeline_runs 
SET status = 'canceled', 
    ended_at = now(),
    error = jsonb_build_object(
      'message', 'Pipeline stuck - manually canceled and restarted',
      'stage', 'init',
      'timestamp', now()
    )
WHERE id = '93fd1a6c-053d-426e-84a1-01c93c4edce5' AND status = 'queued';