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
    ...employmentTypeFilters(profile.employmentTypes),
    sortBy: "relevance",
  };
}

const CONTRACT_TIME = new Set(["full_time", "part_time"]);
const CONTRACT_TYPE = new Set(["permanent", "contract"]);

/**
 * The user's employment types mean "any of these", but Adzuna's flags don't:
 * full_time/part_time (contract_time) and permanent/contract (contract_type)
 * are each single-choice — sending both full_time and part_time is rejected
 * with a 400 — and the two groups are ANDed together. So a flag is only sent
 * when the selection is exactly one value from one group; any broader
 * selection sends no flag, and AI relevance scoring (which sees the
 * preference) handles it instead of Adzuna over-filtering.
 */
export function employmentTypeFilters(
  employmentTypes: string[]
): Pick<AdzunaSearchParams, "fullTime" | "partTime" | "contract" | "permanent"> {
  const types = new Set(employmentTypes.map((t) => t.toLowerCase()));
  if (types.size !== 1) return {};

  const [only] = types;
  if (!CONTRACT_TIME.has(only) && !CONTRACT_TYPE.has(only)) return {};

  return {
    fullTime: only === "full_time" || undefined,
    partTime: only === "part_time" || undefined,
    contract: only === "contract" || undefined,
    permanent: only === "permanent" || undefined,
  };
}
