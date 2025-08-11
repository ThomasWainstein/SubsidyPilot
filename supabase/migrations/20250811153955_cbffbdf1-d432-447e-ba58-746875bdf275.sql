-- Create simple views without RLS (they inherit security from underlying tables)
-- Since views can't have RLS directly, rely on underlying table security

-- Drop and recreate views properly
drop view if exists v_pipeline_health_24h;
drop view if exists v_harvest_quality_by_source_24h;
drop view if exists v_orphan_pages_recent;
drop view if exists v_ai_yield_by_run;
drop view if exists v_ai_errors_last_24h;
drop view if exists v_active_run_status;

-- A) Run-level health over last 24h
create or replace view v_pipeline_health_24h as
select
  date_trunc('hour', pr.created_at) as hour,
  count(*) as runs,
  coalesce(sum( (pr.stats->'harvest'->>'pages_scraped')::int ), 0) as pages_scraped,
  coalesce(sum( (pr.stats->'ai'->>'pages_processed')::int ), 0) as ai_pages_processed,
  coalesce(sum( (pr.stats->'ai'->>'successful')::int ), 0) as ai_successful,
  coalesce(sum( (pr.stats->'ai'->>'failed')::int ), 0) as ai_failed,
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
    coalesce(source_site, 'unknown') as source_site,
    length(coalesce(text_markdown, raw_text, raw_html, '')) as content_len,
    (text_markdown is not null)::int as has_md,
    created_at
  from raw_scraped_pages
  where created_at >= now() - interval '24 hours'
)
select
  source_site,
  count(*) as pages,
  coalesce(avg(content_len)::int, 0) as avg_len,
  sum( (content_len >= 1000)::int ) as ge_1k,
  round(100.0 * sum( (content_len >= 1000)::int ) / greatest(count(*),1), 2) as pct_ge_1k,
  round(100.0 * avg(has_md)::numeric, 2) as pct_with_markdown
from base
group by 1
order by pages desc;

-- C) Orphan pages (no run_id) recent
create or replace view v_orphan_pages_recent as
select
  coalesce(source_site, 'unknown') as source_site,
  count(*) as orphan_pages,
  max(created_at) as last_seen
from raw_scraped_pages
where run_id is null
  and created_at >= now() - interval '6 hours'
group by 1
order by orphan_pages desc;

-- D) AI yield by run
create or replace view v_ai_yield_by_run as
select
  run_id,
  max(model) as model,
  max(ended_at) as last_ended,
  coalesce(sum(pages_seen), 0) as pages_seen,
  coalesce(sum(pages_eligible), 0) as pages_eligible,
  coalesce(sum(pages_processed), 0) as pages_processed,
  coalesce(sum(subs_created), 0) as subsidies_created,
  0 as errors_count
from ai_content_runs
where run_id is not null
group by run_id
order by last_ended desc nulls last;

-- E) Function error rate proxy
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

-- F) Active run status
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