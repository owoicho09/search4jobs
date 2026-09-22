import { Badge } from "@/components/ui/feedback";
import { Card, CardHeading } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TelegramConnectForm, TelegramDisconnectButton } from "@/app/dashboard/telegram/telegram-connect-form";

export default async function TelegramPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { data: bot } = await supabase
    .from("telegram_bots")
    .select("bot_username, status, webhook_registered_at, last_error")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Telegram integration</h1>

      <Card>
        <CardHeading>How it works</CardHeading>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>
            Open Telegram and message{" "}
            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-medium text-brand">
              @BotFather
            </a>
            , then send <code>/newbot</code> and follow the prompts.
          </li>
          <li>BotFather gives you a token like <code>123456789:AA...</code> — copy it.</li>
          <li>Paste it below. We validate it with Telegram, store it encrypted, and never show it again.</li>
        </ol>
      </Card>

      <Card>
        <CardHeading>Connection status</CardHeading>
        {bot ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm">
              Connected to <span className="font-medium">@{bot.bot_username ?? "unknown"}</span>{" "}
              <Badge>{bot.status}</Badge>
            </p>
            {bot.status === "error" && bot.last_error && (
              <p className="text-sm text-danger">{bot.last_error}</p>
            )}
            {bot.status === "pending" && (
              <p className="text-sm text-muted">
                Token validated, but the webhook isn&apos;t registered yet — this happens automatically once the
                app is deployed with a public URL.
              </p>
            )}
            <TelegramDisconnectButton />
          </div>
        ) : (
          <div className="mt-3">
            <TelegramConnectForm />
          </div>
        )}
      </Card>
    </div>
  );
}
