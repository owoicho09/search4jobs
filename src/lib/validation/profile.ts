import { z } from "zod";

import { ADZUNA_SUPPORTED_COUNTRIES } from "@/lib/adzuna/countries";

const countryCodes = ADZUNA_SUPPORTED_COUNTRIES.map((c) => c.code) as [string, ...string[]];

export const ProfileSchema = z.object({
  fullName: z.string().trim().max(120).optional().or(z.literal("")),
  headline: z.string().trim().max(160).optional().or(z.literal("")),
  summary: z.string().trim().max(2000).optional().or(z.literal("")),
  skills: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  experienceLevel: z
    .enum(["entry", "junior", "mid", "senior", "lead", "executive"])
    .optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
});

export const PreferencesSchema = z.object({
  preferredTitles: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  preferredCountry: z.enum(countryCodes).optional(),
  preferredLocation: z.string().trim().max(120).optional().or(z.literal("")),
  workArrangement: z.enum(["remote", "hybrid", "onsite", "any"]).default("any"),
  employmentTypes: z.array(z.enum(["full_time", "part_time", "contract", "permanent"])).default([]),
  salaryMin: z.coerce.number().int().min(0).optional(),
  salaryMax: z.coerce.number().int().min(0).optional(),
  maxDaysOld: z.coerce.number().int().min(1).max(365).optional(),
});

export type ProfileInput = z.infer<typeof ProfileSchema>;
export type PreferencesInput = z.infer<typeof PreferencesSchema>;
