import Link from "next/link";

import { DashboardNav } from "@/components/dashboard/nav";
import { Button } from "@/components/ui/button";
import { isAdminUser, requireAuthUser } from "@/lib/auth/dal";
import { signOutAction } from "@/lib/auth/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link href="/dashboard" className="font-semibold">
          search4jobs
        </Link>
        <div className="flex items-center gap-3 text-sm text-muted">
          {isAdminUser(user) && (
            <Link href="/admin" className="font-medium text-brand">
              Admin
            </Link>
          )}
          <span className="hidden sm:inline">{user.email}</span>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <div className="flex flex-col sm:flex-row">
        <DashboardNav />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
