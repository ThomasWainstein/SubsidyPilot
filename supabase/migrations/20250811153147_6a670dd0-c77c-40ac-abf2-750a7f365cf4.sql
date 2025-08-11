-- Group 3: AI Processing Instrumentation + Structured Insert Path

-- 1) AI run envelope (one row per invocation)
create table if not exists ai_content_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid,
  session_id text,
  model text default 'gpt-4.1-2025-04-14',
  pages_seen int default 0,
  pages_eligible int default 0,
  pages_processed int default 0,
  subs_created int default 0,
  errors_count int default 0,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_ms int,
  params jsonb default '{}',
  notes text
);

-- Index for run_id lookups
create index if not exists idx_ai_content_runs_run_id on ai_content_runs(run_id);

-- 2) AI per-page errors for forensics
create table if not exists ai_content_errors (
  id uuid primary key default gen_random_uuid(),
  run_id uuid,
  page_id uuid,
  source_url text,
  error_type text,          -- fetch|parse_json|schema|db_insert|ai_api|other
  message text,
  snippet text,             -- truncated raw AI response for debugging
  stage text,               -- processing|parsing|validation|insert
  created_at timestamptz default now()
);

-- Index for run_id lookups
create index if not exists idx_ai_content_errors_run_id on ai_content_errors(run_id);

-- 3) Idempotency for structured subsidies
-- add a stable fingerprint to dedupe logically-same entries
alter table if exists subsidies_structured
  add column if not exists fingerprint text;

-- if not already present, enforce unique logical identity
create unique index if not exists ux_subsidies_structured_fingerprint
  on subsidies_structured (fingerprint);

-- helpful view for quick checks
create or replace view v_last_ai_runs as
select run_id, max(ended_at) as last_ended, sum(subs_created) as subs_created, count(*) as run_count
from ai_content_runs
where run_id is not null
group by 1
order by max(ended_at) desc;

-- RLS policies for new tables
alter table ai_content_runs enable row level security;
alter table ai_content_errors enable row level security;

-- Service role can manage AI content runs
create policy "Service role can manage AI content runs" on ai_content_runs
  for all using (auth.role() = 'service_role');

-- Admins can view AI content runs  
create policy "Admins can view AI content runs" on ai_content_runs
  for select using (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage AI content errors
create policy "Service role can manage AI content errors" on ai_content_errors
  for all using (auth.role() = 'service_role');

-- Admins can view AI content errors
create policy "Admins can view AI content errors" on ai_content_errors
  for select using (has_role(auth.uid(), 'admin'::app_role));