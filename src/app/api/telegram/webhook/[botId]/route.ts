import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { decryptBotToken } from "@/lib/telegram/crypto";
import { handleTelegramCallback, handleTelegramMessage, isDuplicateUpdate } from "@/lib/telegram/handlers";
import type { TelegramUpdate } from "@/lib/telegram/types";

/**
 * One shared route handles every connected bot; the bot's Telegram id is in
 * the path (see lib/telegram/service.ts for why — Telegram updates don't
 * self-identify which bot they're for). We respond 200 immediately after
 * validating the request, then do the actual work in `after()` so Telegram
 * never waits on OpenAI/Adzuna calls.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ botId: string }> }) {
  const { botId: botIdParam } = await context.params;
  const telegramBotId = Number(botIdParam);
  if (!Number.isFinite(telegramBotId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || providedSecret !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  const { data: bot } = await supabase
    .from("telegram_bots")
    .select("id, user_id, bot_token_encrypted, status")
    .eq("telegram_bot_id", telegramBotId)
    .maybeSingle();

  // Unknown or disconnected bot — acknowledge so Telegram stops retrying,
  // but do nothing further. Never leak whether a bot id exists.
  if (!bot || bot.status === "disconnected") {
    return NextResponse.json({ ok: true });
  }

  const duplicate = await isDuplicateUpdate(supabase, bot.id, update.update_id);
  if (duplicate) {
    return NextResponse.json({ ok: true });
  }

  after(async () => {
    try {
      const token = decryptBotToken(bot.bot_token_encrypted);
      const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
      if (!chatId) return;

      const ctx = { supabase, token, userId: bot.user_id, chatId };

      if (update.message) {
        await handleTelegramMessage(ctx, update.message);
      } else if (update.callback_query) {
        await handleTelegramCallback(ctx, update.callback_query);
      }
    } catch {
      // Swallow — this runs after the response and has no caller to report to.
      // Individual handlers already send the user a friendly error message.
    }
  });

  return NextResponse.json({ ok: true });
}
