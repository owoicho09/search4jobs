import "server-only";

import { isSupportedAdzunaCountry } from "@/lib/adzuna/countries";
import type {
  AdzunaJob,
  AdzunaSearchParams,
  AdzunaSearchResponse,
  NormalizedJobCandidate,
} from "@/lib/adzuna/types";

export class UnsupportedCountryError extends Error {
  constructor(country: string) {
    super(`Adzuna does not currently support "${country}"`);
    this.name = "UnsupportedCountryError";
  }
}

export class AdzunaProviderError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AdzunaProviderError";
  }
}

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";
const MAX_RESULTS_PER_PAGE = 50;

/** Pure — builds the Adzuna query string. Kept separate from fetch for unit testing. */
export function buildAdzunaSearchUrl(params: AdzunaSearchParams): string {
  if (!isSupportedAdzunaCountry(params.country)) {
    throw new UnsupportedCountryError(params.country);
  }

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new AdzunaProviderError("Adzuna is not configured (missing ADZUNA_APP_ID/ADZUNA_APP_KEY).");
  }

  const resultsPerPage = Math.min(Math.max(params.resultsPerPage, 1), MAX_RESULTS_PER_PAGE);
  const page = Math.max(params.page, 1);

  const search = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(resultsPerPage),
  });

  if (params.what) search.set("what", params.what);
  if (params.whatOr) search.set("what_or", params.whatOr);
  if (params.whatExclude) search.set("what_exclude", params.whatExclude);
  if (params.where) search.set("where", params.where);
  if (params.distanceKm != null) search.set("distance", String(params.distanceKm));
  if (params.maxDaysOld != null) search.set("max_days_old", String(params.maxDaysOld));
  if (params.salaryMin != null) search.set("salary_min", String(params.salaryMin));
  if (params.salaryMax != null) search.set("salary_max", String(params.salaryMax));
  if (params.fullTime) search.set("full_time", "1");
  if (params.partTime) search.set("part_time", "1");
  if (params.contract) search.set("contract", "1");
  if (params.permanent) search.set("permanent", "1");
  if (params.sortBy) search.set("sort_by", params.sortBy);

  return `${ADZUNA_BASE_URL}/${params.country}/search/${page}?${search.toString()}`;
}

async function fetchWithBackoff(url: string, attempt = 1): Promise<Response> {
  const response = await fetch(url, { method: "GET" });

  if (response.status === 429 || response.status >= 500) {
    if (attempt >= 3) {
      throw new AdzunaProviderError(
        `Adzuna request failed after ${attempt} attempts (status ${response.status})`,
        response.status
      );
    }
    const delayMs = 300 * 2 ** (attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fetchWithBackoff(url, attempt + 1);
  }

  return response;
}

/** Fetches a single bounded page of candidates. Callers control pagination/limits. */
export async function searchAdzunaJobs(params: AdzunaSearchParams): Promise<AdzunaSearchResponse> {
  const url = buildAdzunaSearchUrl(params);
  const response = await fetchWithBackoff(url);

  if (!response.ok) {
    // Never log query string — it carries app_id/app_key.
    throw new AdzunaProviderError(`Adzuna search failed with status ${response.status}`, response.status);
  }

  return (await response.json()) as AdzunaSearchResponse;
}

function normalizeEmploymentType(job: AdzunaJob): string | null {
  const parts = [job.contract_time, job.contract_type].filter(Boolean);
  return parts.length ? parts.join("_") : null;
}

// Adzuna's predicted salaries (salary_is_predicted) can be non-integer
// (e.g. 68270.58) — round for storage in integer DB columns.
function roundSalary(value: number | undefined): number | null {
  return typeof value === "number" ? Math.round(value) : null;
}

export function normalizeAdzunaJob(job: AdzunaJob): NormalizedJobCandidate {
  return {
    provider: "adzuna",
    providerJobId: job.id,
    title: job.title,
    company: job.company?.display_name ?? null,
    location: job.location?.display_name ?? null,
    employmentType: normalizeEmploymentType(job),
    workArrangement: null, // Adzuna doesn't reliably label remote/hybrid/onsite
    salaryMin: roundSalary(job.salary_min),
    salaryMax: roundSalary(job.salary_max),
    descriptionSnippet: job.description ?? null,
    listingUrl: job.redirect_url,
    postedAt: job.created ?? null,
  };
}

/** De-duplicates by provider job id, falling back to a title+company+location fingerprint. */
export function dedupeCandidates(jobs: AdzunaJob[]): AdzunaJob[] {
  const seen = new Set<string>();
  const result: AdzunaJob[] = [];

  for (const job of jobs) {
    const key = job.id || `${job.title}|${job.company?.display_name}|${job.location?.display_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(job);
  }

  return result;
}

/**
 * Fetches up to `candidateLimit` deduplicated candidates across as many
 * pages as needed (bounded — never scans further than required to fill the
 * limit or Adzuna runs out of results).
 */
export async function fetchBoundedCandidates(
  baseParams: Omit<AdzunaSearchParams, "page" | "resultsPerPage">,
  candidateLimit: number
): Promise<AdzunaJob[]> {
  const perPage = Math.min(candidateLimit, MAX_RESULTS_PER_PAGE);
  const collected: AdzunaJob[] = [];
  let page = 1;

  while (collected.length < candidateLimit) {
    const response = await searchAdzunaJobs({ ...baseParams, page, resultsPerPage: perPage });
    if (!response.results?.length) break;

    collected.push(...response.results);
    if (response.results.length < perPage) break; // no more pages
    page += 1;

    if (page > 5) break; // hard safety cap regardless of candidateLimit
  }

  return dedupeCandidates(collected).slice(0, candidateLimit);
}
