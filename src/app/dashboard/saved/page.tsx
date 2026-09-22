import { EmptyState } from "@/components/ui/feedback";
import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SavedJobItem } from "@/app/dashboard/saved/saved-job-item";

export default async function SavedJobsPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { data: saved } = await supabase
    .from("saved_jobs")
    .select("id, title, company, location, listing_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Saved jobs</h1>

      {!saved || saved.length === 0 ? (
        <EmptyState title="No saved jobs yet" description="Save jobs from your matches to revisit them here." />
      ) : (
        <div className="space-y-3">
          {saved.map((job) => (
            <SavedJobItem
              key={job.id}
              job={{
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                listingUrl: job.listing_url,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
