"use server";

import { revalidatePath } from "next/cache";

import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PreferencesSchema, ProfileSchema } from "@/lib/validation/profile";

export interface ProfileFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

function splitList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireAuthUser();

  const parsed = ProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    headline: formData.get("headline"),
    summary: formData.get("summary"),
    skills: splitList(formData.get("skills")),
    experienceLevel: formData.get("experienceLevel") || undefined,
    yearsExperience: formData.get("yearsExperience") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName || null,
      headline: parsed.data.headline || null,
      summary: parsed.data.summary || null,
      skills: parsed.data.skills,
      experience_level: parsed.data.experienceLevel ?? null,
      years_experience: parsed.data.yearsExperience ?? null,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updatePreferencesAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireAuthUser();

  const parsed = PreferencesSchema.safeParse({
    preferredTitles: splitList(formData.get("preferredTitles")),
    preferredCountry: formData.get("preferredCountry") || undefined,
    preferredLocation: formData.get("preferredLocation"),
    workArrangement: formData.get("workArrangement") || "any",
    employmentTypes: formData.getAll("employmentTypes"),
    salaryMin: formData.get("salaryMin") || undefined,
    salaryMax: formData.get("salaryMax") || undefined,
    maxDaysOld: formData.get("maxDaysOld") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_titles: parsed.data.preferredTitles,
      preferred_country: parsed.data.preferredCountry ?? null,
      preferred_location: parsed.data.preferredLocation || null,
      work_arrangement: parsed.data.workArrangement,
      employment_types: parsed.data.employmentTypes,
      salary_min: parsed.data.salaryMin ?? null,
      salary_max: parsed.data.salaryMax ?? null,
      max_days_old: parsed.data.maxDaysOld ?? null,
      onboarding_completed: true,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: "Could not save your preferences. Please try again." };
  }

  revalidatePath("/dashboard/preferences");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  return { success: true };
}
