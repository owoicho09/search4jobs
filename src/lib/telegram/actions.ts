"use server";

import { revalidatePath } from "next/cache";

import { requireAuthUser } from "@/lib/auth/dal";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rate-limit";
import { connectTelegramBot, disconnectTelegramBot } from "@/lib/telegram/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface TelegramFormState {
  error?: string;
  success?: boolean;
  botUsername?: string | null;
  webhookRegistered?: boolean;
}

export async function connectTelegramBotAction(
  _prevState: TelegramFormState,
  formData: FormData
): Promise<TelegramFormState> {
  const user = await requireAuthUser();
  const token = formData.get("token");

  if (typeof token !== "string" || !token.trim()) {
    return { error: "Paste your bot token from BotFather." };
  }

  const supabase = await createSupabaseServerClient();

  try {
    await checkRateLimit(supabase, `user:${user.id}`, "telegram_connect", 5, 300);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return { error: "Too many attempts — please wait a few minutes and try again." };
    }
    throw err;
  }

  try {
    const result = await connectTelegramBot(supabase, user.id, token);
    revalidatePath("/dashboard/telegram");
    revalidatePath("/dashboard");
    return { success: true, botUsername: result.botUsername, webhookRegistered: result.webhookRegistered };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not connect that bot." };
  }
}

export async function disconnectTelegramBotAction(): Promise<TelegramFormState> {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  await disconnectTelegramBot(supabase, user.id);
  revalidatePath("/dashboard/telegram");
  revalidatePath("/dashboard");
  return { success: true };
}
