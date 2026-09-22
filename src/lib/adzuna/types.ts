import type { AdzunaCountryCode } from "@/lib/adzuna/countries";

export interface AdzunaSearchParams {
  country: AdzunaCountryCode;
  what?: string;
  whatOr?: string;
  whatExclude?: string;
  where?: string;
  distanceKm?: number;
  maxDaysOld?: number;
  salaryMin?: number;
  salaryMax?: number;
  fullTime?: boolean;
  partTime?: boolean;
  contract?: boolean;
  permanent?: boolean;
  sortBy?: "relevance" | "date" | "salary";
  resultsPerPage: number;
  page: number;
}

// Subset of Adzuna's job object we actually use, per their documented
// response shape (title, company.display_name, location.display_name,
// description, redirect_url, salary_min/max, created, contract_type/time).
export interface AdzunaJob {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  description?: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  created: string;
  contract_type?: string; // "permanent" | "contract"
  contract_time?: string; // "full_time" | "part_time"
  category?: { label?: string; tag?: string };
}

export interface AdzunaSearchResponse {
  count: number;
  results: AdzunaJob[];
}

export interface NormalizedJobCandidate {
  provider: "adzuna";
  providerJobId: string;
  title: string;
  company: string | null;
  location: string | null;
  employmentType: string | null;
  workArrangement: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  descriptionSnippet: string | null;
  listingUrl: string;
  postedAt: string | null;
}
