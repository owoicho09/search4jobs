"use server";

import { revalidatePath } from "next/cache";

import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export interface SaveJobInput {
  provider: string;
  providerJobId: string;
  title: string;
  company: string | null;
  location: string | null;
  listingUrl: string;
  salaryMin: number | null;
  salaryMax: number | null;
  postedAt: string | null;
}

export async function saveJobAction(job: SaveJobInput): Promise<{ error?: string }> {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("saved_jobs").upsert(
    {
      user_id: user.id,
      provider: job.provider,
      provider_job_id: job.providerJobId,
      title: job.title,
      company: job.company,
      location: job.location,
      listing_url: job.listingUrl,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      posted_at: job.postedAt,
      snapshot: job as unknown as Json,
    },
    { onConflict: "user_id,provider,provider_job_id" }
  );

  if (error) return { error: "Could not save this job." };

  revalidatePath("/dashboard/saved");
  return {};
}

export async function unsaveJobAction(savedJobId: string): Promise<{ error?: string }> {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("saved_jobs").delete().eq("id", savedJobId).eq("user_id", user.id);

  if (error) return { error: "Could not remove this job." };

  revalidatePath("/dashboard/saved");
  return {};
}
