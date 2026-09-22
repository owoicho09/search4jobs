import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type AlertVariant = "info" | "danger" | "success";

const ALERT_CLASSES: Record<AlertVariant, string> = {
  info: "border-border bg-black/5 dark:bg-white/5",
  danger: "border-danger/30 bg-danger-bg text-danger",
  success: "border-success/30 bg-success-bg text-success",
};

export function Alert({
  variant = "info",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm", ALERT_CLASSES[variant], className)}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-black/5 px-2.5 py-0.5 text-xs font-medium dark:bg-white/5",
        className
      )}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
