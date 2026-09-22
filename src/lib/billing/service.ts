import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { grantPurchasedCredits } from "@/lib/credits/service";
import { paystackProvider } from "@/lib/billing/paystack";
import type { Database } from "@/lib/supabase/types";

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Checkout is not configured yet. Add PAYMENT_PROVIDER_SECRET_KEY to enable purchases.");
    this.name = "BillingNotConfiguredError";
  }
}

export class PackNotFoundError extends Error {
  constructor() {
    super("That credit pack is not available.");
    this.name = "PackNotFoundError";
  }
}

const provider = paystackProvider;

export async function initializePackPurchase(
  supabase: SupabaseClient<Database>,
  params: { userId: string; userEmail: string; packCode: string; appUrl: string }
) {
  if (!provider.isConfigured()) {
    throw new BillingNotConfiguredError();
  }

  const { data: pack, error: packError } = await supabase
    .from("credit_packs")
    .select("id, code, name, price_kobo, credits, active")
    .eq("code", params.packCode)
    .eq("active", true)
    .single();

  if (packError || !pack) {
    throw new PackNotFoundError();
  }

  const reference = `pack_${pack.code}_${randomUUID()}`;

  const { error: txError } = await supabase.from("payment_transactions").insert({
    user_id: params.userId,
    pack_id: pack.id,
    provider: provider.name,
    provider_reference: reference,
    amount_kobo: pack.price_kobo,
    credits: pack.credits,
    status: "pending",
  });

  if (txError) {
    throw new Error(`Could not start checkout: ${txError.message}`);
  }

  const initialized = await provider.initializeTransaction({
    email: params.userEmail,
    amountKobo: pack.price_kobo,
    reference,
    callbackUrl: `${params.appUrl}/dashboard/credits/verify?reference=${reference}`,
    metadata: { userId: params.userId, packCode: pack.code },
  });

  return { authorizationUrl: initialized.authorizationUrl, reference };
}

/**
 * Verifies a transaction with the provider and, only on confirmed success,
 * grants credits. Idempotent — safe to call from both the user's return
 * redirect and the async webhook for the same reference; whichever call
 * lands first grants the credits, and the second is a no-op.
 */
export async function finalizeTransaction(
  supabase: SupabaseClient<Database>,
  reference: string
): Promise<{ status: "success" | "failed" | "pending"; alreadyProcessed: boolean }> {
  const { data: tx, error: txError } = await supabase
    .from("payment_transactions")
    .select("id, user_id, credits, status, provider_reference")
    .eq("provider_reference", reference)
    .single();

  if (txError || !tx) {
    throw new Error("Unknown payment reference.");
  }

  if (tx.status === "success") {
    return { status: "success", alreadyProcessed: true };
  }

  const verified = await provider.verifyTransaction(reference);

  await supabase
    .from("payment_transactions")
    .update({ status: verified.status === "success" ? "success" : verified.status === "failed" ? "failed" : "pending" })
    .eq("id", tx.id);

  if (verified.status !== "success") {
    return { status: verified.status, alreadyProcessed: false };
  }

  const result = await grantPurchasedCredits(supabase, {
    userId: tx.user_id,
    amount: tx.credits,
    referenceId: tx.id,
    idempotencyKey: `purchase:${tx.provider_reference}`,
  });

  return { status: "success", alreadyProcessed: result?.already_processed ?? false };
}
