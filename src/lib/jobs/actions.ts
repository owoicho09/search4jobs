"use server";

import { revalidatePath } from "next/cache";

import { requireAuthUser } from "@/lib/auth/dal";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rate-limit";
import {
  InsufficientCreditsError,
  UnsupportedSearchCountryError,
  runJobSearch,
  type RunSearchResult,
} from "@/lib/search/orchestrator";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface RunSearchFormState {
  error?: string;
  result?: RunSearchResult;
}

const initialState: RunSearchFormState = {};

export async function runSearchAction(
  _prevState: RunSearchFormState,
  formData: FormData
): Promise<RunSearchFormState> {
  const user = await requireAuthUser();
  const requestedCount = Number(formData.get("quantity"));

  if (!Number.isFinite(requestedCount) || requestedCount <= 0) {
    return { error: "Choose how many jobs you'd like." };
  }

  const supabase = await createSupabaseServerClient();

  try {
    await checkRateLimit(supabase, `user:${user.id}`, "job_search", 10, 300);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return { error: "You're searching too frequently — please wait a few minutes and try again." };
    }
    throw err;
  }

  try {
    const result = await runJobSearch(supabase, {
      userId: user.id,
      source: "dashboard",
      requestedCount,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/matches");
    return { result };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { error: "You don't have enough credits for that many jobs. Try a smaller quantity or buy more credits." };
    }
    if (err instanceof UnsupportedSearchCountryError) {
      return {
        error: "Your preferred country isn't supported by our job provider yet. Update it under Job Preferences.",
      };
    }
    return { error: "Something went wrong running that search. No credits were charged — please try again." };
  }
}

export { initialState as runSearchInitialState };
