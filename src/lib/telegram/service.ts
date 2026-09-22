import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptBotToken, encryptBotToken, hashBotToken } from "@/lib/telegram/crypto";
import { telegramDeleteWebhook, telegramGetMe, telegramSetWebhook } from "@/lib/telegram/client";
import type { Database } from "@/lib/supabase/types";

export class InvalidBotTokenError extends Error {
  constructor(detail?: string) {
    super(detail ?? "That doesn't look like a valid Telegram bot token.");
    this.name = "InvalidBotTokenError";
  }
}

export class BotAlreadyConnectedError extends Error {
  constructor() {
    super("This bot is already connected to another account. Create a new bot with BotFather and try again.");
    this.name = "BotAlreadyConnectedError";
  }
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export interface ConnectBotResult {
  botUsername: string | null;
  webhookRegistered: boolean;
}

/**
 * Connects a Telegram bot to the given user: validates the token with
 * Telegram, stores it encrypted, and registers the webhook if a public base
 * URL is configured. Never shows a "connected" state unless Telegram itself
 * confirmed the token via getMe.
 */
export async function connectTelegramBot(
  supabase: SupabaseClient<Database>,
  userId: string,
  rawToken: string
): Promise<ConnectBotResult> {
  const token = rawToken.trim();
  if (!/^\d+:[\w-]{30,}$/.test(token)) {
    throw new InvalidBotTokenError();
  }

  let me;
  try {
    me = await telegramGetMe(token);
  } catch {
    throw new InvalidBotTokenError("Telegram rejected this token. Double-check you copied it correctly.");
  }

  const encrypted = encryptBotToken(token);
  const hash = hashBotToken(token);

  const { error: upsertError } = await supabase
    .from("telegram_bots")
    .upsert(
      {
        user_id: userId,
        telegram_bot_id: me.id,
        bot_username: me.username ?? null,
        bot_token_encrypted: encrypted,
        bot_token_hash: hash,
        status: "pending",
        last_error: null,
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    if (isUniqueViolation(upsertError)) {
      throw new BotAlreadyConnectedError();
    }
    throw new Error(`Could not save bot connection: ${upsertError.message}`);
  }

  const webhookBaseUrl = process.env.TELEGRAM_WEBHOOK_BASE_URL;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  let webhookRegistered = false;

  if (webhookBaseUrl && webhookSecret) {
    try {
      // The bot's numeric Telegram id (not secret — it's public via getMe)
      // is embedded in the path because Telegram's update payload never
      // says which bot it's for; only the URL that was registered does.
      await telegramSetWebhook(token, `${webhookBaseUrl}/api/telegram/webhook/${me.id}`, webhookSecret);
      webhookRegistered = true;
      await supabase
        .from("telegram_bots")
        .update({ status: "connected", webhook_registered_at: new Date().toISOString(), last_error: null })
        .eq("user_id", userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook registration failed";
      await supabase.from("telegram_bots").update({ status: "error", last_error: message }).eq("user_id", userId);
      throw new Error(`Bot token is valid, but webhook registration failed: ${message}`);
    }
  } else {
    // No public URL configured yet (e.g. local dev) — token is validated and
    // stored, but the bot can't receive updates until deployed.
    await supabase.from("telegram_bots").update({ status: "pending" }).eq("user_id", userId);
  }

  return { botUsername: me.username ?? null, webhookRegistered };
}

export async function disconnectTelegramBot(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
  const { data: bot } = await supabase
    .from("telegram_bots")
    .select("bot_token_encrypted")
    .eq("user_id", userId)
    .maybeSingle();

  if (bot) {
    try {
      const token = decryptBotToken(bot.bot_token_encrypted);
      await telegramDeleteWebhook(token);
    } catch {
      // Best-effort — still remove the local record even if Telegram is unreachable.
    }
  }

  await supabase.from("telegram_bots").delete().eq("user_id", userId);
}
