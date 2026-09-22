import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser-side Supabase client — safe to use in Client Components. */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
