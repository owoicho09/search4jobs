import { isSupportedAdzunaCountry } from "@/lib/adzuna/countries";
import type { AdzunaSearchParams } from "@/lib/adzuna/types";

export interface ProfileForQuery {
  preferredCountry: string | null;
  preferredLocation: string | null;
  preferredTitles: string[];
  employmentTypes: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  maxDaysOld: number | null;
}

export class UnsupportedSearchCountryError extends Error {
  constructor(public country: string | null) {
    super(country ? `"${country}" is not a supported search country yet.` : "No search country set.");
    this.name = "UnsupportedSearchCountryError";
  }
}

/** Pure mapping from a user's saved preferences to an Adzuna query — unit-tested in isolation. */
export function buildAdzunaParamsFromProfile(
  profile: ProfileForQuery
): Omit<AdzunaSearchParams, "page" | "resultsPerPage"> {
  if (!isSupportedAdzunaCountry(profile.preferredCountry)) {
    throw new UnsupportedSearchCountryError(profile.preferredCountry);
  }

  const types = new Set(profile.employmentTypes.map((t) => t.toLowerCase()));

  return {
    country: profile.preferredCountry,
    // `what_or` (any keyword matches) rather than `what` (every keyword must
    // co-occur in one listing) — a profile with several distinct target
    // titles (e.g. "software engineer" and "ai engineer") would otherwise
    // require an impossible listing containing every word from every title.
    whatOr: profile.preferredTitles.length ? profile.preferredTitles.join(" ") : undefined,
    where: profile.preferredLocation ?? undefined,
    salaryMin: profile.salaryMin ?? undefined,
    salaryMax: profile.salaryMax ?? undefined,
    maxDaysOld: profile.maxDaysOld ?? undefined,
    fullTime: types.has("full_time") || undefined,
    partTime: types.has("part_time") || undefined,
    contract: types.has("contract") || undefined,
    permanent: types.has("permanent") || undefined,
    sortBy: "relevance",
  };
}
