"use server";

import { redirect } from "next/navigation";

import { requireAuthUser } from "@/lib/auth/dal";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rate-limit";
import { initializePackPurchase, BillingNotConfiguredError, PackNotFoundError } from "@/lib/billing/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PurchaseFormState {
  error?: string;
}

export async function startPackPurchaseAction(
  _prevState: PurchaseFormState,
  formData: FormData
): Promise<PurchaseFormState> {
  const user = await requireAuthUser();
  const packCode = formData.get("packCode");

  if (typeof packCode !== "string" || !packCode) {
    return { error: "Choose a credit pack." };
  }
  if (!user.email) {
    return { error: "Your account has no email on file — cannot start checkout." };
  }

  const supabase = await createSupabaseServerClient();

  try {
    await checkRateLimit(supabase, `user:${user.id}`, "payment_initialize", 10, 300);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return { error: "Too many checkout attempts — please wait a few minutes and try again." };
    }
    throw err;
  }

  let authorizationUrl: string;
  try {
    const result = await initializePackPurchase(supabase, {
      userId: user.id,
      userEmail: user.email,
      packCode,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    });
    authorizationUrl = result.authorizationUrl;
  } catch (err) {
    if (err instanceof BillingNotConfiguredError || err instanceof PackNotFoundError) {
      return { error: err.message };
    }
    return { error: "Could not start checkout. Please try again." };
  }

  redirect(authorizationUrl);
}
