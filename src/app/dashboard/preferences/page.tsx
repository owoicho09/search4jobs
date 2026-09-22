import { Card, CardHeading } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PreferencesForm } from "@/app/dashboard/preferences/preferences-form";

export default async function PreferencesPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "preferred_titles, preferred_country, preferred_location, work_arrangement, employment_types, salary_min, salary_max, max_days_old"
    )
    .eq("user_id", user.id)
    .single();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Job preferences</h1>
      <Card>
        <CardHeading>What kind of job are you looking for?</CardHeading>
        <p className="mb-4 mt-1 text-sm text-muted">
          These preferences drive both dashboard and Telegram job searches.
        </p>
        <PreferencesForm
          defaults={{
            preferredTitles: profile?.preferred_titles ?? [],
            preferredCountry: profile?.preferred_country ?? null,
            preferredLocation: profile?.preferred_location ?? "",
            workArrangement: profile?.work_arrangement ?? "any",
            employmentTypes: profile?.employment_types ?? [],
            salaryMin: profile?.salary_min ?? null,
            salaryMax: profile?.salary_max ?? null,
            maxDaysOld: profile?.max_days_old ?? null,
          }}
        />
      </Card>
    </div>
  );
}
