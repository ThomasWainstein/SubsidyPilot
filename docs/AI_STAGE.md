# AI Stage Runbook

## Overview
The AI stage processes scraped content using OpenAI to extract structured agricultural subsidy data.

## Architecture
1. **Orchestrator** calls `ai-content-processor` with retry logic
2. **AI Processor** extracts subsidies from eligible pages
3. **Results** stored in `subsidies_structured` and tracked in `ai_content_runs`

## Retry Logic
- 3 attempts with exponential backoff (1s, 2s, 4s)
- Retries on HTTP 429 and 5xx errors
- Uses service role key for invocation

## Diagnostics

### Check for stuck runs
```sql
-- Recent AI stalls (stuck > 20 minutes)
SELECT id, stage, status, progress, updated_at
FROM pipeline_runs
WHERE stage = 'ai' 
  AND status = 'running' 
  AND updated_at < now() - interval '20 minutes';
```

### Verify run wiring
```sql
-- Pages without run_id (should be 0)
SELECT count(*) as pages, 
       count(*) FILTER (WHERE run_id IS NULL) as pages_without_run
FROM raw_scraped_pages
WHERE created_at > now() - interval '6 hours';
```

### Check AI results
```sql
-- AI run metrics
SELECT run_id, pages_seen, pages_eligible, pages_processed, 
       subs_created, model, started_at, ended_at
FROM ai_content_runs
WHERE run_id = 'YOUR_RUN_ID'
ORDER BY ended_at DESC LIMIT 1;
```

## Manual Recovery

### Emergency AI trigger
```bash
supabase functions invoke emergency-ai-trigger \
  --project-ref gvfgvbztagafjykncwto \
  --no-verify-jwt \
  --body '{"run_id":"YOUR_RUN_ID"}'
```

### Direct AI processor call
```bash
supabase functions invoke ai-content-processor \
  --project-ref gvfgvbztagafjykncwto \
  --no-verify-jwt \
  --body '{"run_id":"YOUR_RUN_ID","quality_threshold":0.3}'
```

## Common Issues

### No Content Processed (subs_created = 0)
1. Check page eligibility: `length(text_markdown || raw_text) >= 200`
2. Verify model temperature (should be 0.1 for consistent JSON)
3. Check for JSON parsing errors in logs
4. Ensure service role has insert permissions

### Orchestrator Not Invoking AI
1. Verify orchestrator reaches AI stage
2. Check service role key is configured
3. Look for retry exhaustion in logs
4. Verify AI processor function exists and is deployed

### RLS Issues
- AI processor must use service role key
- Ensure `subsidies_structured` allows service role inserts
- Check `ai_content_runs` table permissions