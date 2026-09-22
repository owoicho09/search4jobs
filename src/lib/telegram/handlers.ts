import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAppTunables } from "@/lib/config/app-config";
import { ensureDailyAllowanceAndGetBalance } from "@/lib/credits/service";
import { InsufficientCreditsError, UnsupportedSearchCountryError, runJobSearch } from "@/lib/search/orchestrator";
import { telegramAnswerCallbackQuery, telegramSendMessage, type TelegramInlineKeyboardButton } from "@/lib/telegram/client";
import { MAIN_MENU_KEYBOARD, MENU_BUTTON_LABELS } from "@/lib/telegram/menu";
import type { Database } from "@/lib/supabase/types";
import type { TelegramCallbackQuery, TelegramMessage } from "@/lib/telegram/types";

const PROMPTS = {
  titles: "Reply to this message with your target job titles, separated by commas.",
  location: "Reply to this message with your preferred location (or \"any\" for no preference).",
};

interface BotContext {
  supabase: SupabaseClient<Database>;
  token: string;
  userId: string;
  chatId: number;
}

/** Records the update id for idempotency; returns true if it was already processed. */
export async function isDuplicateUpdate(
  supabase: SupabaseClient<Database>,
  botRowId: string,
  updateId: number
): Promise<boolean> {
  const { error } = await supabase.from("telegram_updates").insert({ bot_id: botRowId, telegram_update_id: updateId });
  // 23505 = unique_violation on (bot_id, telegram_update_id) — we've seen this update before.
  return error?.code === "23505";
}

export async function handleTelegramMessage(ctx: BotContext, message: TelegramMessage): Promise<void> {
  const text = message.text?.trim();
  if (!text) return;

  const replyPrompt = message.reply_to_message?.text;
  if (replyPrompt === PROMPTS.titles) {
    return handlePreferenceTitlesReply(ctx, text);
  }
  if (replyPrompt === PROMPTS.location) {
    return handlePreferenceLocationReply(ctx, text);
  }

  switch (text) {
    case "/start":
      return sendMainMenu(ctx, "Welcome! Use the menu below to search for jobs and manage your account.");
    case MENU_BUTTON_LABELS.findJobs:
      return showFindJobsOptions(ctx);
    case MENU_BUTTON_LABELS.preferences:
      return showPreferencesMenu(ctx);
    case MENU_BUTTON_LABELS.myCv:
      return showCvStatus(ctx);
    case MENU_BUTTON_LABELS.myMatches:
      return showMatches(ctx, 0);
    case MENU_BUTTON_LABELS.savedJobs:
      return showSavedJobs(ctx, 0);
    case MENU_BUTTON_LABELS.myCredits:
      return showCredits(ctx);
    case MENU_BUTTON_LABELS.getMoreCredits:
      return telegramSendMessage(ctx.token, ctx.chatId, `Buy more credits here: ${appUrl()}/dashboard/credits`);
    case MENU_BUTTON_LABELS.openDashboard:
      return telegramSendMessage(ctx.token, ctx.chatId, `Open your dashboard: ${appUrl()}`);
    default:
      return sendMainMenu(ctx, "I didn't understand that. Please use one of the menu buttons below.");
  }
}

export async function handleTelegramCallback(ctx: BotContext, callback: TelegramCallbackQuery): Promise<void> {
  const data = callback.data ?? "";
  await telegramAnswerCallbackQuery(ctx.token, callback.id);

  if (data.startsWith("find_jobs:qty:")) {
    const quantity = Number(data.split(":")[2]);
    return runSearchAndDeliver(ctx, quantity);
  }
  if (data.startsWith("matches:more:")) {
    return showMatches(ctx, Number(data.split(":")[2]));
  }
  if (data.startsWith("saved:more:")) {
    return showSavedJobs(ctx, Number(data.split(":")[2]));
  }
  if (data.startsWith("saved:remove:")) {
    return removeSavedJob(ctx, data.split(":")[2]);
  }
  if (data === "prefs:edit_titles") {
    return telegramSendMessage(ctx.token, ctx.chatId, PROMPTS.titles, { replyMarkup: undefined });
  }
  if (data === "prefs:edit_location") {
    return telegramSendMessage(ctx.token, ctx.chatId, PROMPTS.location, { replyMarkup: undefined });
  }
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "";
}

