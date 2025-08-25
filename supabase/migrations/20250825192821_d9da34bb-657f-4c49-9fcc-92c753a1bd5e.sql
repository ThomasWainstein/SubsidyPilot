-- Clean up stuck sync logs and fix UUID issues
UPDATE api_sync_logs 
SET status = 'failed', 
    completed_at = NOW(),
    errors = jsonb_build_object('error', 'Sync timeout - cleaned up by system')
WHERE status = 'running' 
AND started_at < NOW() - INTERVAL '1 hour';

-- Also clean up any sync logs with null completed_at but not running
UPDATE api_sync_logs 
SET completed_at = NOW()
WHERE completed_at IS NULL 
AND status != 'running';