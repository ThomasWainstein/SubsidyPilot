# Group 4: UI Control Surface + Observability/Alerts

This document outlines the implementation of Group 4, which provides accurate pipeline status tracking, observability dashboards, and lightweight monitoring.

## Features Implemented

### 1. Database Views (Read-Only)

Created 6 views to power the UI dashboards without heavy client-side joins:

- **`v_pipeline_health_24h`** - Run-level health metrics over last 24 hours
- **`v_harvest_quality_by_source_24h`** - Harvest quality by source site 
- **`v_orphan_pages_recent`** - Pages without run_id in last 6 hours
- **`v_ai_yield_by_run`** - AI processing yield by run ID
- **`v_ai_errors_last_24h`** - AI error counts and types
- **`v_active_run_status`** - Current active/running pipeline status

### 2. Frontend Pipeline Control Surface

#### Components Created:
- **`PipelineRunCard`** (`src/components/pipeline/PipelineRunCard.tsx`)
  - Single source of truth for pipeline state
  - Real-time updates via Supabase subscriptions
  - Polling fallback every 5 seconds
  - Session storage persistence
  - Smart button states (Start disabled when active)
  - Progress bar and status indicators
  - Resume AI button (feature flagged)

#### Hooks Created:
- **`useActiveRun`** (`src/hooks/useActiveRun.ts`)
  - Manages active pipeline run state
  - Real-time subscriptions and polling
  - Start/cancel pipeline operations
  - Session storage fallback

- **`useFeatureFlags`** (`src/hooks/useFeatureFlags.ts`)
  - Feature flag management
  - Environment variable integration

### 3. Observability Dashboard

**`ObservabilityDashboard`** (`src/components/observability/ObservabilityDashboard.tsx`)

#### Summary Cards:
- **Runs (24h)**: Total, completed, no-content counts
- **Harvest Sources**: Active sources count  
- **Orphan Pages**: Count with alert styling
- **AI Errors**: Error count with status indicators

#### Detailed Views:
- **Harvest Quality Table**: Pages, content length, markdown percentage by source
- **AI Yield Table**: Last 10 runs with processing stats
- **Orphan Pages List**: By source with timestamps
- **AI Errors List**: Error types with frequencies

### 4. Lightweight Monitor Function

**`monitor-pipeline-health`** (`supabase/functions/monitor-pipeline-health/index.ts`)

#### SLO Checks:
- French harvest zero detection
- Orphan pages threshold monitoring  
- AI error spike detection
- AI processing stall detection

#### Response Format:
```json
{
  "status": "healthy|degraded|critical",
  "flags": [
    {
      "flag": "fr_harvest_zero",
      "severity": "critical", 
      "count": 0,
      "description": "No French harvest activity in last 24h"
    }
  ],
  "summary": {
    "total_flags": 1,
    "critical": 1,
    "warnings": 0
  }
}
```

### 5. Feature Flags

Environment variables for controlling functionality:

- **`UI_OBSERVABILITY_ENABLED`** (default: true) - Show/hide observability tab
- **`UI_RESUME_AI_ENABLED`** (default: true) - Show/hide Resume AI button  
- **`MONITORING_ENABLED`** (default: false) - Enable health monitoring

## Usage

### Pipeline Control
```typescript
import { PipelineRunCard } from '@/components/pipeline/PipelineRunCard';

// Use in dashboard
<PipelineRunCard />
```

### Observability Dashboard
```typescript
import { ObservabilityDashboard } from '@/components/observability/ObservabilityDashboard';

// Use in admin panel
<ObservabilityDashboard />
```

### Health Monitor
```bash
# Manual health check
supabase functions invoke monitor-pipeline-health --no-verify-jwt --project-ref gvfgvbztagafjykncwto --body '{}'

# With custom SLO thresholds
supabase functions invoke monitor-pipeline-health --no-verify-jwt --project-ref gvfgvbztagafjykncwto --body '{
  "slo": {
    "min_fr_pages_per_6h": 5,
    "max_orphans": 2,
    "max_ai_errors_24h": 5,
    "ai_stall_minutes": 20
  }
}'
```

## Verification Queries

```sql
-- A. Active run state
select * from v_active_run_status;

-- B. Harvest quality
select * from v_harvest_quality_by_source_24h order by pages desc;

-- C. AI yield (last 10)
select * from v_ai_yield_by_run limit 10;

-- D. Orphans (6h)
select * from v_orphan_pages_recent;
```

## Architecture Notes

- **Real-time Updates**: Uses Supabase real-time subscriptions with polling fallback
- **State Management**: Session storage for persistence across page reloads
- **Feature Flags**: Environment-based toggles for safe deployment
- **Read-Only Views**: Optimized queries without client-side joins
- **Monitoring**: Stateless function with configurable SLO thresholds

## Next Steps

1. Integrate components into existing admin dashboard
2. Set up automated health monitoring schedule
3. Configure environment variables for feature flags
4. Add alert notifications (email, Slack, etc.)
5. Extend monitoring with more sophisticated SLO checks