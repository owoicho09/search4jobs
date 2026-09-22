-- Serverless-safe rate limiting: counters live in Postgres (not in-memory),
-- so limits hold across concurrent/parallel function instances.
create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  subject text not null, -- e.g. "user:<uuid>" or "ip:<addr>"
  bucket text not null, -- e.g. "job_search", "telegram_connect"
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx
  on public.rate_limit_events (subject, bucket, created_at desc);

alter table public.rate_limit_events enable row level security;
-- Server-only table; no policies for authenticated/anon.

-- Records one attempt and reports whether the caller is within limit.
-- Sliding window: counts events for (subject, bucket) in the last
-- p_window_seconds. Always records the attempt (including ones that exceed
-- the limit) so abuse remains visible in the counts.
create or replace function public.check_rate_limit(
  p_subject text,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.rate_limit_events
  where bucket = p_bucket
    and created_at < now() - make_interval(secs => p_window_seconds * 4);

  select count(*) into v_count
  from public.rate_limit_events
  where subject = p_subject
    and bucket = p_bucket
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return query select false, 0;
    return;
  end if;

  insert into public.rate_limit_events (subject, bucket) values (p_subject, p_bucket);

  return query select true, greatest(p_limit - v_count - 1, 0);
end;
$$;

grant execute on function public.check_rate_limit(text, text, integer, integer) to authenticated, service_role, anon;
