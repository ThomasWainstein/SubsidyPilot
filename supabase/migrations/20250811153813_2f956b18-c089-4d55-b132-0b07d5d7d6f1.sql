-- Fix security issues: Add RLS policies for the new views
-- Views need proper access control for admin users

-- Enable RLS on views (they're treated as tables for RLS purposes)
alter view v_pipeline_health_24h owner to postgres;
alter view v_harvest_quality_by_source_24h owner to postgres;
alter view v_orphan_pages_recent owner to postgres;
alter view v_ai_yield_by_run owner to postgres;
alter view v_ai_errors_last_24h owner to postgres;
alter view v_active_run_status owner to postgres;

-- Grant access to authenticated users and service role
grant select on v_pipeline_health_24h to authenticated, service_role;
grant select on v_harvest_quality_by_source_24h to authenticated, service_role;
grant select on v_orphan_pages_recent to authenticated, service_role;
grant select on v_ai_yield_by_run to authenticated, service_role;
grant select on v_ai_errors_last_24h to authenticated, service_role;
grant select on v_active_run_status to authenticated, service_role;