"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { unsaveJobAction } from "@/lib/saved-jobs/actions";

export interface SavedJobRow {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  listingUrl: string;
}

export function SavedJobItem({ job }: { job: SavedJobRow }) {
  const [removed, setRemoved] = useState(false);
  const [pending, startTransition] = useTransition();

  if (removed) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
      <div>
        <p className="font-medium">{job.title}</p>
        <p className="text-sm text-muted">{[job.company, job.location].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="flex gap-2">
        <a href={job.listingUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="secondary">
            View
          </Button>
        </a>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await unsaveJobAction(job.id);
              if (!result.error) setRemoved(true);
            })
          }
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
