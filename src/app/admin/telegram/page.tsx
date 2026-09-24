import Link from "next/link";

import { BotStatusPill, formatDate, StatTile, Table, Td, Th, timeAgo } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/feedback";
import { BOT_ACTIVE_WINDOW_DAYS, botActivity, getAdminTelegramBots } from "@/lib/admin/queries";

// Problems first, then live bots by most recent traffic.
const ACTIVITY_ORDER: Record<string, number> = { error: 0, pending: 1, idle: 2, active: 3, disconnected: 4 };

export default async function AdminTelegramPage() {
  const { bots, totals: t } = await getAdminTelegramBots();

  const rows = bots
    .map((bot) => ({ ...bot, activity: botActivity(bot) }))
    .sort(
      (a, b) =>
        (ACTIVITY_ORDER[a.activity] ?? 9) - (ACTIVITY_ORDER[b.activity] ?? 9) ||
        (b.bot_last_update_at ?? "").localeCompare(a.bot_last_update_at ?? "")
    );
  const idle = rows.filter((r) => r.activity === "idle").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Telegram bots</h1>
        <p className="text-sm text-muted">
          A connected bot is <strong>active</strong> if it received a message in the last {BOT_ACTIVE_WINDOW_DAYS} days,
          otherwise <strong>idle</strong>.
        </p>
      </div>

      {t && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatTile label="Active" value={t.bots_active_7d} />
          <StatTile label="Connected · idle" value={idle} />
          <StatTile label="Pending" value={t.bots_pending} hint="Webhook not registered" />
          <StatTile label="Error" value={t.bots_error} />
          <StatTile label="Disconnected" value={t.bots_disconnected} />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No bots yet" description="No user has connected a Telegram bot." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Bot</Th>
              <Th>Owner</Th>
              <Th>Status</Th>
              <Th>Connected</Th>
              <Th>Last message</Th>
              <Th className="text-right">Messages</Th>
              <Th className="text-right">TG searches</Th>
              <Th>Last error</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id}>
                <Td className="font-medium whitespace-nowrap">{r.bot_username ? `@${r.bot_username}` : "—"}</Td>
                <Td className="max-w-56">
                  <Link href={`/admin/users/${r.user_id}`} className="block truncate hover:underline">
                    {r.email}
                  </Link>
                </Td>
                <Td>
                  <BotStatusPill activity={r.activity} />
                </Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(r.bot_connected_at)}</Td>
                <Td className="whitespace-nowrap text-muted">{timeAgo(r.bot_last_update_at)}</Td>
                <Td className="text-right tabular-nums">{r.bot_updates_count}</Td>
                <Td className="text-right tabular-nums">{r.telegram_searches_count}</Td>
                <Td className="max-w-72 text-xs text-danger">
                  <span className="block truncate" title={r.bot_last_error ?? undefined}>
                    {r.bot_last_error}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
