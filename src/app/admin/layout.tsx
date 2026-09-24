import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin/nav";
import { Badge } from "@/components/ui/feedback";
import { requireAdminUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Admin · search4jobs",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="font-semibold">
            search4jobs
          </Link>
          <Badge>Admin</Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="hidden sm:inline">{user.email}</span>
          <Link href="/dashboard" className="font-medium text-brand">
            Back to app
          </Link>
        </div>
      </header>
      <div className="flex flex-col sm:flex-row">
        <AdminNav />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
