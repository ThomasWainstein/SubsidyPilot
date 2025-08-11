# Group 3: AI Processing Instrumentation + Structured Insert Path

## Overview

Group 3 adds comprehensive observability and idempotent processing to the AI content processor, ensuring clean subsidies_structured inserts and full run metrics.

## Database Changes

### New Tables
- `ai_content_runs`: Tracks each AI invocation with full metrics
- `ai_content_errors`: Per-page error forensics for debugging  
- `subsidies_structured.fingerprint`: Enables idempotent inserts

### Key Features
- Unique fingerprint deduplication prevents duplicate subsidies
- Full AI run envelope tracking (start/end times, counts, errors)
- Graceful handling of "no content" scenarios

## AI Content Processor

### Inputs
```json
{
  "run_id": "uuid",
  "page_ids": ["optional-uuid-array"],
  "quality_threshold": 0.3,
  "min_len": 200,
  "model": "env or override",
  "allow_recent_fallback": false,
  "recent_window_minutes": 120
}
```

### Outputs
```json
{
  "success": true,
  "run_id": "uuid",
  "session_id": "string", 
  "model": "string",
  "pages_seen": 0,
  "pages_eligible": 0,
  "pages_processed": 0,
  "subsidies_created": 0,
  "errors_count": 0
}
```

## Feature Flags (Environment Variables)

- `AI_MODEL` (default: gpt-4.1-2025-04-14)
- `AI_MIN_LEN` (default: 200) 
- `AI_CHUNK_SIZE` (default: 8000)
- `AI_ALLOW_RECENT_FALLBACK` (default: false)
- `ENABLE_STRUCTURED_LOGS` (default: true)

## Verification Queries

### AI Run Metrics
```sql
select * from ai_content_runs
where run_id = '<<RUN_ID>>'
order by started_at desc limit 1;
```

### AI Errors by Type
```sql
select error_type, count(*) as errors, min(created_at) as first, max(created_at) as last
from ai_content_errors
where run_id = '<<RUN_ID>>'
group by 1 order by errors desc;
```

### Idempotent Inserts
```sql
select count(*) as total, count(distinct fingerprint) as distinct_keys
from subsidies_structured
where run_id = '<<RUN_ID>>';
```

### Pipeline Status
```sql
select id, stage, status, progress, stats->'ai' as ai_stats
from pipeline_runs
where id = '<<RUN_ID>>';
```

## Key Benefits

- **Full Observability**: Every AI invocation tracked with complete metrics
- **Error Forensics**: Per-page errors logged for debugging  
- **Idempotent Operations**: Repeated runs won't create duplicates
- **Graceful Degradation**: "No content" scenarios complete successfully
- **Feature Flags**: Configurable behavior without code changes