"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/jobs", label: "Find Jobs" },
  { href: "/dashboard/matches", label: "My Matches" },
  { href: "/dashboard/saved", label: "Saved Jobs" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/preferences", label: "Preferences" },
  { href: "/dashboard/cv", label: "CV" },
  { href: "/dashboard/telegram", label: "Telegram" },
  { href: "/dashboard/credits", label: "Credits & Plans" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 sm:w-56 sm:flex-col sm:border-b-0 sm:border-r sm:px-3 sm:py-4">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
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
