import Link from "next/link";

import { BotStatusPill, formatDate, formatNaira, Table, Td, Th, timeAgo } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { botActivity, getAdminUsers, USER_FILTERS, USERS_PAGE_SIZE, type UserFilter } from "@/lib/admin/queries";
import { cn } from "@/lib/utils/cn";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = first(params.q)?.trim() ?? "";
  const rawFilter = first(params.filter);
  const filter: UserFilter = USER_FILTERS.some((f) => f.value === rawFilter) ? (rawFilter as UserFilter) : "all";
  const page = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

  const { users, total } = await getAdminUsers({ search: q, filter, page });
  const pageCount = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));

  const hrefWith = (overrides: Record<string, string | number>) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (filter !== "all") next.set("filter", filter);
    for (const [key, value] of Object.entries(overrides)) next.set(key, String(value));
    if (next.get("filter") === "all") next.delete("filter");
    if (next.get("page") === "1") next.delete("page");
    const qs = next.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted">{total.toLocaleString()} matching</p>
        </div>
        <form action="/admin/users" className="flex gap-2">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search email, name, bot…"
            className="w-56 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {USER_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={hrefWith({ filter: f.value, page: 1 })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              filter === f.value
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {users.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search or filter." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Joined</Th>
              <Th>Last seen</Th>
              <Th>Setup</Th>
              <Th>Telegram</Th>
              <Th className="text-right">Searches</Th>
              <Th className="text-right">Delivered</Th>
              <Th className="text-right">Saved</Th>
              <Th className="text-right">Paid</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                <Td className="max-w-64">
                  <Link href={`/admin/users/${u.user_id}`} className="block truncate font-medium hover:underline">
                    {u.email}
                  </Link>
                  <span className="block truncate text-xs text-muted">
                    {u.full_name ?? "No name"}
                    {!u.email_confirmed && " · unverified"}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(u.created_at)}</Td>
                <Td className="whitespace-nowrap text-muted">{timeAgo(u.last_seen_at)}</Td>
                <Td className="whitespace-nowrap text-xs text-muted">
                  {u.onboarding_completed ? "Onboarded" : "Not onboarded"}
                  {u.has_cv && " · CV"}
                </Td>
                <Td>
                  <BotStatusPill activity={botActivity(u)} />
                  {u.bot_username && <span className="block text-xs text-muted">@{u.bot_username}</span>}
                </Td>
                <Td className="text-right tabular-nums">
                  {u.searches_count}
                  {u.telegram_searches_count > 0 && (
                    <span className="block text-xs text-muted">{u.telegram_searches_count} via TG</span>
                  )}
                </Td>
                <Td className="text-right tabular-nums">{u.matches_count}</Td>
                <Td className="text-right tabular-nums">{u.saved_jobs_count}</Td>
                <Td className="text-right whitespace-nowrap tabular-nums">
                  {u.paid_kobo > 0 ? formatNaira(u.paid_kobo) : <span className="text-muted">—</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={hrefWith({ page: page - 1 })}>
                <Button variant="secondary">Previous</Button>
              </Link>
            )}
            {page < pageCount && (
              <Link href={hrefWith({ page: page + 1 })}>
                <Button variant="secondary">Next</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
