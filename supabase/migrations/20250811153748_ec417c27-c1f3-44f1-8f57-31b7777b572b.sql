-- Group 4: Database views for UI dashboards (read-only)

-- A) Run-level health over last 24h
create or replace view v_pipeline_health_24h as
select
  date_trunc('hour', pr.created_at) as hour,
  count(*) as runs,
  sum( (pr.stats->'harvest'->>'pages_scraped')::int ) as pages_scraped,
  sum( (pr.stats->'ai'->>'pages_processed')::int ) as ai_pages_processed,
  sum( (pr.stats->'ai'->>'successful')::int ) as ai_successful,
  sum( (pr.stats->'ai'->>'failed')::int ) as ai_failed,
  sum( case when pr.status = 'completed' then 1 else 0 end) as runs_completed,
  sum( case when (pr.stats->>'reason') = 'no_content' then 1 else 0 end) as runs_no_content
from pipeline_runs pr
where pr.created_at >= now() - interval '24 hours'
group by 1
order by 1 desc;

-- B) Harvest quality by source over last 24h
create or replace view v_harvest_quality_by_source_24h as
with base as (
  select
    source_site,
    length(coalesce(text_markdown, raw_text, raw_html)) as content_len,
    (text_markdown is not null)::int as has_md,
    created_at
  from raw_scraped_pages
  where created_at >= now() - interval '24 hours'
)
select
  source_site,
  count(*) as pages,
  avg(content_len)::int as avg_len,
  sum( (content_len >= 1000)::int ) as ge_1k,
  round(100.0 * sum( (content_len >= 1000)::int ) / greatest(count(*),1), 2) as pct_ge_1k,
  round(100.0 * avg(has_md)::numeric, 2) as pct_with_markdown
from base
group by 1
order by pages desc;

-- C) Orphan pages (no run_id) recent
create or replace view v_orphan_pages_recent as
select
  source_site,
  count(*) as orphan_pages,
  max(created_at) as last_seen
from raw_scraped_pages
where run_id is null
  and created_at >= now() - interval '6 hours'
group by 1
order by orphan_pages desc;

-- D) AI yield by run (requires ai_content_runs from Group 3)
create or replace view v_ai_yield_by_run as
select
  run_id,
  max(model) as model,
  max(ended_at) as last_ended,
  sum(pages_seen) as pages_seen,
  sum(pages_eligible) as pages_eligible,
  sum(pages_processed) as pages_processed,
  sum(subs_created) as subsidies_created,
  0 as errors_count -- placeholder until we have proper error tracking
from ai_content_runs
where run_id is not null
group by run_id
order by last_ended desc nulls last;

-- E) Function error rate proxy (based on ai_content_errors)
create or replace view v_ai_errors_last_24h as
select
  stage as error_type,
  count(*) as errors,
  min(created_at) as first_seen,
  max(created_at) as last_seen
from ai_content_errors
where created_at >= now() - interval '24 hours'
group by 1
order by errors desc;

-- F) Quick "is something stuck?" signal
create or replace view v_active_run_status as
select
  pr.id as run_id,
  pr.stage,
  pr.status,
  pr.progress,
  pr.created_at,
  pr.updated_at,
  pr.stats
from pipeline_runs pr
where pr.status in ('running','queued')
order by pr.created_at desc
limit 1;