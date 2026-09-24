import "server-only";

import { requireAdminUser } from "@/lib/auth/dal";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Functions = Database["public"]["Functions"];
export type AdminUserRow = Functions["admin_user_stats"]["Returns"][number];
export type AdminTotals = Functions["admin_totals"]["Returns"][number];
export type AdminDailyActivity = Functions["admin_daily_activity"]["Returns"][number];
export type AdminRecentSearch = Functions["admin_recent_searches"]["Returns"][number];

export const USER_FILTERS = [
  { value: "all", label: "All users" },
  { value: "active_7d", label: "Active (7d)" },
  { value: "inactive_30d", label: "Inactive (30d+)" },
  { value: "onboarded", label: "Onboarded" },
  { value: "not_onboarded", label: "Not onboarded" },
  { value: "telegram_connected", label: "Telegram connected" },
  { value: "telegram_none", label: "No Telegram" },
  { value: "paying", label: "Paying" },
] as const;

export type UserFilter = (typeof USER_FILTERS)[number]["value"] | "telegram_any";

export const USERS_PAGE_SIZE = 50;

/** A connected bot counts as "active" if Telegram delivered an update in this window. */
export const BOT_ACTIVE_WINDOW_DAYS = 7;

// Every function below re-checks admin access itself: they use the
// service-role client (bypasses RLS), so they must never be reachable by a
// non-admin even if a future page forgets its own guard.

export async function getAdminOverview() {
  await requireAdminUser();
  const supabase = createSupabaseServiceRoleClient();

  const [totalsRes, dailyRes, recentSearchesRes, recentUsersRes] = await Promise.all([
    supabase.rpc("admin_totals"),
    supabase.rpc("admin_daily_activity", { p_days: 30 }),
    supabase.rpc("admin_recent_searches", { p_limit: 10 }),
    supabase.rpc("admin_user_stats", {}).range(0, 7),
  ]);

  const error = totalsRes.error ?? dailyRes.error ?? recentSearchesRes.error ?? recentUsersRes.error;
  if (error) throw new Error(`Admin overview query failed: ${error.message}`);

  return {
    totals: totalsRes.data?.[0] ?? null,
    daily: dailyRes.data ?? [],
    recentSearches: recentSearchesRes.data ?? [],
    recentUsers: recentUsersRes.data ?? [],
  };
}

export async function getAdminUsers({
  search,
  filter,
  page,
}: {
  search?: string;
  filter?: UserFilter;
  page: number;
}) {
  await requireAdminUser();
  const supabase = createSupabaseServiceRoleClient();

  const from = (page - 1) * USERS_PAGE_SIZE;
  const { data, error, count } = await supabase
    .rpc("admin_user_stats", { p_search: search || null, p_filter: filter ?? "all" }, { count: "exact" })
    .range(from, from + USERS_PAGE_SIZE - 1);

  // PGRST103 = page past the end (e.g. a stale ?page= link) — show it as empty.
  if (error && error.code !== "PGRST103") throw new Error(`Admin users query failed: ${error.message}`);
  return { users: data ?? [], total: count ?? 0 };
}

export async function getAdminUserDetail(userId: string) {
  await requireAdminUser();
  const supabase = createSupabaseServiceRoleClient();

  const [statsRes, searchesRes, savedRes, paymentsRes, ledgerRes] = await Promise.all([
    supabase.rpc("admin_user_stats", { p_user_id: userId }),
    supabase
      .from("searches")
      .select("id, source, status, requested_count, delivered_count, error_message, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("saved_jobs")
      .select("id, title, company, listing_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("payment_transactions")
      .select("id, amount_kobo, credits, status, provider_reference, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.rpc("get_credit_balance", { p_user_id: userId }),
  ]);

  if (statsRes.error) throw new Error(`Admin user query failed: ${statsRes.error.message}`);

  return {
    user: statsRes.data?.[0] ?? null,
    searches: searchesRes.data ?? [],
    savedJobs: savedRes.data ?? [],
    payments: paymentsRes.data ?? [],
    balance: ledgerRes.data?.[0] ?? null,
  };
}

export async function getAdminTelegramBots() {
  await requireAdminUser();
  const supabase = createSupabaseServiceRoleClient();

  const [botsRes, totalsRes] = await Promise.all([
    supabase.rpc("admin_user_stats", { p_filter: "telegram_any" }),
    supabase.rpc("admin_totals"),
  ]);

  const error = botsRes.error ?? totalsRes.error;
  if (error) throw new Error(`Admin Telegram query failed: ${error.message}`);

  return { bots: botsRes.data ?? [], totals: totalsRes.data?.[0] ?? null };
}

/** Connected + recent traffic → active; connected but quiet → idle; else its raw status. */
export function botActivity(row: Pick<AdminUserRow, "bot_status" | "bot_last_update_at">) {
  if (!row.bot_status) return "none" as const;
  if (row.bot_status !== "connected") return row.bot_status;
  const cutoff = Date.now() - BOT_ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return row.bot_last_update_at && new Date(row.bot_last_update_at).getTime() > cutoff
    ? ("active" as const)
    : ("idle" as const);
}
