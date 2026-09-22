-- ============================================================
-- credit_packs / subscription_plans: configurable products
-- ============================================================
create table public.credit_packs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_kobo integer not null check (price_kobo > 0),
  credits integer not null check (credits > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_packs enable row level security;
-- Product catalog is public read (needed to render pricing to signed-out visitors too).
create policy "credit_packs_select_all" on public.credit_packs
  for select using (true);

create trigger credit_packs_set_updated_at
  before update on public.credit_packs
  for each row execute function public.set_updated_at();

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_kobo integer not null check (price_kobo >= 0),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  daily_allowance integer not null check (daily_allowance >= 0),
  feature_limits jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;
create policy "subscription_plans_select_all" on public.subscription_plans
  for select using (true);

create trigger subscription_plans_set_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

-- ============================================================
-- subscriptions: at most one row per user for the MVP
-- ============================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  status text not null check (status in ('active', 'cancelled', 'expired', 'past_due')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
-- Writes happen server-side only (service role, once billing verifies a
-- subscription event) — no insert/update/delete policy for authenticated.

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================
-- credit_ledger: append-only source of truth for balances
-- ============================================================
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_type text not null check (
    entry_type in ('daily_grant', 'purchase', 'spend', 'adjustment')
  ),
  amount integer not null,
  daily_component integer not null default 0,
  purchased_component integer not null default 0,
  reference_type text,
  reference_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  constraint credit_ledger_amount_matches_components
    check (amount = daily_component + purchased_component)
);

create index credit_ledger_user_id_idx on public.credit_ledger (user_id);

alter table public.credit_ledger enable row level security;
create policy "credit_ledger_select_own" on public.credit_ledger
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies: all writes go through the SECURITY
-- DEFINER functions in the next migration, never direct table access.

-- ============================================================
-- daily_allowance_state: prevents duplicate daily grants
-- ============================================================
create table public.daily_allowance_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  grant_date date not null,
  granted_amount integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, grant_date)
);

alter table public.daily_allowance_state enable row level security;
create policy "daily_allowance_state_select_own" on public.daily_allowance_state
  for select using (auth.uid() = user_id);

-- ============================================================
-- payment_transactions / payment_events
-- ============================================================
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_id uuid not null references public.credit_packs (id),
  provider text not null default 'paystack',
  provider_reference text not null unique,
  amount_kobo integer not null check (amount_kobo > 0),
  credits integer not null check (credits > 0),
  status text not null default 'pending' check (
    status in ('pending', 'success', 'failed', 'abandoned')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_transactions enable row level security;
create policy "payment_transactions_select_own" on public.payment_transactions
  for select using (auth.uid() = user_id);
-- Inserts happen server-side when initializing checkout, using the user's
-- own session (user_id = auth.uid()), so an insert policy is safe here.
create policy "payment_transactions_insert_own" on public.payment_transactions
  for insert with check (auth.uid() = user_id);
-- Status transitions (pending -> success/failed) only happen from the
-- server-verified return/webhook path via the service-role client.

create trigger payment_transactions_set_updated_at
  before update on public.payment_transactions
  for each row execute function public.set_updated_at();

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paystack',
  dedupe_key text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_events enable row level security;
-- Service-role only table (webhook ingestion + admin debugging); no policies
-- for the authenticated role at all.
