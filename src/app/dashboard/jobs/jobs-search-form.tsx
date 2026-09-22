"use client";

import { useActionState } from "react";

import { JobCard } from "@/components/dashboard/job-card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { runSearchAction, type RunSearchFormState } from "@/lib/jobs/actions";

const initialState: RunSearchFormState = {};

export function JobsSearchForm({ affordableQuantities }: { affordableQuantities: number[] }) {
  const [state, action, pending] = useActionState(runSearchAction, initialState);

  if (affordableQuantities.length === 0) {
    return (
      <Alert variant="info">
        You&apos;re out of credits for now. Check Credits &amp; Plans to top up, or come back after your
        daily allowance resets.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
            How many jobs?
          </label>
          <select id="quantity" name="quantity" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            {affordableQuantities.map((q) => (
              <option key={q} value={q}>
                {q} jobs ({q} credit{q === 1 ? "" : "s"})
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Searching..." : "Find jobs"}
        </Button>
      </form>

      {state.error && <Alert variant="danger">{state.error}</Alert>}

      {state.result?.status === "no_matches" && (
        <Alert variant="info">No suitable jobs were found this time — no credits were used.</Alert>
      )}

      {state.result?.status === "completed" && (
        <div className="space-y-4">
          <p className="text-sm text-muted">Delivered {state.result.delivered.length} job(s).</p>
          {state.result.delivered.map((m) => (
            <JobCard
              key={m.candidate.providerJobId}
              job={{
                provider: m.candidate.provider,
                providerJobId: m.candidate.providerJobId,
                title: m.candidate.title,
                company: m.candidate.company,
                location: m.candidate.location,
                listingUrl: m.candidate.listingUrl,
                salaryMin: m.candidate.salaryMin,
                salaryMax: m.candidate.salaryMax,
                postedAt: m.candidate.postedAt,
                employmentType: m.candidate.employmentType,
                workArrangement: m.candidate.workArrangement,
                descriptionSnippet: m.candidate.descriptionSnippet,
                relevanceScore: m.relevanceScore,
                explanation: m.explanation,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
