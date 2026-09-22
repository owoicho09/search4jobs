import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth/dal";

export default async function Home() {
  const user = await getAuthUser();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold">search4jobs</span>
        <nav className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium">
                Sign in
              </Link>
              <Link href="/signup">
                <Button>Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          AI-matched job search, on the web and in Telegram
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Set up your profile once, and search real job listings matched to your skills and
          preferences — from the dashboard or your own Telegram bot, sharing the same account,
          credits, and history.
        </p>
        <div className="flex gap-3">
          <Link href="/signup">
            <Button>Create your account</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          <Card>
            <CardHeading>Real listings, ranked for you</CardHeading>
            <p className="mt-2 text-sm text-muted">
              Job listings come from Adzuna and are scored for relevance to your profile — never
              fabricated.
            </p>
          </Card>
          <Card>
            <CardHeading>Your own Telegram bot</CardHeading>
            <p className="mt-2 text-sm text-muted">
              Connect a bot you create with BotFather to search and manage matches from Telegram.
            </p>
          </Card>
          <Card>
            <CardHeading>Free daily credits</CardHeading>
            <p className="mt-2 text-sm text-muted">
              5 free credits every day, or top up with a credit pack when you need more.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
