import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export interface AppTunables {
  searchQuantityOptions: number[];
  candidateFetchLimit: number;
  aiEvaluationLimit: number;
  relevanceThreshold: number;
}

const DEFAULTS: AppTunables = {
  searchQuantityOptions: [3, 5, 10],
  candidateFetchLimit: 40,
  aiEvaluationLimit: 25,
  relevanceThreshold: 0.6,
};

/**
 * Reads server-tunable search/matching knobs from app_config, falling back
 * to safe defaults if a row is missing or the table can't be reached.
 * Not cached across requests — these values are small and change rarely
 * enough that a per-request read keeps the config-as-source-of-truth
 * property without adding a stale-cache class of bugs.
 */
export async function getAppTunables(): Promise<AppTunables> {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase.from("app_config").select("key,value");

    if (error || !data) return DEFAULTS;

    const map = new Map(data.map((row) => [row.key, row.value]));

    return {
      searchQuantityOptions:
        (map.get("search_quantity_options") as number[] | undefined) ??
        DEFAULTS.searchQuantityOptions,
      candidateFetchLimit:
        Number(map.get("candidate_fetch_limit")) || DEFAULTS.candidateFetchLimit,
      aiEvaluationLimit: Number(map.get("ai_evaluation_limit")) || DEFAULTS.aiEvaluationLimit,
      relevanceThreshold:
        Number(map.get("relevance_threshold")) || DEFAULTS.relevanceThreshold,
    };
  } catch {
    return DEFAULTS;
  }
}
