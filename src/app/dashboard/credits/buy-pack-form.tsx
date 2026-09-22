"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { startPackPurchaseAction, type PurchaseFormState } from "@/lib/billing/actions";

const initialState: PurchaseFormState = {};

export interface Pack {
  code: string;
  name: string;
  priceKobo: number;
  credits: number;
}

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export function BuyPackForm({ packs, billingConfigured }: { packs: Pack[]; billingConfigured: boolean }) {
  const [state, action, pending] = useActionState(startPackPurchaseAction, initialState);

  return (
    <div className="space-y-4">
      {!billingConfigured && (
        <Alert variant="info">
          Checkout isn&apos;t configured yet — purchases will be available once billing credentials are set.
        </Alert>
      )}
      {state.error && <Alert variant="danger">{state.error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        {packs.map((pack) => (
          <form key={pack.code} action={action} className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <input type="hidden" name="packCode" value={pack.code} />
            <p className="font-semibold">{pack.name}</p>
            <p className="text-2xl font-semibold">{formatNaira(pack.priceKobo)}</p>
            <p className="text-sm text-muted">{pack.credits} credits</p>
            <Button type="submit" disabled={pending || !billingConfigured} className="mt-2">
              {pending ? "Redirecting..." : "Buy"}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
