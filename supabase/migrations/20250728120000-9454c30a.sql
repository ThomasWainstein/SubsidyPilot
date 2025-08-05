-- Add user_alerts table with dismissed flag
create table if not exists public.user_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  alert_id text not null,
  dismissed boolean default false,
  created_at timestamptz default now(),
  constraint user_alerts_unique unique(user_id, alert_id)
);
