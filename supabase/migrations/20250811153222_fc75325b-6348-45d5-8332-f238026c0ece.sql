-- Group 3: AI Processing Instrumentation + Structured Insert Path
-- Clean migration that creates only what doesn't exist

-- 3) Idempotency for structured subsidies
-- add a stable fingerprint to dedupe logically-same entries
alter table if exists subsidies_structured
  add column if not exists fingerprint text;

-- if not already present, enforce unique logical identity
do $$ 
begin
  if not exists (select 1 from pg_indexes where indexname = 'ux_subsidies_structured_fingerprint') then
    create unique index ux_subsidies_structured_fingerprint on subsidies_structured (fingerprint);
  end if;
end $$;

-- helpful view for quick checks (will replace if exists)
create or replace view v_last_ai_runs as
select run_id, max(ended_at) as last_ended, sum(subs_created) as subs_created, count(*) as run_count
from ai_content_runs
where run_id is not null
group by 1
order by max(ended_at) desc;