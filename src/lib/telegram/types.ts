export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number };
  text?: string;
  reply_to_message?: { text?: string };
}

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number };
  message?: { chat: { id: number } };
  data?: string;
}
