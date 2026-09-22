// Confirmed against Adzuna's live developer docs (developer.adzuna.com) at
// implementation time. Nigeria is NOT among them — do not assume it is
// supported just because the product targets Nigerian users; re-verify this
// list periodically since Adzuna can add/remove countries.
export const ADZUNA_SUPPORTED_COUNTRIES = [
  { code: "us", label: "United States" },
  { code: "gb", label: "United Kingdom" },
  { code: "au", label: "Australia" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "in", label: "India" },
  { code: "ca", label: "Canada" },
  { code: "nz", label: "New Zealand" },
  { code: "za", label: "South Africa" },
  { code: "pl", label: "Poland" },
  { code: "nl", label: "Netherlands" },
  { code: "it", label: "Italy" },
  { code: "es", label: "Spain" },
  { code: "at", label: "Austria" },
  { code: "be", label: "Belgium" },
  { code: "br", label: "Brazil" },
  { code: "mx", label: "Mexico" },
  { code: "sg", label: "Singapore" },
  { code: "ch", label: "Switzerland" },
] as const;

export type AdzunaCountryCode = (typeof ADZUNA_SUPPORTED_COUNTRIES)[number]["code"];

const SUPPORTED_CODES = new Set<string>(ADZUNA_SUPPORTED_COUNTRIES.map((c) => c.code));

export function isSupportedAdzunaCountry(code: string | null | undefined): code is AdzunaCountryCode {
  return Boolean(code) && SUPPORTED_CODES.has(code!.toLowerCase());
}
