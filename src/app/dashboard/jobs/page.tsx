import Link from "next/link";

import { Alert } from "@/components/ui/feedback";
import { Card, CardHeading } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/dal";
import { getAppTunables } from "@/lib/config/app-config";
import { ensureDailyAllowanceAndGetBalance } from "@/lib/credits/service";
import { isSupportedAdzunaCountry } from "@/lib/adzuna/countries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { JobsSearchForm } from "@/app/dashboard/jobs/jobs-search-form";

export default async function FindJobsPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const [balance, tunables, profileRes] = await Promise.all([
    ensureDailyAllowanceAndGetBalance(supabase, user.id),
    getAppTunables(),
    supabase.from("profiles").select("preferred_country").eq("user_id", user.id).single(),
  ]);

  const preferredCountry = profileRes.data?.preferred_country ?? null;
  const affordable = tunables.searchQuantityOptions.filter((q) => q <= balance.total);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Find jobs</h1>
        <p className="mt-1 text-sm text-muted">
          Searches use your saved preferences. You have {balance.total} credit(s) available (
          {balance.dailyBalance} daily + {balance.purchasedBalance} purchased). One credit is used per job
          delivered — nothing is charged for jobs that aren&apos;t.
        </p>
      </div>

      {!isSupportedAdzunaCountry(preferredCountry) && (
        <Alert variant="info">
          Set a supported country in{" "}
          <Link href="/dashboard/preferences" className="font-medium underline">
            Job Preferences
          </Link>{" "}
          before searching.
        </Alert>
      )}

      <Card>
        <CardHeading>Run a search</CardHeading>
        <div className="mt-4">
          <JobsSearchForm affordableQuantities={affordable} />
        </div>
      </Card>
    </div>
  );
}
