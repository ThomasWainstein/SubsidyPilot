# Phase D Production Shakedown

## 🚀 10-Minute Validation Checklist

### 1. Golden + Edge Fixtures Testing
```bash
# Generate all test fixtures
deno run -A scripts/make_golden_fixtures.ts
deno run -A scripts/make_golden_fixtures_ext.ts

# Run comprehensive harness (expect 21/21 core + extended results)
deno run -A scripts/phase_d_harness.ts

# Extended validation (optional)
deno run -A scripts/phase_d_harness_ext.ts  # See implementation below
```

### 2. Backfill Validation
```bash
# Set environment
export SUPABASE_URL="https://gvfgvbztagafjykncwto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# DRY RUN - Preview what would be processed
BACKFILL_DAYS=2 DRY_RUN=true deno run -A scripts/backfill_phase_d.ts

# LIVE RUN - Actually process documents  
BACKFILL_DAYS=2 DRY_RUN=false deno run -A scripts/backfill_phase_d.ts
```

### 3. SQL Spot-Check
```sql
-- Recent extraction outcomes
SELECT 
  extraction_outcome, 
  quality_tier,
  COUNT(*) as count,
  ROUND(AVG(total_processing_time_ms)::numeric, 0) as avg_time_ms,
  SUM(total_tokens_used) as tokens_used
FROM phase_d_extractions
WHERE created_at > NOW() - INTERVAL '2 hours'
GROUP BY extraction_outcome, quality_tier 
ORDER BY count DESC;

-- Health check
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '⚪ No extractions yet'
    WHEN AVG(CASE WHEN extraction_outcome = 'success' THEN 1.0 ELSE 0.0 END) > 0.95 THEN '✅ Healthy'
    WHEN AVG(CASE WHEN extraction_outcome = 'success' THEN 1.0 ELSE 0.0 END) > 0.85 THEN '⚠️ Degraded' 
    ELSE '🚨 Critical'
  END as health_status,
  COUNT(*) as total_extractions,
  ROUND(AVG(CASE WHEN extraction_outcome = 'success' THEN 1.0 ELSE 0.0 END)::numeric, 3) as success_rate
FROM phase_d_extractions
WHERE created_at > NOW() - INTERVAL '2 hours';
```

### 4. Slack + Workflow Testing
- [ ] **Success path**: Run "Nightly Phase D Backfill" manually → confirm Slack success message
- [ ] **Failure path**: Temporarily set `ENABLE_PHASE_D=false` → run → confirm failure message → revert
- [ ] **E2E workflow**: Run "Phase D E2E Testing" manually → confirm 21/21 results

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