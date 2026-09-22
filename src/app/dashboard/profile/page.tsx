import { Card, CardHeading } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/app/dashboard/profile/profile-form";

export default async function ProfilePage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, headline, summary, skills, experience_level, years_experience")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Professional profile</h1>
      <Card>
        <CardHeading>Tell us about yourself</CardHeading>
        <p className="mb-4 mt-1 text-sm text-muted">
          A complete profile improves job matching, but you can search without one.
        </p>
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
      </Card>
    </div>
  );
}
