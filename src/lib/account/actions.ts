"use server";

import { redirect } from "next/navigation";

import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export interface DeleteAccountFormState {
  error?: string;
}

/**
 * Deletes the signed-in user's auth account. All owned rows cascade-delete
 * via `on delete cascade` foreign keys (profiles, cv_files, telegram_bots,
 * credit_ledger, searches, matches, saved_jobs, payment_transactions,
 * subscriptions) — see supabase/migrations. Storage objects for the user's
 * CV are removed first since Storage isn't covered by those FKs.
 */
export async function deleteAccountAction(
  _prevState: DeleteAccountFormState,
  formData: FormData
): Promise<DeleteAccountFormState> {
  const user = await requireAuthUser();

  if (formData.get("confirm") !== "DELETE") {
    return { error: 'Type "DELETE" to confirm.' };
  }

  const userScoped = await createSupabaseServerClient();
  const { data: cv } = await userScoped
    .from("cv_files")
    .select("storage_path")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cv) {
    await userScoped.storage.from("cvs").remove([cv.storage_path]);
  }

  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return { error: "Could not delete your account. Please try again or contact support." };
  }

  await userScoped.auth.signOut();
  redirect("/");
}
