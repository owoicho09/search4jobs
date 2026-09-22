import { Badge, EmptyState } from "@/components/ui/feedback";
import { Card, CardHeading } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/dal";
import { ensureDailyAllowanceAndGetBalance } from "@/lib/credits/service";
import { paystackProvider } from "@/lib/billing/paystack";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BuyPackForm } from "@/app/dashboard/credits/buy-pack-form";

export default async function CreditsPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const [balance, packsRes, plansRes, subscriptionRes, ledgerRes, transactionsRes] = await Promise.all([
    ensureDailyAllowanceAndGetBalance(supabase, user.id),
    supabase.from("credit_packs").select("code, name, price_kobo, credits").eq("active", true).order("sort_order"),
    supabase.from("subscription_plans").select("code, name, price_kobo, billing_interval, daily_allowance").eq("active", true),
    supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("credit_ledger")
      .select("entry_type, amount, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("payment_transactions")
      .select("id, status, amount_kobo, credits, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const packs = packsRes.data ?? [];
  const plans = plansRes.data ?? [];
  const subscription = subscriptionRes.data;
  const ledger = ledgerRes.data ?? [];
  const transactions = transactionsRes.data ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Credits &amp; plans</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Daily allowance</p>
          <p className="mt-1 text-2xl font-semibold">{balance.dailyBalance}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Purchased</p>
          <p className="mt-1 text-2xl font-semibold">{balance.purchasedBalance}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Subscription</p>
          <p className="mt-1 text-2xl font-semibold capitalize">{subscription?.status ?? "None"}</p>
        </Card>
      </div>

      <Card>
        <CardHeading>Buy credits</CardHeading>
        <div className="mt-4">
          <BuyPackForm
            packs={packs.map((p) => ({ code: p.code, name: p.name, priceKobo: p.price_kobo, credits: p.credits }))}
            billingConfigured={paystackProvider.isConfigured()}
          />
        </div>
      </Card>

      <Card>
        <CardHeading>Subscription plans</CardHeading>
        {plans.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No subscription plans are configured yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {plans.map((p) => (
              <li key={p.code} className="flex justify-between">
                <span>
                  {p.name} — {p.daily_allowance}/day
                </span>
                <span>
                  ₦{(p.price_kobo / 100).toLocaleString()}/{p.billing_interval}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeading>Usage history</CardHeading>
        {ledger.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {ledger.map((entry, i) => (
              <li key={i} className="flex justify-between py-2">
                <span className="capitalize">{entry.entry_type.replace("_", " ")}</span>
                <span className={entry.amount < 0 ? "text-danger" : "text-success"}>
                  {entry.amount > 0 ? "+" : ""}
                  {entry.amount}
                </span>
                <span className="text-muted">{new Date(entry.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeading>Purchase history</CardHeading>
        {transactions.length === 0 ? (
          <EmptyState title="No purchases yet" />
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex justify-between py-2">
                <span>
                  {tx.credits} credits — ₦{(tx.amount_kobo / 100).toLocaleString()}
                </span>
                <Badge>{tx.status}</Badge>
                <span className="text-muted">{new Date(tx.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
