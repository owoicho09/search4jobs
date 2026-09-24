import Link from "next/link";

import {
  BotStatusPill,
  DailyBars,
  formatNaira,
  SearchStatusPill,
  StatTile,
  timeAgo,
} from "@/components/admin/ui";
import { Card, CardHeading } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { botActivity, getAdminOverview } from "@/lib/admin/queries";

function pct(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

export default async function AdminOverviewPage() {
  const { totals: t, daily, recentSearches, recentUsers } = await getAdminOverview();

  if (!t) {
    return <EmptyState title="No metrics available" description="The admin_totals function returned no rows." />;
  }

  const searchSuccess7d = t.searches_7d - t.searches_failed_7d - t.searches_no_matches_7d;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Admin overview</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Users</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Total users" value={t.total_users.toLocaleString()} href="/admin/users" />
          <StatTile
            label="New signups (7d)"
            value={t.new_users_7d.toLocaleString()}
            hint={`${t.new_users_30d.toLocaleString()} in the last 30 days`}
          />
          <StatTile
            label="Active users (7d)"
            value={t.active_users_7d.toLocaleString()}
            hint={`${t.active_users_30d.toLocaleString()} active in 30d · ${pct(t.active_users_7d, t.total_users)} of users`}
            href="/admin/users?filter=active_7d"
          />
          <StatTile
            label="Onboarded"
            value={pct(t.onboarded_users, t.total_users)}
            hint={`${t.onboarded_users.toLocaleString()} users · ${t.users_with_cv.toLocaleString()} uploaded a CV`}
            href="/admin/users?filter=not_onboarded"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Telegram bots</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Bots connected"
            value={t.bots_connected.toLocaleString()}
            hint={`${pct(t.bots_total, t.total_users)} of users have linked a bot`}
            href="/admin/telegram"
          />
          <StatTile
            label="Active bots (7d)"
            value={t.bots_active_7d.toLocaleString()}
            hint={`${(t.bots_connected - t.bots_active_7d).toLocaleString()} connected but idle`}
          />
          <StatTile
            label="Pending / error / disconnected"
            value={`${t.bots_pending} / ${t.bots_error} / ${t.bots_disconnected}`}
            hint="Bots that need attention"
            href="/admin/telegram"
          />
          <StatTile label="Bot messages (7d)" value={t.telegram_updates_7d.toLocaleString()} hint="Telegram updates received" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Interactions & revenue</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Searches (7d)"
            value={t.searches_7d.toLocaleString()}
            hint={`${t.searches_dashboard_7d} dashboard · ${t.searches_telegram_7d} Telegram · ${t.searches_total.toLocaleString()} all-time`}
          />
          <StatTile
            label="Search success (7d)"
            value={pct(searchSuccess7d, t.searches_7d)}
            hint={`${t.searches_no_matches_7d} no matches · ${t.searches_failed_7d} failed`}
          />
          <StatTile
            label="Jobs delivered (7d)"
            value={t.matches_7d.toLocaleString()}
            hint={`${t.matches_total.toLocaleString()} all-time · ${t.saved_jobs_total.toLocaleString()} saved`}
          />
          <StatTile
            label="Revenue (30d)"
            value={formatNaira(t.revenue_kobo_30d)}
            hint={`${formatNaira(t.revenue_kobo)} all-time · ${t.successful_payments} payments · ${t.active_subscriptions} active subs`}
            href="/admin/users?filter=paying"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyBars title="Signups per day" data={daily.map((d) => ({ day: d.day, value: d.signups }))} />
        <DailyBars title="Searches per day" data={daily.map((d) => ({ day: d.day, value: d.searches }))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <CardHeading>Latest signups</CardHeading>
            <Link href="/admin/users" className="text-sm font-medium text-brand">
              All users
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No users yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {recentUsers.map((u) => (
                <li key={u.user_id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/admin/users/${u.user_id}`} className="min-w-0 truncate hover:underline">
                    {u.email}
                    {u.full_name && <span className="text-muted"> · {u.full_name}</span>}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {!u.onboarding_completed && <Badge>not onboarded</Badge>}
                    <BotStatusPill activity={botActivity(u)} />
                    <span className="w-16 text-right text-xs text-muted">{timeAgo(u.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeading>Latest searches</CardHeading>
          {recentSearches.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No searches yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {recentSearches.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/admin/users/${s.user_id}`} className="min-w-0 truncate hover:underline">
                    {s.email}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{s.source}</Badge>
                    <span className="text-xs text-muted tabular-nums">
                      {s.delivered_count}/{s.requested_count}
                    </span>
                    <SearchStatusPill status={s.status} />
                    <span className="w-16 text-right text-xs text-muted">{timeAgo(s.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
