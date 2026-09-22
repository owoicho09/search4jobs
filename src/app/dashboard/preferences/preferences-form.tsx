"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { FieldError, Input, Label, Select } from "@/components/ui/form";
import { ADZUNA_SUPPORTED_COUNTRIES } from "@/lib/adzuna/countries";
import { updatePreferencesAction, type ProfileFormState } from "@/lib/profile/actions";

const initialState: ProfileFormState = {};

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "permanent", label: "Permanent" },
];

interface PreferencesDefaults {
  preferredTitles: string[];
  preferredCountry: string | null;
  preferredLocation: string;
  workArrangement: string;
  employmentTypes: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  maxDaysOld: number | null;
}

export function PreferencesForm({ defaults }: { defaults: PreferencesDefaults }) {
  const [state, action, pending] = useActionState(updatePreferencesAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      {state.success && <Alert variant="success">Preferences saved.</Alert>}

      <div>
        <Label htmlFor="preferredTitles">Target job titles (comma separated)</Label>
        <Input
          id="preferredTitles"
          name="preferredTitles"
          defaultValue={defaults.preferredTitles.join(", ")}
          placeholder="Backend Engineer, Software Engineer"
        />
        <FieldError>{state.fieldErrors?.preferredTitles}</FieldError>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="preferredCountry">Country</Label>
          <Select id="preferredCountry" name="preferredCountry" defaultValue={defaults.preferredCountry ?? ""}>
            <option value="">Select a supported country</option>
            {ADZUNA_SUPPORTED_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            Only these countries are currently supported by our job data provider.
          </p>
          <FieldError>{state.fieldErrors?.preferredCountry}</FieldError>
        </div>
        <div>
          <Label htmlFor="preferredLocation">City / region</Label>
          <Input id="preferredLocation" name="preferredLocation" defaultValue={defaults.preferredLocation} />
        </div>
      </div>

      <div>
        <Label htmlFor="workArrangement">Work arrangement</Label>
        <Select id="workArrangement" name="workArrangement" defaultValue={defaults.workArrangement}>
          <option value="any">Any</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </Select>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Employment type</legend>
        <div className="flex flex-wrap gap-3">
          {EMPLOYMENT_TYPES.map((t) => (
            <label key={t.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="employmentTypes"
                value={t.value}
                defaultChecked={defaults.employmentTypes.includes(t.value)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="salaryMin">Min salary (optional)</Label>
          <Input id="salaryMin" name="salaryMin" type="number" min={0} defaultValue={defaults.salaryMin ?? ""} />
        </div>
        <div>
          <Label htmlFor="salaryMax">Max salary (optional)</Label>
          <Input id="salaryMax" name="salaryMax" type="number" min={0} defaultValue={defaults.salaryMax ?? ""} />
        </div>
        <div>
          <Label htmlFor="maxDaysOld">Posted within (days, optional)</Label>
          <Input id="maxDaysOld" name="maxDaysOld" type="number" min={1} max={365} defaultValue={defaults.maxDaysOld ?? ""} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save preferences"}
      </Button>
    </form>
  );
}
