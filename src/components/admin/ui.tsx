import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(value: string | null) {
  if (!value) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 60) return `${days}d ago`;
  return formatDate(value);
}

export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <Card className={cn("h-full p-4", href && "transition-colors hover:border-brand")}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

type Tone = "success" | "warning" | "danger" | "brand" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  success: "border-success/30 bg-success-bg text-success",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "border-danger/30 bg-danger-bg text-danger",
  brand: "border-brand/30 bg-brand/10 text-brand",
  muted: "border-border bg-black/5 text-muted dark:bg-white/5",
};

/** Always pairs the tone with a text label, so status is never color-only. */
export function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone]
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

const BOT_TONES: Record<string, { tone: Tone; label: string }> = {
  active: { tone: "success", label: "Active" },
  idle: { tone: "brand", label: "Connected · idle" },
  pending: { tone: "warning", label: "Pending" },
  error: { tone: "danger", label: "Error" },
  disconnected: { tone: "muted", label: "Disconnected" },
  none: { tone: "muted", label: "Not connected" },
};

export function BotStatusPill({ activity }: { activity: string }) {
  const { tone, label } = BOT_TONES[activity] ?? { tone: "muted" as const, label: activity };
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

const SEARCH_TONES: Record<string, Tone> = {
  completed: "success",
  no_matches: "warning",
  failed: "danger",
  pending: "muted",
};

export function SearchStatusPill({ status }: { status: string }) {
  return <StatusPill tone={SEARCH_TONES[status] ?? "muted"}>{status.replace("_", " ")}</StatusPill>;
}

/**
 * Single-series daily bar chart. Bars sit on a shared baseline with a 2px
 * gap; each bar has a hover/focus tooltip, and the total is in the heading.
 */
export function DailyBars({
  title,
  data,
}: {
  title: string;
  data: { day: string; value: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const label = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground tabular-nums">{total.toLocaleString()}</span> in{" "}
          {data.length} days
        </p>
      </div>
      <div className="relative mt-4">
        <div aria-hidden className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <span aria-hidden className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-muted tabular-nums">
          {max}
        </span>
        <ul className="flex h-32 items-end gap-[2px] border-b border-border" aria-label={title}>
          {data.map((d) => (
            <li key={d.day} className="group relative flex h-full flex-1 items-end" tabIndex={0}>
              <span
                className="w-full rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80"
                style={{ height: d.value === 0 ? 0 : `max(${(d.value / max) * 100}%, 2px)` }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-sm group-hover:block group-focus:block">
                <span className="text-muted">{label(d.day)}</span>{" "}
                <span className="font-semibold tabular-nums">{d.value}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>{data[0] && label(data[0].day)}</span>
          <span>{data.at(-1) && label(data.at(-1)!.day)}</span>
        </div>
      </div>
    </Card>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-border px-3 py-2 text-xs font-medium whitespace-nowrap text-muted", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-border px-3 py-2 align-middle", className)}>{children}</td>;
}
