import Link from "next/link";

import { Card } from "@/components/ui/card";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="text-lg font-semibold">
            search4jobs
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Sign in</h1>
        </div>
        <Card>
          {params.error === "confirmation_failed" && (
            <p className="mb-4 text-sm text-danger">
              That confirmation link didn&apos;t work. Please sign in or sign up again.
            </p>
          )}
          <LoginForm next={params.next} />
        </Card>
      </div>
    </div>
  );
}
