import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("insufficient_credits");
    this.name = "InsufficientCreditsError";
  }
}

export interface CreditBalance {
  dailyBalance: number;
  purchasedBalance: number;
  total: number;
}

/**
 * Ensures today's free/subscription daily allowance has been granted for
 * this user (idempotent — safe to call on every dashboard/bot interaction),
 * then returns the current balance.
 */
export async function ensureDailyAllowanceAndGetBalance(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CreditBalance> {
  const { data, error } = await supabase.rpc("grant_daily_allowance", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Failed to grant daily allowance: ${error.message}`);
  }

  const row = data?.[0];
  const dailyBalance = row?.daily_balance ?? 0;
  const purchasedBalance = row?.purchased_balance ?? 0;

  return { dailyBalance, purchasedBalance, total: dailyBalance + purchasedBalance };
}

export async function getCreditBalance(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CreditBalance> {
  const { data, error } = await supabase.rpc("get_credit_balance", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Failed to read credit balance: ${error.message}`);
  }

  const row = data?.[0];
  const dailyBalance = row?.daily_balance ?? 0;
  const purchasedBalance = row?.purchased_balance ?? 0;

  return { dailyBalance, purchasedBalance, total: dailyBalance + purchasedBalance };
}

export interface SpendResult {
  spent: number;
  dailySpent: number;
  purchasedSpent: number;
  dailyBalance: number;
  purchasedBalance: number;
  alreadyProcessed: boolean;
}

/**
 * Spends credits atomically (daily allowance first, then purchased).
 * `idempotencyKey` must be stable for a given logical operation (e.g.
 * `search:<searchId>`) so retries never double-spend.
 */
export async function spendCredits(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    amount: number;
    referenceType: string;
    referenceId?: string | null;
    idempotencyKey: string;
  }
): Promise<SpendResult> {
  const { data, error } = await supabase.rpc("spend_credits", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_reference_type: params.referenceType,
    p_reference_id: params.referenceId ?? null,
    p_idempotency_key: params.idempotencyKey,
  });

  if (error) {
    if (error.message.includes("insufficient_credits")) {
      throw new InsufficientCreditsError();
    }
    throw new Error(`Failed to spend credits: ${error.message}`);
  }

  const row = data?.[0];
  if (!row) {
    throw new Error("spend_credits returned no result");
  }

  return {
    spent: row.spent,
    dailySpent: row.daily_spent,
    purchasedSpent: row.purchased_spent,
    dailyBalance: row.daily_balance,
    purchasedBalance: row.purchased_balance,
    alreadyProcessed: row.already_processed,
  };
}

/** Grants purchased credits after a payment has been verified server-side. */
export async function grantPurchasedCredits(
  supabase: SupabaseClient<Database>,
  params: { userId: string; amount: number; referenceId: string; idempotencyKey: string }
) {
  const { data, error } = await supabase.rpc("grant_purchased_credits", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_reference_type: "payment_transaction",
    p_reference_id: params.referenceId,
    p_idempotency_key: params.idempotencyKey,
  });

  if (error) {
    throw new Error(`Failed to grant purchased credits: ${error.message}`);
  }

  return data?.[0];
}