async function sendMainMenu(ctx: BotContext, text: string) {
  await telegramSendMessage(ctx.token, ctx.chatId, text, { replyMarkup: MAIN_MENU_KEYBOARD });
}

async function showFindJobsOptions(ctx: BotContext) {
  const [balance, tunables] = await Promise.all([
    ensureDailyAllowanceAndGetBalance(ctx.supabase, ctx.userId),
    getAppTunables(),
  ]);

  const affordable = tunables.searchQuantityOptions.filter((q) => q <= balance.total);

  if (affordable.length === 0) {
    await telegramSendMessage(
      ctx.token,
      ctx.chatId,
      `You have ${balance.total} credit(s) left today. That's not enough for a search — tap "${MENU_BUTTON_LABELS.getMoreCredits}" to top up, or come back after your daily allowance resets.`
    );
    return;
  }

  const buttons: TelegramInlineKeyboardButton[][] = [
    affordable.map((q) => ({ text: `${q} jobs`, callback_data: `find_jobs:qty:${q}` })),
  ];

  await telegramSendMessage(ctx.token, ctx.chatId, "How many jobs would you like?", {
    replyMarkup: { inline_keyboard: buttons },
  });
}

async function runSearchAndDeliver(ctx: BotContext, quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) return;

  await telegramSendMessage(ctx.token, ctx.chatId, `Searching for ${quantity} job(s)...`);

  try {
    const result = await runJobSearch(ctx.supabase, {
      userId: ctx.userId,
      source: "telegram",
      requestedCount: quantity,
    });

    if (result.status === "no_matches") {
      await telegramSendMessage(
        ctx.token,
        ctx.chatId,
        "No suitable jobs were found this time — no credits were used. Try adjusting your preferences and search again."
      );
      return;
    }

    if (result.delivered.length < quantity) {
      await telegramSendMessage(
        ctx.token,
        ctx.chatId,
        `Only ${result.delivered.length} of ${quantity} requested jobs met the relevance bar — you were only charged for what was delivered.`
      );
    }

    for (const match of result.delivered) {
      const lines = [
        `<b>${escapeHtml(match.candidate.title)}</b>`,
        match.candidate.company ? escapeHtml(match.candidate.company) : null,
        match.candidate.location ? escapeHtml(match.candidate.location) : null,
        `Relevance: ${Math.round(match.relevanceScore * 100)}%`,
        escapeHtml(match.explanation),
        match.candidate.listingUrl,
      ].filter(Boolean);
      await telegramSendMessage(ctx.token, ctx.chatId, lines.join("\n"));
    }
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      await telegramSendMessage(ctx.token, ctx.chatId, "You don't have enough credits for that many jobs anymore.");
      return;
    }
    if (err instanceof UnsupportedSearchCountryError) {
      await telegramSendMessage(
        ctx.token,
        ctx.chatId,
        "Your preferred country isn't supported by our job provider yet. Update it in Job Preferences or the dashboard."
      );
      return;
    }
    await telegramSendMessage(
      ctx.token,
      ctx.chatId,
      "Something went wrong running that search. No credits were charged — please try again shortly."
    );
  }
}

async function showPreferencesMenu(ctx: BotContext) {
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("preferred_titles, preferred_location, preferred_country, work_arrangement")
    .eq("user_id", ctx.userId)
    .single();

  const summary = [
    `Titles: ${profile?.preferred_titles?.length ? profile.preferred_titles.join(", ") : "not set"}`,
    `Location: ${profile?.preferred_location ?? "not set"}`,
    `Country: ${profile?.preferred_country ?? "not set"}`,
    `Arrangement: ${profile?.work_arrangement ?? "any"}`,
    "",
    "Full preference editing (country, salary, freshness) is available in the dashboard. You can update titles and location here:",
  ].join("\n");

  await telegramSendMessage(ctx.token, ctx.chatId, summary, {
    replyMarkup: {
      inline_keyboard: [
        [{ text: "Edit titles", callback_data: "prefs:edit_titles" }],
        [{ text: "Edit location", callback_data: "prefs:edit_location" }],
        [{ text: "Open full preferences", url: `${appUrl()}/dashboard/preferences` }],
      ],
    },
  });
}

