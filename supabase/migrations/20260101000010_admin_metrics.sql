-- ============================================================
-- Admin metrics: read-only aggregate functions for /admin.
-- SECURITY DEFINER so they can join auth.users (emails, last sign-in),
-- and aggregate in SQL so results aren't capped by PostgREST's max-rows.
-- Execute is granted to service_role ONLY — the app calls these from
-- server code after its own ADMIN_EMAILS check.
-- ============================================================

-- One row per user with their engagement + Telegram + billing rollups.
-- p_filter: all | active_7d | inactive_30d | onboarded | not_onboarded
--           | telegram_any | telegram_connected | telegram_none | paying
create or replace function public.admin_user_stats(
  p_search text default null,
  p_filter text default 'all',
  p_user_id uuid default null
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  onboarding_completed boolean,
  has_cv boolean,
  preferred_country text,
  searches_count bigint,
  telegram_searches_count bigint,
  failed_searches_count bigint,
  last_search_at timestamptz,
  matches_count bigint,
  saved_jobs_count bigint,
  bot_status text,
  bot_username text,
  bot_connected_at timestamptz,
  bot_webhook_registered_at timestamptz,
  bot_last_update_at timestamptz,
  bot_updates_count bigint,
  bot_last_error text,
  subscription_status text,
  paid_kobo bigint,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select
      u.id as user_id,
      u.email::text as email,
      p.full_name,
      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at is not null as email_confirmed,
      coalesce(p.onboarding_completed, false) as onboarding_completed,
      cv.user_id is not null as has_cv,
      p.preferred_country,
      s.total as searches_count,
      s.telegram as telegram_searches_count,
      s.failed as failed_searches_count,
      s.last_at as last_search_at,
      m.total as matches_count,
      sj.total as saved_jobs_count,
      b.status as bot_status,
      b.bot_username,
      b.created_at as bot_connected_at,
      b.webhook_registered_at as bot_webhook_registered_at,
      tu.last_at as bot_last_update_at,
      coalesce(tu.total, 0) as bot_updates_count,
      b.last_error as bot_last_error,
      sub.status as subscription_status,
      pt.kobo as paid_kobo,
      greatest(u.last_sign_in_at, s.last_at, tu.last_at) as last_seen_at
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.cv_files cv on cv.user_id = u.id
    left join public.telegram_bots b on b.user_id = u.id
    left join public.subscriptions sub on sub.user_id = u.id
    cross join lateral (
      select
        count(*) as total,
        count(*) filter (where x.source = 'telegram') as telegram,
        count(*) filter (where x.status = 'failed') as failed,
        max(x.created_at) as last_at
      from public.searches x
      where x.user_id = u.id
    ) s
    cross join lateral (
      select count(*) as total from public.matches x where x.user_id = u.id
    ) m
    cross join lateral (
      select count(*) as total from public.saved_jobs x where x.user_id = u.id
    ) sj
    cross join lateral (
      select coalesce(sum(x.amount_kobo), 0)::bigint as kobo
      from public.payment_transactions x
      where x.user_id = u.id and x.status = 'success'
    ) pt
    left join lateral (
      select count(*) as total, max(x.created_at) as last_at
      from public.telegram_updates x
      where x.bot_id = b.id
    ) tu on b.id is not null
    where p_user_id is null or u.id = p_user_id
  )
  select *
  from base
  where (
      p_search is null
      or p_search = ''
      or base.email ilike '%' || p_search || '%'
      or base.full_name ilike '%' || p_search || '%'
      or base.bot_username ilike '%' || p_search || '%'
    )
    and case coalesce(p_filter, 'all')
      when 'active_7d' then base.last_seen_at > now() - interval '7 days'
      when 'inactive_30d' then base.last_seen_at is null or base.last_seen_at < now() - interval '30 days'
      when 'onboarded' then base.onboarding_completed
      when 'not_onboarded' then not base.onboarding_completed
      when 'telegram_any' then base.bot_status is not null
      when 'telegram_connected' then base.bot_status = 'connected'
      when 'telegram_none' then base.bot_status is null
      when 'paying' then base.paid_kobo > 0 or base.subscription_status = 'active'
      else true
    end
  order by base.created_at desc;
$$;

