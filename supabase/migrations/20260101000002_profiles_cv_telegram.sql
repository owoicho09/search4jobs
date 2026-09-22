-- ============================================================
-- profiles: 1:1 with auth.users
-- ============================================================
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  headline text,
  summary text,
  skills text[] not null default '{}',
  experience_level text check (
    experience_level in ('entry', 'junior', 'mid', 'senior', 'lead', 'executive')
  ),
  years_experience integer check (years_experience >= 0),
  preferred_titles text[] not null default '{}',
  preferred_country text,
  preferred_location text,
  work_arrangement text check (
    work_arrangement in ('remote', 'hybrid', 'onsite', 'any')
  ) default 'any',
  employment_types text[] not null default '{}',
  salary_min integer,
  salary_max integer,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a blank profile row when a new auth user is created, so the
-- rest of the app can always assume a profile row exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- cv_files: one current CV per user, stored in private Storage bucket "cvs"
-- ============================================================
create table public.cv_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  status text not null default 'ready' check (status in ('uploading', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cv_files enable row level security;

create policy "cv_files_select_own" on public.cv_files
  for select using (auth.uid() = user_id);
create policy "cv_files_insert_own" on public.cv_files
  for insert with check (auth.uid() = user_id);
create policy "cv_files_update_own" on public.cv_files
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cv_files_delete_own" on public.cv_files
  for delete using (auth.uid() = user_id);

create trigger cv_files_set_updated_at
  before update on public.cv_files
  for each row execute function public.set_updated_at();

-- ============================================================
-- telegram_bots: one connected bot per account, one account per bot
-- ============================================================
create table public.telegram_bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  telegram_bot_id bigint not null unique,
  bot_username text,
  bot_token_encrypted text not null,
  bot_token_hash text not null unique,
  webhook_registered_at timestamptz,
  status text not null default 'pending' check (
    status in ('pending', 'connected', 'disconnected', 'error')
  ),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.telegram_bots enable row level security;

-- Dashboard reads/writes go through the owning user's session. The webhook
-- path (no browser session) uses the service-role client, which bypasses RLS.
create policy "telegram_bots_select_own" on public.telegram_bots
  for select using (auth.uid() = user_id);
create policy "telegram_bots_insert_own" on public.telegram_bots
  for insert with check (auth.uid() = user_id);
create policy "telegram_bots_update_own" on public.telegram_bots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "telegram_bots_delete_own" on public.telegram_bots
  for delete using (auth.uid() = user_id);

create trigger telegram_bots_set_updated_at
  before update on public.telegram_bots
  for each row execute function public.set_updated_at();
