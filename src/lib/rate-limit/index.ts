import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export class RateLimitExceededError extends Error {
  constructor(bucket: string) {
    super(`Rate limit exceeded for "${bucket}"`);
    this.name = "RateLimitExceededError";
  }
}

/**
 * DB-backed sliding-window rate limit. Must be Postgres-backed (not an
 * in-memory Map) because Vercel serverless functions don't share memory
 * across instances/regions.
 */
export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  subject: string,
  bucket: string,
  limit: number,
  windowSeconds: number
) {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_subject: subject,
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }

  const result = data?.[0];
  if (!result?.allowed) {
    throw new RateLimitExceededError(bucket);
  }

  return result;
}
