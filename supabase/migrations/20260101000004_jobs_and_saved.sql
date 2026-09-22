-- ============================================================
-- searches: one row per job-search request (dashboard or Telegram)
-- ============================================================
create table public.searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null default 'dashboard' check (source in ('dashboard', 'telegram')),
  query_params jsonb not null,
  requested_count integer not null check (requested_count > 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  status text not null default 'pending' check (
    status in ('pending', 'completed', 'failed', 'no_matches')
  ),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index searches_user_id_idx on public.searches (user_id, created_at desc);

alter table public.searches enable row level security;
create policy "searches_select_own" on public.searches
  for select using (auth.uid() = user_id);
create policy "searches_insert_own" on public.searches
  for insert with check (auth.uid() = user_id);
create policy "searches_update_own" on public.searches
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- matches: jobs actually delivered to the user for a search
-- ============================================================
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.searches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'adzuna',
  provider_job_id text not null,
  title text not null,
  company text,
  location text,
  work_arrangement text,
  employment_type text,
  salary_min integer,
  salary_max integer,
  description_snippet text,
  listing_url text not null,
  posted_at timestamptz,
  ai_relevance_score numeric,
  ai_explanation text,
  delivered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index matches_user_id_idx on public.matches (user_id, delivered_at desc);

alter table public.matches enable row level security;
create policy "matches_select_own" on public.matches
  for select using (auth.uid() = user_id);
create policy "matches_insert_own" on public.matches
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- saved_jobs
-- ============================================================
create table public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'adzuna',
  provider_job_id text not null,
  title text not null,
  company text,
  location text,
  listing_url text not null,
  salary_min integer,
  salary_max integer,
  posted_at timestamptz,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, provider, provider_job_id)
);

alter table public.saved_jobs enable row level security;
create policy "saved_jobs_select_own" on public.saved_jobs
  for select using (auth.uid() = user_id);
create policy "saved_jobs_insert_own" on public.saved_jobs
  for insert with check (auth.uid() = user_id);
create policy "saved_jobs_delete_own" on public.saved_jobs
  for delete using (auth.uid() = user_id);

-- ============================================================
-- telegram_updates: idempotency guard for webhook processing
-- ============================================================
create table public.telegram_updates (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.telegram_bots (id) on delete cascade,
  telegram_update_id bigint not null,
  created_at timestamptz not null default now(),
  unique (bot_id, telegram_update_id)
);

alter table public.telegram_updates enable row level security;
-- Service-role only (written from the webhook route); no authenticated policies.

-- ============================================================
-- app_config: small server-tunable knobs not worth redeploying for
-- ============================================================
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
-- Server-only (service role) reads/writes; not exposed to clients.
