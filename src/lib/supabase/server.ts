import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Server-side Supabase client bound to the current request's cookies.
 * Create a fresh instance per request — never module-level singleton.
 * `setAll` is best-effort: writing cookies from a Server Component throws,
 * which is fine as long as `proxy.ts` refreshes the session on navigation.
 */
export async function createSupabaseServerClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — ignore, proxy.ts refreshes sessions.
        }
      },
    },
  });
}

/**
 * Service-role Supabase client for server-only privileged operations
 * (webhooks, background jobs, admin writes). Bypasses RLS — never expose
 * to client code and never call this from a code path that trusts
 * client-supplied identifiers without its own authorization check.
 */
export function createSupabaseServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !serviceRoleKey) {
    throw new Error(
      "Supabase service role is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createServerClient<Database>(SUPABASE_URL, serviceRoleKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // Service-role client is never tied to a browser session.
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
