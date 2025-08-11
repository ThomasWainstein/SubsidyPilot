# Phase D Production Shakedown

## 🚀 Production Preflight (60-90 seconds)

### 1. Function Secrets Verification
```bash
# Check current secrets
supabase secrets list --project-ref <your-ref> | grep -E 'ENABLE_PHASE_D|OPENAI_|MAX_TABLES|MAX_CELLS'

# Set missing secrets (staging first, then production)
supabase secrets set ENABLE_PHASE_D=true OPENAI_API_KEY=sk-... OPENAI_TABLES_MODEL=gpt-4o-mini --project-ref <your-ref>
```

### 2. Repository Secrets Check
Verify in GitHub → Settings → Secrets and variables → Actions:
- `SUPABASE_URL` ✓
- `SUPABASE_ANON_KEY` ✓  
- `SUPABASE_SERVICE_ROLE_KEY` ✓
- `SLACK_WEBHOOK_URL` ✓

### 3. Deploy Edge Function
```bash
supabase functions deploy extract-document-data --project-ref <your-ref>
```

## 🧪 Production Shakedown (8-10 minutes)

### 1. Core Fixtures + Harness
```bash
# Generate and test golden fixtures
deno run -A scripts/make_golden_fixtures.ts
deno run -A scripts/phase_d_harness.ts      # expect 21/21 pass
```

### 2. Extended Edge Cases
```bash
# Generate and test edge case fixtures
deno run -A scripts/make_golden_fixtures_ext.ts
deno run -A scripts/phase_d_harness_ext.ts  # expect 0 critical errors; scanned PDF may warn
```

### 3. Backfill Dry Run
```bash
# Test backfill logic without processing
BACKFILL_DAYS=1 DRY_RUN=true deno run -A scripts/backfill_phase_d.ts
```

### 4. Health Spot-Check (SQL Console)
```sql
-- Recent extraction outcomes
SELECT extraction_outcome, quality_tier, COUNT(*)
FROM phase_d_extractions
WHERE created_at > NOW() - INTERVAL '2 hours'
GROUP BY extraction_outcome, quality_tier
ORDER BY COUNT(*) DESC;

-- Health status
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '⚪ No extractions yet'
    WHEN AVG((extraction_outcome='success')::int) > 0.95 THEN '✅ Healthy'
    WHEN AVG((extraction_outcome='success')::int) > 0.85 THEN '⚠️ Degraded'
    ELSE '🚨 Critical'
  END AS health_status,
  COUNT(*) AS total_extractions,
  ROUND(AVG((extraction_outcome='success')::int)::numeric, 3) AS success_rate
FROM phase_d_extractions
WHERE created_at > NOW() - INTERVAL '2 hours';
```

### 5. Slack + Workflow Testing
- [ ] **Success path**: Run "Nightly Phase D Backfill" manually → confirm Slack success message
- [ ] **Failure path**: Temporarily set `ENABLE_PHASE_D=false` → run → confirm failure message → revert
- [ ] **E2E workflow**: Run "Phase D E2E Testing" manually → confirm 21/21 results

## 🚦 Deployment Gating

### Branch Protection Setup
1. GitHub → Settings → Branches → main → **Require status checks to pass**
2. Add required checks:
   - `Phase D E2E Testing` (core harness - required)
   - `Phase D Extended E2E` (edge cases - optional but recommended)

### Automated Deploy Gates
Deploy jobs automatically depend on harness success (already implemented in workflows).

## 🟢 Go Live

### Production Backfill
```bash
# Start with small window
BACKFILL_DAYS=1 DRY_RUN=false deno run -A scripts/backfill_phase_d.ts

# Monitor for 24h, then expand if healthy
BACKFILL_DAYS=7 DRY_RUN=false deno run -A scripts/backfill_phase_d.ts
```

### Success Targets (24h monitoring)
- Success rate > 95%
- Avg processing < 30s  
- Table quality ~0.7+ on clean documents
- No unexpected token cost spikes

## 🔴 Emergency Rollback (90 seconds max)

### Immediate Disable
```bash
# Kill the feature
supabase secrets set ENABLE_PHASE_D=false --project-ref <your-ref>

# Redeploy function to ensure rollback
supabase functions deploy extract-document-data --project-ref <your-ref>
```

