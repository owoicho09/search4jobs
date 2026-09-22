import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Authoritative session check. Memoized per request so repeated calls across
 * layouts/pages/components in one render pass don't re-hit Supabase.
 * This — not proxy.ts — is the real authorization boundary.
 */
export const getAuthUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

/** Use in Server Components / Server Actions that require a signed-in user. */
export async function requireAuthUser() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Use in Route Handlers, which should return 401 rather than redirect.
 * Throws a typed error the caller turns into a Response.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function requireAuthUserForApi() {
  const user = await getAuthUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}
