import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";

import { finalizeTransaction } from "@/lib/billing/service";
import { paystackProvider } from "@/lib/billing/paystack";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!paystackProvider.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const event = paystackProvider.parseWebhookEvent(rawBody);
  if (!event) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  const { error: insertError } = await supabase.from("payment_events").insert({
    provider: "paystack",
    dedupe_key: event.dedupeKey,
    event_type: event.eventType,
    payload: JSON.parse(rawBody),
  });

  // Unique violation on dedupe_key means we've already processed this exact
  // event — acknowledge without doing anything twice.
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (event.eventType === "charge.success") {
    after(async () => {
      try {
        await finalizeTransaction(supabase, event.reference);
        await supabase
          .from("payment_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("dedupe_key", event.dedupeKey);
      } catch {
        // Left unprocessed; the user's return-redirect calls finalizeTransaction
        // too and will complete it if this path fails.
      }
    });
  }

  return NextResponse.json({ ok: true });
}