### Verification
```sql
-- Confirm no new Phase D extractions
SELECT COUNT(*) FROM phase_d_extractions 
WHERE created_at > NOW() - INTERVAL '5 minutes';
```

## ⚙️ Production Guardrails

### Function Secrets Configuration
```bash
# Core Phase D settings
ENABLE_PHASE_D=true
OPENAI_API_KEY=sk-proj-your-key
OPENAI_TABLES_MODEL=gpt-4o-mini

# Resource limits (conservative start)
MAX_TABLES_PER_DOC=50
MAX_CELLS_PER_DOC=50000

# Optional performance tuning
CONCURRENCY=2
BACKFILL_BATCH_SIZE=2
```

### GitHub Repository Secrets
```bash
# Required for CI/CD
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SLACK_WEBHOOK_URL
```

### Emergency Scaling (if costs spike)
```bash
# Reduce resource usage
MAX_TABLES_PER_DOC=25
MAX_CELLS_PER_DOC=25000
CONCURRENCY=1

# Emergency disable
ENABLE_PHASE_D=false
```

## 📊 Monitoring Setup

### Dashboard Queries (Run These Now)
```sql
-- Processing performance (last 24h)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as extractions,
  ROUND(AVG(total_processing_time_ms)::numeric, 0) as avg_time_ms,
  SUM(total_tokens_used) as tokens,
  ROUND(AVG(table_quality)::numeric, 3) as avg_quality
FROM phase_d_extractions 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour 
ORDER BY hour DESC;

-- Alert thresholds check
SELECT 
  'Failure Rate' as metric,
  CASE WHEN failure_rate > 0.05 THEN '🚨 ALERT' ELSE '✅ OK' END as status,
  ROUND(failure_rate::numeric, 4) as current_value,
  '5%' as threshold
FROM (
  SELECT 
    CASE WHEN COUNT(*) > 0 
      THEN COUNT(*) FILTER (WHERE extraction_outcome = 'failed')::float / COUNT(*)
      ELSE 0 
    END as failure_rate
  FROM phase_d_extractions 
  WHERE created_at > NOW() - INTERVAL '1 hour'
) stats

UNION ALL

SELECT 
  'Processing Time' as metric,
  CASE WHEN avg_time > 30000 THEN '🚨 ALERT' ELSE '✅ OK' END as status,
  ROUND(avg_time::numeric, 0) as current_value,
  '30000ms' as threshold
FROM (
  SELECT AVG(total_processing_time_ms) as avg_time
  FROM phase_d_extractions 
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND extraction_outcome = 'success'
) stats;
```

## 🎯 Success Criteria

### Technical Validation
- [ ] **Golden harness**: 21/21 assertions pass
- [ ] **Extended harness**: Edge cases handled gracefully
- [ ] **Backfill**: Processes recent docs without errors
- [ ] **SQL health**: Success rate >95%, avg time <30s

### Operational Validation  
- [ ] **Slack integration**: Success/failure notifications working
- [ ] **GitHub Actions**: Both workflows execute successfully
- [ ] **Monitoring**: Dashboard queries return expected data
- [ ] **Error handling**: Graceful degradation for edge cases

### Business Validation
- [ ] **Table extraction**: Detects and processes tables correctly
- [ ] **Subsidy detection**: Finds relevant funding information
- [ ] **Multi-format**: Works across PDF/DOCX/XLSX files
- [ ] **Quality metrics**: Meaningful confidence scores assigned

---

## 🚨 Red Flags (Stop and Investigate)

- **Zero extractions** after 30 minutes
- **>20% failure rate** for golden fixtures  
- **>60s average processing time** consistently
- **Token usage >5x baseline** without proportional document increase
- **Slack notifications not working** for success/failure
- **Database errors** in function logs

## ✅ Green Light Indicators

- **21/21 harness passes** consistently
- **<5% failure rate** over 4-hour window
- **<30s average processing** for typical documents
- **Token usage predictable** and within budget
- **Quality scores >0.7** for documents with clear tables
- **Monitoring queries** return healthy metrics