-- Single-row headline numbers for the admin overview.
create or replace function public.admin_totals()
returns table (
  total_users bigint,
  new_users_7d bigint,
  new_users_30d bigint,
  active_users_7d bigint,
  active_users_30d bigint,
  onboarded_users bigint,
  users_with_cv bigint,
  bots_total bigint,
  bots_connected bigint,
  bots_pending bigint,
  bots_error bigint,
  bots_disconnected bigint,
  bots_active_7d bigint,
  telegram_updates_7d bigint,
  searches_total bigint,
  searches_7d bigint,
  searches_dashboard_7d bigint,
  searches_telegram_7d bigint,
  searches_failed_7d bigint,
  searches_no_matches_7d bigint,
  matches_total bigint,
  matches_7d bigint,
  saved_jobs_total bigint,
  active_subscriptions bigint,
  successful_payments bigint,
  revenue_kobo bigint,
  revenue_kobo_30d bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with activity as (
    select u.id, greatest(u.last_sign_in_at, s.last_at, tu.last_at) as last_seen_at
    from auth.users u
    left join lateral (
      select max(x.created_at) as last_at from public.searches x where x.user_id = u.id
    ) s on true
    left join public.telegram_bots b on b.user_id = u.id
    left join lateral (
      select max(x.created_at) as last_at from public.telegram_updates x where x.bot_id = b.id
    ) tu on true
  )
  select
    (select count(*) from auth.users),
    (select count(*) from auth.users where created_at > now() - interval '7 days'),
    (select count(*) from auth.users where created_at > now() - interval '30 days'),
    (select count(*) from activity where last_seen_at > now() - interval '7 days'),
    (select count(*) from activity where last_seen_at > now() - interval '30 days'),
    (select count(*) from public.profiles where onboarding_completed),
    (select count(*) from public.cv_files),
    (select count(*) from public.telegram_bots),
    (select count(*) from public.telegram_bots where status = 'connected'),
    (select count(*) from public.telegram_bots where status = 'pending'),
    (select count(*) from public.telegram_bots where status = 'error'),
    (select count(*) from public.telegram_bots where status = 'disconnected'),
    (select count(distinct b.id)
       from public.telegram_bots b
       join public.telegram_updates tu on tu.bot_id = b.id
      where b.status = 'connected' and tu.created_at > now() - interval '7 days'),
    (select count(*) from public.telegram_updates where created_at > now() - interval '7 days'),
    (select count(*) from public.searches),
    (select count(*) from public.searches where created_at > now() - interval '7 days'),
    (select count(*) from public.searches where source = 'dashboard' and created_at > now() - interval '7 days'),
    (select count(*) from public.searches where source = 'telegram' and created_at > now() - interval '7 days'),
    (select count(*) from public.searches where status = 'failed' and created_at > now() - interval '7 days'),
    (select count(*) from public.searches where status = 'no_matches' and created_at > now() - interval '7 days'),
    (select count(*) from public.matches),
    (select count(*) from public.matches where delivered_at > now() - interval '7 days'),
    (select count(*) from public.saved_jobs),
    (select count(*) from public.subscriptions where status = 'active'),
    (select count(*) from public.payment_transactions where status = 'success'),
    (select coalesce(sum(amount_kobo), 0)::bigint from public.payment_transactions where status = 'success'),
    (select coalesce(sum(amount_kobo), 0)::bigint from public.payment_transactions
      where status = 'success' and created_at > now() - interval '30 days');
$$;

-- Per-day counts (UTC) for the last p_days days, oldest first, zero-filled.
create or replace function public.admin_daily_activity(p_days integer default 30)
returns table (
  day date,
  signups bigint,
  searches bigint,
  telegram_searches bigint,
  matches bigint,
  telegram_updates bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d::date as day,
    (select count(*) from auth.users u
      where (u.created_at at time zone 'utc')::date = d::date),
    (select count(*) from public.searches s
      where (s.created_at at time zone 'utc')::date = d::date),
    (select count(*) from public.searches s
      where s.source = 'telegram' and (s.created_at at time zone 'utc')::date = d::date),
    (select count(*) from public.matches m
      where (m.delivered_at at time zone 'utc')::date = d::date),
    (select count(*) from public.telegram_updates t
      where (t.created_at at time zone 'utc')::date = d::date)
  from generate_series(
    (now() at time zone 'utc')::date - (greatest(p_days, 1) - 1),
    (now() at time zone 'utc')::date,
    interval '1 day'
  ) as d
  order by d;
$$;

-- Most recent searches across all users, with the requester's email.
create or replace function public.admin_recent_searches(p_limit integer default 20)
returns table (
  id uuid,
  user_id uuid,
  email text,
  source text,
  status text,
  requested_count integer,
  delivered_count integer,
  error_message text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.user_id, u.email::text, s.source, s.status, s.requested_count,
         s.delivered_count, s.error_message, s.created_at
  from public.searches s
  join auth.users u on u.id = s.user_id
  order by s.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

revoke execute on function public.admin_user_stats(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.admin_totals() from public, anon, authenticated;
revoke execute on function public.admin_daily_activity(integer) from public, anon, authenticated;
revoke execute on function public.admin_recent_searches(integer) from public, anon, authenticated;

grant execute on function public.admin_user_stats(text, text, uuid) to service_role;
grant execute on function public.admin_totals() to service_role;
grant execute on function public.admin_daily_activity(integer) to service_role;
grant execute on function public.admin_recent_searches(integer) to service_role;
