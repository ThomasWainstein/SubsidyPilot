# Phase D Monitoring & Alerting

## Operational Thresholds

### Performance Alerts
- **Processing Time**: Alert if average processing time > 30 seconds
- **Failure Rate**: Alert if failure rate > 5% over 1-hour window  
- **Token Spike**: Alert if hourly token usage > 150% of baseline
- **Queue Backlog**: Alert if extraction queue > 50 pending items

### Quality Alerts  
- **Table Quality**: Alert if average table quality < 0.5 over 4-hour window
- **Success Rate**: Alert if extraction success rate < 95% over 1-hour window
- **Subsidy Detection**: Alert if subsidy field detection rate < 50% over 4-hour window

## Monitoring Queries

### Performance Monitoring
```sql
-- Recent processing performance
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_extractions,
  COUNT(*) FILTER (WHERE extraction_outcome = 'success') as successful,
  COUNT(*) FILTER (WHERE extraction_outcome = 'failed') as failed,
  ROUND(AVG(total_processing_time_ms)::numeric, 2) as avg_processing_ms,
  ROUND(AVG(table_quality)::numeric, 3) as avg_quality,
  SUM(total_tokens_used) as total_tokens
FROM phase_d_extractions 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

### Alert Conditions
```sql
-- Failure rate alert (>5% in last hour)
SELECT 
  CASE 
    WHEN failure_rate > 0.05 THEN 'ALERT: High failure rate'
    ELSE 'OK'
  END as status,
  failure_rate,
  total_extractions,
  failed_extractions
FROM (
  SELECT 
    COUNT(*) as total_extractions,
    COUNT(*) FILTER (WHERE extraction_outcome = 'failed') as failed_extractions,
    CASE 
      WHEN COUNT(*) > 0 THEN COUNT(*) FILTER (WHERE extraction_outcome = 'failed')::float / COUNT(*)
      ELSE 0 
    END as failure_rate
  FROM phase_d_extractions 
  WHERE created_at > NOW() - INTERVAL '1 hour'
) stats;

-- Processing time alert (>30s average in last hour)  
SELECT 
  CASE 
    WHEN avg_processing_time > 30000 THEN 'ALERT: High processing time'
    ELSE 'OK'
  END as status,
  avg_processing_time,
  extraction_count
FROM (
  SELECT 
    AVG(total_processing_time_ms) as avg_processing_time,
    COUNT(*) as extraction_count
  FROM phase_d_extractions 
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND extraction_outcome = 'success'
) stats;

-- Token usage spike alert (>150% of 7-day average)
WITH baseline AS (
  SELECT AVG(hourly_tokens) as avg_hourly_tokens
  FROM (
    SELECT 
      DATE_TRUNC('hour', created_at) as hour,
      SUM(total_tokens_used) as hourly_tokens
    FROM phase_d_extractions 
    WHERE created_at > NOW() - INTERVAL '7 days'
      AND created_at < NOW() - INTERVAL '1 hour'  -- Exclude current hour
    GROUP BY DATE_TRUNC('hour', created_at)
  ) hourly_stats
),
current_hour AS (
  SELECT SUM(total_tokens_used) as current_tokens
  FROM phase_d_extractions 
  WHERE created_at > DATE_TRUNC('hour', NOW())
)
SELECT 
  CASE 
    WHEN current_tokens > (baseline.avg_hourly_tokens * 1.5) THEN 'ALERT: Token usage spike'
    ELSE 'OK'
  END as status,
  current_tokens,
  baseline.avg_hourly_tokens,
  ROUND((current_tokens / baseline.avg_hourly_tokens)::numeric, 2) as spike_ratio
FROM baseline, current_hour;
```

## Grafana Dashboard Panels

### Key Metrics
1. **Processing Time Trend** (last 24h)
2. **Success/Failure Rate** (last 4h)  
3. **Token Usage per Hour** (last 24h)
4. **Table Quality Distribution** (last 24h)
5. **Subsidy Detection Rate** (last 24h)
6. **Extraction Queue Size** (real-time)

### Alert Rules
```yaml
# Grafana alert rules
groups:
  - name: phase_d_alerts
    interval: 5m
    rules:
      - alert: PhaseDHighFailureRate
        expr: failure_rate > 0.05
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Phase D failure rate above 5%"
          
      - alert: PhaseDSlowProcessing  
        expr: avg_processing_time_ms > 30000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Phase D processing time above 30s"
          
      - alert: PhaseDTokenSpike
        expr: token_usage_ratio > 1.5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Phase D token usage 50% above baseline"
```

## Slack Webhook Integration

### Quick Status Check
```bash
#!/bin/bash
# scripts/phase_d_status.sh - Run via cron or manual check

SUPABASE_URL="your-project-url"
SERVICE_KEY="your-service-key"

# Get current hour stats
STATS=$(psql "$DATABASE_URL" -t -c "
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE extraction_outcome = 'success') as success,
    ROUND(AVG(total_processing_time_ms)::numeric, 0) as avg_time,
    SUM(total_tokens_used) as tokens
  FROM phase_d_extractions 
  WHERE created_at > DATE_TRUNC('hour', NOW())
")

# Parse results and send to Slack if issues detected
if [[ $FAILURE_RATE > 0.05 ]] || [[ $AVG_TIME > 30000 ]]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"⚠️ Phase D Alert: Check processing metrics\"}" \
    "$SLACK_WEBHOOK_URL"
fi
```

## Cost Management

### Token Budget Alerts
```sql
-- Daily token budget check
SELECT 
  DATE(created_at) as date,
  SUM(total_tokens_used) as daily_tokens,
  CASE 
    WHEN SUM(total_tokens_used) > 100000 THEN 'BUDGET_WARNING'
    WHEN SUM(total_tokens_used) > 150000 THEN 'BUDGET_EXCEEDED' 
    ELSE 'OK'
  END as budget_status
FROM phase_d_extractions 
WHERE created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Auto-scaling Rules
- **High volume**: Reduce `CONCURRENCY` from 2 to 1
- **Budget exceeded**: Set `MAX_TABLES_PER_DOC` to 25
- **Emergency**: Set `ENABLE_PHASE_D=false` temporarily

## Runbook

### High Failure Rate (>5%)
1. Check OpenAI API status and rate limits
2. Review recent document uploads for corrupt files
3. Check function logs for specific error patterns
4. Verify Supabase database connectivity

### Slow Processing (>30s avg)
1. Check OpenAI API response times
2. Review document complexity (table count/size)
3. Consider reducing `MAX_TABLES_PER_DOC` temporarily
4. Check for memory/timeout issues in function logs

### Token Budget Exceeded
1. Identify high-token documents in logs
2. Adjust `MAX_CELLS_PER_DOC` if needed
3. Consider implementing table sampling for large docs
4. Review AI model choice (`gpt-4o-mini` vs others)

### Emergency Disable
```bash
# Quick disable Phase D
supabase secrets set ENABLE_PHASE_D=false --project-ref your-ref

# Re-enable after fix
supabase secrets set ENABLE_PHASE_D=true --project-ref your-ref
```