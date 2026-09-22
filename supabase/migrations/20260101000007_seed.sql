-- Initial credit packs from the product brief (₦, stored in kobo).
insert into public.credit_packs (code, name, price_kobo, credits, sort_order)
values
  ('starter', 'Starter', 100000, 5, 1),
  ('standard', 'Standard', 300000, 20, 2),
  ('large', 'Large', 500000, 40, 3)
on conflict (code) do update set
  name = excluded.name,
  price_kobo = excluded.price_kobo,
  credits = excluded.credits,
  sort_order = excluded.sort_order;

-- Server-tunable search/matching knobs, read by the search orchestration
-- service so limits can change without a redeploy.
insert into public.app_config (key, value)
values
  ('search_quantity_options', '[3, 5, 10]'),
  ('candidate_fetch_limit', '40'),
  ('ai_evaluation_limit', '25'),
  ('relevance_threshold', '0.6')
on conflict (key) do nothing;

-- No subscription plans are seeded: the brief says pricing/allowances are not
-- finalized. Admins add rows to subscription_plans when ready; until then the
-- app correctly shows "no plans configured" rather than inventing one.
