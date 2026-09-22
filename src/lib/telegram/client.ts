import "server-only";

export class TelegramApiError extends Error {
  constructor(method: string, public description?: string) {
    super(`Telegram API error calling ${method}${description ? `: ${description}` : ""}`);
    this.name = "TelegramApiError";
  }
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramMeResult {
  id: number;
  is_bot: boolean;
  username?: string;
  first_name: string;
}

async function callTelegramApi<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  // Never log `token` or the full request/response — bot tokens are secrets.
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await response.json()) as { ok: boolean; result?: T; description?: string };

  if (!json.ok) {
    throw new TelegramApiError(method, json.description);
  }

  return json.result as T;
}

export async function telegramGetMe(token: string): Promise<TelegramMeResult> {
  return callTelegramApi<TelegramMeResult>(token, "getMe");
}

export async function telegramSetWebhook(token: string, url: string, secretToken: string): Promise<void> {
  await callTelegramApi(token, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
  });
}

export async function telegramDeleteWebhook(token: string): Promise<void> {
  await callTelegramApi(token, "deleteWebhook", { drop_pending_updates: false });
}

export async function telegramSendMessage(
  token: string,
  chatId: number,
  text: string,
  options?: { replyMarkup?: { inline_keyboard: TelegramInlineKeyboardButton[][] } | { keyboard: string[][]; resize_keyboard: boolean } }
): Promise<void> {
  await callTelegramApi(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: options?.replyMarkup,
  });
}

export async function telegramAnswerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await callTelegramApi(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}
