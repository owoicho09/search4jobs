import Link from "next/link";

import { Badge } from "@/components/ui/feedback";
import { Card, CardHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAuthUser } from "@/lib/auth/dal";
import { ensureDailyAllowanceAndGetBalance } from "@/lib/credits/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OverviewPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const [balance, profileRes, telegramRes, searchesRes, matchesRes, subscriptionRes] = await Promise.all([
    ensureDailyAllowanceAndGetBalance(supabase, user.id),
    supabase.from("profiles").select("onboarding_completed, preferred_country").eq("user_id", user.id).single(),
    supabase.from("telegram_bots").select("status, bot_username").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("searches")
      .select("id, status, requested_count, delivered_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("matches")
      .select("id, title, company, delivered_at")
      .eq("user_id", user.id)
      .order("delivered_at", { ascending: false })
      .limit(5),
    supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).maybeSingle(),
  ]);

  const profile = profileRes.data;
  const telegram = telegramRes.data;
  const searches = searchesRes.data ?? [];
  const matches = matchesRes.data ?? [];
  const subscription = subscriptionRes.data;

  const nextSteps: { label: string; href: string }[] = [];
  if (!profile?.onboarding_completed) nextSteps.push({ label: "Finish onboarding", href: "/dashboard/onboarding" });
  if (!profile?.preferred_country) nextSteps.push({ label: "Set your job preferences", href: "/dashboard/preferences" });
  if (!telegram) nextSteps.push({ label: "Connect your Telegram bot", href: "/dashboard/telegram" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      {nextSteps.length > 0 && (
        <Card>
          <CardHeading>Next steps</CardHeading>
          <ul className="mt-3 flex flex-wrap gap-2">
            {nextSteps.map((step) => (
              <li key={step.href}>
                <Link href={step.href}>
                  <Button variant="secondary">{step.label}</Button>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Daily allowance remaining</p>
          <p className="mt-1 text-2xl font-semibold">{balance.dailyBalance}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Purchased credits</p>
          <p className="mt-1 text-2xl font-semibold">{balance.purchasedBalance}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Subscription</p>
          <p className="mt-1 text-2xl font-semibold capitalize">{subscription?.status ?? "None"}</p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeading>Recent searches</CardHeading>
          {searches.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No searches yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {searches.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>
                    {s.delivered_count}/{s.requested_count} jobs
                  </span>
                  <Badge>{s.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeading>Recent matches</CardHeading>
          {matches.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No matches yet — run a search to see results here.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {matches.map((m) => (
                <li key={m.id}>
                  {m.title} {m.company && `— ${m.company}`}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeading>Telegram</CardHeading>
        <p className="mt-2 text-sm text-muted">
          {telegram
            ? `Connected as @${telegram.bot_username ?? "unknown"} (${telegram.status})`
            : "Not connected yet."}
        </p>
      </Card>
    </div>
  );
}
