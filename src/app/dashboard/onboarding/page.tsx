import Link from "next/link";

import { Card, CardHeading } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/app/dashboard/profile/profile-form";
import { PreferencesForm } from "@/app/dashboard/preferences/preferences-form";

export default async function OnboardingPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, headline, summary, skills, experience_level, years_experience, preferred_titles, preferred_country, preferred_location, work_arrangement, employment_types, salary_min, salary_max, max_days_old"
    )
    .eq("user_id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Set up your profile</h1>
        <p className="mt-1 text-sm text-muted">
          A couple of minutes now means better matches later — or{" "}
          <Link href="/dashboard" className="font-medium text-brand">
            skip for now
          </Link>
          .
        </p>
      </div>

      <Card>
        <CardHeading>About you</CardHeading>
        <div className="mt-4">
          <ProfileForm
            defaults={{
              fullName: profile?.full_name ?? "",
              headline: profile?.headline ?? "",
              summary: profile?.summary ?? "",
              skills: profile?.skills ?? [],
              experienceLevel: profile?.experience_level ?? null,
              yearsExperience: profile?.years_experience ?? null,
            }}
          />
        </div>
      </Card>

      <Card>
        <CardHeading>What you&apos;re looking for</CardHeading>
        <div className="mt-4">
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
        </div>
      </Card>

      <div className="text-center">
        <Link href="/dashboard" className="text-sm font-medium text-brand">
          Continue to dashboard →
        </Link>
      </div>
    </div>
  );
}