async function handlePreferenceTitlesReply(ctx: BotContext, text: string) {
  const titles = text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);

  const { error } = await ctx.supabase.from("profiles").update({ preferred_titles: titles }).eq("user_id", ctx.userId);

  await telegramSendMessage(
    ctx.token,
    ctx.chatId,
    error ? "Couldn't save that — please try again." : `Saved! Target titles: ${titles.join(", ") || "(none)"}`
  );
}

async function handlePreferenceLocationReply(ctx: BotContext, text: string) {
  const location = text.toLowerCase() === "any" ? null : text.slice(0, 120);

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ preferred_location: location })
    .eq("user_id", ctx.userId);

  await telegramSendMessage(
    ctx.token,
    ctx.chatId,
    error ? "Couldn't save that — please try again." : `Saved! Preferred location: ${location ?? "anywhere"}`
  );
}

async function showCvStatus(ctx: BotContext) {
  const { data: cv } = await ctx.supabase
    .from("cv_files")
    .select("file_name, status, created_at")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const text = cv
    ? `CV on file: ${escapeHtml(cv.file_name)} (${cv.status})`
    : "No CV uploaded yet. A CV can improve your matches, but isn't required.";

  await telegramSendMessage(ctx.token, ctx.chatId, `${text}\n\nManage it here: ${appUrl()}/dashboard/cv`);
}

const PAGE_SIZE = 5;

async function showMatches(ctx: BotContext, offset: number) {
  const { data: matches } = await ctx.supabase
    .from("matches")
    .select("title, company, listing_url, delivered_at, ai_relevance_score")
    .eq("user_id", ctx.userId)
    .order("delivered_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (!matches || matches.length === 0) {
    await telegramSendMessage(
      ctx.token,
      ctx.chatId,
      offset === 0 ? "No matches yet — try Find Jobs to get started." : "No more matches."
    );
    return;
  }

  const lines = matches
    .map((m) => `<b>${escapeHtml(m.title)}</b> — ${m.company ? escapeHtml(m.company) : "?"}\n${m.listing_url}`)
    .join("\n\n");

  const buttons =
    matches.length === PAGE_SIZE
      ? { inline_keyboard: [[{ text: "More", callback_data: `matches:more:${offset + PAGE_SIZE}` }]] }
      : undefined;

  await telegramSendMessage(ctx.token, ctx.chatId, lines, { replyMarkup: buttons });
}

async function showSavedJobs(ctx: BotContext, offset: number) {
  const { data: saved } = await ctx.supabase
    .from("saved_jobs")
    .select("id, title, company, listing_url")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (!saved || saved.length === 0) {
    await telegramSendMessage(
      ctx.token,
      ctx.chatId,
      offset === 0 ? "No saved jobs yet." : "No more saved jobs."
    );
    return;
  }

  for (const job of saved) {
    await telegramSendMessage(
      ctx.token,
      ctx.chatId,
      `<b>${escapeHtml(job.title)}</b> — ${job.company ? escapeHtml(job.company) : "?"}\n${job.listing_url}`,
      { replyMarkup: { inline_keyboard: [[{ text: "Remove", callback_data: `saved:remove:${job.id}` }]] } }
    );
  }

  if (saved.length === PAGE_SIZE) {
    await telegramSendMessage(ctx.token, ctx.chatId, "—", {
      replyMarkup: { inline_keyboard: [[{ text: "More", callback_data: `saved:more:${offset + PAGE_SIZE}` }]] },
    });
  }
}

async function removeSavedJob(ctx: BotContext, savedJobId: string) {
  await ctx.supabase.from("saved_jobs").delete().eq("id", savedJobId).eq("user_id", ctx.userId);
  await telegramSendMessage(ctx.token, ctx.chatId, "Removed from saved jobs.");
}

async function showCredits(ctx: BotContext) {
  const balance = await ensureDailyAllowanceAndGetBalance(ctx.supabase, ctx.userId);
  const { data: subscription } = await ctx.supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const lines = [
    `Daily allowance remaining: ${balance.dailyBalance}`,
    `Purchased credits: ${balance.purchasedBalance}`,
    `Total available: ${balance.total}`,
    subscription
      ? `Subscription: ${subscription.status} (renews ${new Date(subscription.current_period_end).toLocaleDateString()})`
      : "Subscription: none (free daily allowance)",
    "",
    "Daily allowance resets at midnight UTC.",
  ];

  await telegramSendMessage(ctx.token, ctx.chatId, lines.join("\n"));
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
