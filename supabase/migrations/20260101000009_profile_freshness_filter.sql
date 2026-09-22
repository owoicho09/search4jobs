-- Optional freshness filter, called out explicitly under Job Preferences in
-- the product brief. Nullable = "no filter".
alter table public.profiles
  add column max_days_old integer check (max_days_old is null or max_days_old > 0);
