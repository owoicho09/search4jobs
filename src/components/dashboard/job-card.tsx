"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { saveJobAction, type SaveJobInput } from "@/lib/saved-jobs/actions";

export interface JobCardData extends SaveJobInput {
  employmentType?: string | null;
  workArrangement?: string | null;
  descriptionSnippet?: string | null;
  relevanceScore?: number | null;
  explanation?: string | null;
}

export function JobCard({ job, showSave = true }: { job: JobCardData; showSave?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const salary =
    job.salaryMin || job.salaryMax
      ? [job.salaryMin, job.salaryMax].filter(Boolean).join(" – ")
      : null;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{job.title}</h3>
          <p className="text-sm text-muted">
            {[job.company, job.location].filter(Boolean).join(" · ") || "Details unavailable"}
          </p>
        </div>
        {job.relevanceScore != null && <Badge>{Math.round(job.relevanceScore * 100)}% match</Badge>}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
        {job.employmentType && <Badge>{job.employmentType}</Badge>}
        {job.workArrangement && <Badge>{job.workArrangement}</Badge>}
        {salary && <Badge>{salary}</Badge>}
        {job.postedAt && <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>}
      </div>

      {job.explanation && <p className="mt-3 text-sm">{job.explanation}</p>}
      {job.descriptionSnippet && <p className="mt-3 text-sm text-muted">{job.descriptionSnippet}</p>}

      <div className="mt-4 flex items-center gap-3">
        <a href={job.listingUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="secondary">
            View original listing
          </Button>
        </a>
        {showSave && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending || saved}
            onClick={() =>
              startTransition(async () => {
                const result = await saveJobAction(job);
                if (!result.error) setSaved(true);
              })
            }
          >
            {saved ? "Saved" : pending ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        Listing sourced from Adzuna — verify details on the original posting.
      </p>
    </div>
  );
}
