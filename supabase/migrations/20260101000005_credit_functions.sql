-- All credit mutations go through these SECURITY DEFINER functions so that
-- (a) the authenticated role never needs direct INSERT on credit_ledger, and
-- (b) every mutation is atomic and idempotent under concurrent calls.
--
-- Authorization: each function allows the call when there is no JWT (i.e.
-- called via the service-role client, used by the Telegram webhook and
-- payment webhook paths) OR when the JWT's uid matches p_user_id (i.e.
-- called via a normal user session from the dashboard/Server Actions).

create or replace function public.get_credit_balance(p_user_id uuid)
returns table (daily_balance integer, purchased_balance integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not_authorized';
  end if;

  return query
  select
    coalesce(sum(daily_component), 0)::int,
    coalesce(sum(purchased_component), 0)::int
  from public.credit_ledger
  where user_id = p_user_id;
end;
$$;

grant execute on function public.get_credit_balance(uuid) to authenticated, service_role;

-- Grants today's daily allowance exactly once per user per UTC day.
-- Safe under concurrent calls: the unique (user_id, grant_date) constraint
-- on daily_allowance_state makes the "on conflict do nothing" the atomicity
-- boundary, and FOUND reports whether *this* call actually won the race.
create or replace function public.grant_daily_allowance(p_user_id uuid)
returns table (
  granted_today integer,
  newly_granted boolean,
  daily_balance integer,
  purchased_balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_allowance integer;
  v_inserted boolean;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not_authorized';
  end if;

  select sp.daily_allowance into v_allowance
  from public.subscriptions s
  join public.subscription_plans sp on sp.id = s.plan_id
  where s.user_id = p_user_id
    and s.status = 'active'
    and s.current_period_end > now()
  limit 1;

  if v_allowance is null then
    v_allowance := 5; -- free-tier default
  end if;

  insert into public.daily_allowance_state (user_id, grant_date, granted_amount)
  values (p_user_id, v_today, v_allowance)
  on conflict (user_id, grant_date) do nothing;

  v_inserted := found;

  if v_inserted then
    insert into public.credit_ledger (
      user_id, entry_type, amount, daily_component, purchased_component,
      reference_type, idempotency_key
    )
    values (
      p_user_id, 'daily_grant', v_allowance, v_allowance, 0,
      'daily_grant', 'daily_grant:' || p_user_id::text || ':' || v_today::text
    );
  end if;

  return query
  select
    das.granted_amount,
    v_inserted,
    coalesce((select sum(daily_component) from public.credit_ledger where user_id = p_user_id), 0)::int,
    coalesce((select sum(purchased_component) from public.credit_ledger where user_id = p_user_id), 0)::int
  from public.daily_allowance_state das
  where das.user_id = p_user_id and das.grant_date = v_today;
end;
$$;

grant execute on function public.grant_daily_allowance(uuid) to authenticated, service_role;

-- Spends credits: daily allowance first, then purchased credits. Idempotent
-- on p_idempotency_key — a retried/duplicate call with the same key returns
-- the original result instead of spending twice. Serialized per-user via an
-- advisory transaction lock so concurrent requests can't double-spend the
-- same balance.
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text
)
returns table (
  spent integer,
  daily_spent integer,
  purchased_spent integer,
  daily_balance integer,
  purchased_balance integer,
  already_processed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_daily_balance integer;
  v_purchased_balance integer;
  v_daily_spend integer;
  v_purchased_spend integer;
  v_existing record;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not_authorized';
  end if;

  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select cl.amount, cl.daily_component, cl.purchased_component
    into v_existing
    from public.credit_ledger cl
    where cl.idempotency_key = p_idempotency_key;

  if found then
    return query
    select
      -v_existing.amount,
      -v_existing.daily_component,
      -v_existing.purchased_component,
      coalesce((select sum(daily_component) from public.credit_ledger where user_id = p_user_id), 0)::int,
      coalesce((select sum(purchased_component) from public.credit_ledger where user_id = p_user_id), 0)::int,
      true;
    return;
  end if;

  select
    coalesce(sum(daily_component), 0),
    coalesce(sum(purchased_component), 0)
    into v_daily_balance, v_purchased_balance
    from public.credit_ledger
    where user_id = p_user_id;

  if v_daily_balance + v_purchased_balance < p_amount then
    raise exception 'insufficient_credits';
  end if;

  v_daily_spend := least(p_amount, greatest(v_daily_balance, 0));
  v_purchased_spend := p_amount - v_daily_spend;

  insert into public.credit_ledger (
    user_id, entry_type, amount, daily_component, purchased_component,
    reference_type, reference_id, idempotency_key
  )
  values (
    p_user_id, 'spend', -p_amount, -v_daily_spend, -v_purchased_spend,
    p_reference_type, p_reference_id, p_idempotency_key
  );

  return query
  select
    p_amount,
    v_daily_spend,
    v_purchased_spend,
    v_daily_balance - v_daily_spend,
    v_purchased_balance - v_purchased_spend,
    false;
end;
$$;

grant execute on function public.spend_credits(uuid, integer, text, uuid, text) to authenticated, service_role;

-- Grants purchased credits after a payment has been verified server-side.
-- Idempotent on p_idempotency_key (the payment's provider reference), so a
-- duplicate webhook delivery never double-grants.
create or replace function public.grant_purchased_credits(
  p_user_id uuid,
  p_amount integer,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text
)
returns table (granted integer, already_processed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing boolean;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not_authorized';
  end if;

  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select true into v_existing from public.credit_ledger where idempotency_key = p_idempotency_key;

  if found then
    return query select p_amount, true;
    return;
  end if;

  insert into public.credit_ledger (
    user_id, entry_type, amount, daily_component, purchased_component,
    reference_type, reference_id, idempotency_key
  )
  values (
    p_user_id, 'purchase', p_amount, 0, p_amount,
    p_reference_type, p_reference_id, p_idempotency_key
  );

  return query select p_amount, false;
end;
$$;

grant execute on function public.grant_purchased_credits(uuid, integer, text, uuid, text) to authenticated, service_role;
