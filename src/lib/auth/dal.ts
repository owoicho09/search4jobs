import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

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
 * Admins are the emails listed in ADMIN_EMAILS (comma-separated,
 * case-insensitive). Only verified addresses count, so signing up with an
 * admin's email without confirming it grants nothing.
 */
export function isAdminUser(user: { email?: string | null; email_confirmed_at?: string | null } | null) {
  if (!user?.email || !user.email_confirmed_at) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(user.email.toLowerCase());
}

/**
 * Use in every /admin Server Component and Server Action. Non-admins get a
 * 404 so the admin area's existence isn't advertised.
 */
export async function requireAdminUser() {
  const user = await requireAuthUser();
  if (!isAdminUser(user)) {
    notFound();
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
