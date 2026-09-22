"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label } from "@/components/ui/form";
import { connectTelegramBotAction, disconnectTelegramBotAction, type TelegramFormState } from "@/lib/telegram/actions";

const initialState: TelegramFormState = {};

export function TelegramConnectForm() {
  const [state, action, pending] = useActionState(connectTelegramBotAction, initialState);

  return (
    <form action={action} className="space-y-3">
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      {state.success && (
        <Alert variant="success">
          Connected to @{state.botUsername ?? "your bot"}.{" "}
          {state.webhookRegistered
            ? "It's ready to receive messages."
            : "Deploy the app (or set TELEGRAM_WEBHOOK_BASE_URL) to finish activating it."}
        </Alert>
      )}

      <div>
        <Label htmlFor="token">Bot token</Label>
        <Input id="token" name="token" placeholder="123456789:AA..." autoComplete="off" required />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Connecting..." : "Connect bot"}
      </Button>
    </form>
  );
}

export function TelegramDisconnectButton() {
  const [state, action, pending] = useActionState(disconnectTelegramBotAction, initialState);

  return (
    <form action={action}>
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Disconnecting..." : "Disconnect"}
      </Button>
    </form>
  );
}
