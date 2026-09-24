"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/telegram", label: "Telegram bots" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 sm:w-56 sm:flex-col sm:border-b-0 sm:border-r sm:px-3 sm:py-4">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
              active ? "bg-brand text-brand-foreground" : "hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
