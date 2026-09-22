"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label } from "@/components/ui/form";
import { deleteAccountAction, type DeleteAccountFormState } from "@/lib/account/actions";

const initialState: DeleteAccountFormState = {};

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, initialState);

  return (
    <form action={action} className="space-y-3">
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      <p className="text-sm text-muted">
        This permanently deletes your account, profile, CV, matches, saved jobs, credit history, and
        connected Telegram bot. This cannot be undone.
      </p>
      <div>
        <Label htmlFor="confirm">Type DELETE to confirm</Label>
        <Input id="confirm" name="confirm" required />
      </div>
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Deleting..." : "Delete my account"}
      </Button>
    </form>
  );
}
