import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BotStatusPill,
  formatDateTime,
  formatNaira,
  SearchStatusPill,
  StatTile,
  StatusPill,
  Table,
  Td,
  Th,
  timeAgo,
} from "@/components/admin/ui";
import { Card, CardHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/feedback";
import { botActivity, getAdminUserDetail } from "@/lib/admin/queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { user: u, searches, savedJobs, payments, balance } = await getAdminUserDetail(id);
  if (!u) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-muted hover:underline">
          ← Users
        </Link>
        <h1 className="mt-1 text-2xl font-semibold break-all">{u.email}</h1>
        <p className="text-sm text-muted">
          {u.full_name ?? "No name"} · joined {formatDateTime(u.created_at)} · last seen {timeAgo(u.last_seen_at)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Searches"
          value={u.searches_count}
          hint={`${u.telegram_searches_count} via Telegram · ${u.failed_searches_count} failed`}
        />
        <StatTile label="Jobs delivered" value={u.matches_count} hint={`${u.saved_jobs_count} saved`} />
        <StatTile
          label="Credits"
          value={balance ? balance.daily_balance + balance.purchased_balance : "—"}
          hint={balance ? `${balance.daily_balance} daily · ${balance.purchased_balance} purchased` : undefined}
        />
        <StatTile
          label="Total paid"
          value={formatNaira(u.paid_kobo)}
          hint={`Subscription: ${u.subscription_status ?? "none"}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeading>Account</CardHeading>
          <dl className="mt-2 divide-y divide-border text-sm">
            <Row label="User ID">
              <code className="text-xs">{u.user_id}</code>
            </Row>
            <Row label="Email verified">
              {u.email_confirmed ? (
                <StatusPill tone="success">Verified</StatusPill>
              ) : (
                <StatusPill tone="warning">Unverified</StatusPill>
              )}
            </Row>
            <Row label="Onboarding">{u.onboarding_completed ? "Completed" : "Not completed"}</Row>
            <Row label="CV uploaded">{u.has_cv ? "Yes" : "No"}</Row>
            <Row label="Preferred country">{u.preferred_country?.toUpperCase() ?? "—"}</Row>
            <Row label="Last sign-in">{formatDateTime(u.last_sign_in_at)}</Row>
            <Row label="Last search">{formatDateTime(u.last_search_at)}</Row>
          </dl>
        </Card>

        <Card>
          <CardHeading>Telegram bot</CardHeading>
          <dl className="mt-2 divide-y divide-border text-sm">
            <Row label="Status">
              <BotStatusPill activity={botActivity(u)} />
            </Row>
            <Row label="Bot">{u.bot_username ? `@${u.bot_username}` : "—"}</Row>
            <Row label="Connected">{formatDateTime(u.bot_connected_at)}</Row>
            <Row label="Webhook registered">{formatDateTime(u.bot_webhook_registered_at)}</Row>
            <Row label="Last message">{formatDateTime(u.bot_last_update_at)}</Row>
            <Row label="Messages received">{u.bot_updates_count.toLocaleString()}</Row>
          </dl>
          {u.bot_last_error && <p className="mt-3 text-sm break-words text-danger">{u.bot_last_error}</p>}
        </Card>
      </div>

      <section className="space-y-3">
        <CardHeading>Recent searches</CardHeading>
        {searches.length === 0 ? (
          <p className="text-sm text-muted">No searches yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Source</Th>
                <Th>Status</Th>
                <Th className="text-right">Delivered</Th>
                <Th>Error</Th>
              </tr>
            </thead>
            <tbody>
              {searches.map((s) => (
                <tr key={s.id}>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(s.created_at)}</Td>
                  <Td>
                    <Badge>{s.source}</Badge>
                  </Td>
                  <Td>
                    <SearchStatusPill status={s.status} />
                  </Td>
                  <Td className="text-right tabular-nums">
                    {s.delivered_count}/{s.requested_count}
                  </Td>
                  <Td className="max-w-80 truncate text-xs text-danger">{s.error_message}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeading>Saved jobs</CardHeading>
          {savedJobs.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None saved.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {savedJobs.map((j) => (
                <li key={j.id} className="flex justify-between gap-3">
                  <a href={j.listing_url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate hover:underline">
                    {j.title}
                    {j.company && <span className="text-muted"> — {j.company}</span>}
                  </a>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(j.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeading>Payments</CardHeading>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No payments.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span>
                    {formatNaira(p.amount_kobo)} <span className="text-muted">· {p.credits} credits</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusPill
                      tone={p.status === "success" ? "success" : p.status === "pending" ? "muted" : "danger"}
                    >
                      {p.status}
                    </StatusPill>
                    <span className="text-xs text-muted">{timeAgo(p.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
