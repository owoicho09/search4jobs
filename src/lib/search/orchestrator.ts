import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchBoundedCandidates, normalizeAdzunaJob } from "@/lib/adzuna/client";
import { getAppTunables } from "@/lib/config/app-config";
import { ensureDailyAllowanceAndGetBalance, spendCredits, InsufficientCreditsError } from "@/lib/credits/service";
import { evaluateCandidates, preFilterCandidates, type RankedMatch } from "@/lib/matching/service";
import { buildAdzunaParamsFromProfile, UnsupportedSearchCountryError } from "@/lib/search/query-builder";
import type { Database } from "@/lib/supabase/types";

export { InsufficientCreditsError, UnsupportedSearchCountryError };

export interface RunSearchParams {
  userId: string;
  source: "dashboard" | "telegram";
  requestedCount: number;
}

export interface RunSearchResult {
  searchId: string;
  status: "completed" | "no_matches" | "failed";
  delivered: RankedMatch[];
  errorMessage?: string;
}

/**
 * The single shared job-search pipeline used by both the dashboard and the
 * Telegram bot: validate -> credits check -> Adzuna -> pre-filter -> OpenAI
 * -> rank -> deliver -> persist -> deduct credits for delivered jobs only.
 *
 * `supabase` may be a user-scoped client (dashboard Server Action, RLS
 * enforced) or the service-role client (Telegram webhook, which has no
 * browser session) — both are valid callers of the credit RPCs.
 */
export async function runJobSearch(
  supabase: SupabaseClient<Database>,
  params: RunSearchParams
): Promise<RunSearchResult> {
  const { userId, source, requestedCount } = params;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "preferred_country, preferred_location, preferred_titles, employment_types, salary_min, salary_max, max_days_old, headline, summary, skills, experience_level, years_experience, work_arrangement"
    )
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Could not load profile for search: ${profileError?.message ?? "not found"}`);
  }

  const balance = await ensureDailyAllowanceAndGetBalance(supabase, userId);
  if (requestedCount > balance.total) {
    throw new InsufficientCreditsError();
  }

  const adzunaParams = buildAdzunaParamsFromProfile({
    preferredCountry: profile.preferred_country,
    preferredLocation: profile.preferred_location,
    preferredTitles: profile.preferred_titles,
    employmentTypes: profile.employment_types,
    salaryMin: profile.salary_min,
    salaryMax: profile.salary_max,
    maxDaysOld: profile.max_days_old,
  });

  const tunables = await getAppTunables();

  const { data: search, error: searchInsertError } = await supabase
    .from("searches")
    .insert({
      user_id: userId,
      source,
      query_params: adzunaParams as unknown as Database["public"]["Tables"]["searches"]["Row"]["query_params"],
      requested_count: requestedCount,
      status: "pending",
    })
    .select("id")
    .single();

  if (searchInsertError || !search) {
    throw new Error(`Could not create search record: ${searchInsertError?.message}`);
  }

  const searchId = search.id;

  try {
    const rawCandidates = await fetchBoundedCandidates(adzunaParams, tunables.candidateFetchLimit);
    const normalized = rawCandidates.map(normalizeAdzunaJob);
    const preFiltered = preFilterCandidates(normalized).slice(0, tunables.aiEvaluationLimit);

    const ranked = await evaluateCandidates(
      {
        headline: profile.headline,
        summary: profile.summary,
        skills: profile.skills,
        experienceLevel: profile.experience_level,
        yearsExperience: profile.years_experience,
        preferredTitles: profile.preferred_titles,
        workArrangement: profile.work_arrangement,
        employmentTypes: profile.employment_types,
      },
      preFiltered,
      { relevanceThreshold: tunables.relevanceThreshold }
    );

    const delivered = ranked.slice(0, requestedCount);

    if (delivered.length === 0) {
      await supabase
        .from("searches")
        .update({ status: "no_matches", delivered_count: 0, completed_at: new Date().toISOString() })
        .eq("id", searchId);

      return { searchId, status: "no_matches", delivered: [] };
    }

    const { error: matchesError } = await supabase.from("matches").insert(
      delivered.map((m) => ({
        search_id: searchId,
        user_id: userId,
        provider: m.candidate.provider,
        provider_job_id: m.candidate.providerJobId,
        title: m.candidate.title,
        company: m.candidate.company,
        location: m.candidate.location,
        work_arrangement: m.candidate.workArrangement,
        employment_type: m.candidate.employmentType,
        salary_min: m.candidate.salaryMin,
        salary_max: m.candidate.salaryMax,
        description_snippet: m.candidate.descriptionSnippet,
        listing_url: m.candidate.listingUrl,
        posted_at: m.candidate.postedAt,
        ai_relevance_score: m.relevanceScore,
        ai_explanation: m.explanation,
      }))
    );

    if (matchesError) {
      throw new Error(`Could not persist matches: ${matchesError.message}`);
    }

    // Credits are deducted only now, for jobs actually delivered — never for
    // candidates fetched or evaluated. Idempotent per search, so a retried
    // delivery step never double-charges.
    await spendCredits(supabase, {
      userId,
      amount: delivered.length,
      referenceType: "search",
      referenceId: searchId,
      idempotencyKey: `search:${searchId}`,
    });

    await supabase
      .from("searches")
      .update({
        status: "completed",
        delivered_count: delivered.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchId);

    return { searchId, status: "completed", delivered };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown search error";
    await supabase
      .from("searches")
      .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", searchId);

    // Failed searches never consume credits — nothing was spent above.
    throw err;
  }
}
