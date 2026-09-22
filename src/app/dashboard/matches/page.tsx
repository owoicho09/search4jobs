import { JobCard } from "@/components/dashboard/job-card";
import { EmptyState } from "@/components/ui/feedback";
import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MatchesPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "provider, provider_job_id, title, company, location, listing_url, salary_min, salary_max, posted_at, employment_type, work_arrangement, description_snippet, ai_relevance_score, ai_explanation, delivered_at"
    )
    .eq("user_id", user.id)
    .order("delivered_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">My matches</h1>

      {!matches || matches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description="Run a search from Find Jobs to see AI-matched listings here."
        />
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <JobCard
              key={`${m.provider}:${m.provider_job_id}:${m.delivered_at}`}
              job={{
                provider: m.provider,
                providerJobId: m.provider_job_id,
                title: m.title,
                company: m.company,
                location: m.location,
                listingUrl: m.listing_url,
                salaryMin: m.salary_min,
                salaryMax: m.salary_max,
                postedAt: m.posted_at,
                employmentType: m.employment_type,
                workArrangement: m.work_arrangement,
                descriptionSnippet: m.description_snippet,
                relevanceScore: m.ai_relevance_score,
                explanation: m.ai_explanation,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
