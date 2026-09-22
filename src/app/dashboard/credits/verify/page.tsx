import Link from "next/link";

import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/dal";
import { finalizeTransaction } from "@/lib/billing/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function VerifyPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  await requireAuthUser();
  const { reference } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let outcome: "success" | "failed" | "pending" | "error" = "error";
  let message = "We couldn't verify that payment.";

  if (reference) {
    try {
      const result = await finalizeTransaction(supabase, reference);
      outcome = result.status;
      message =
        result.status === "success"
          ? "Payment confirmed — credits have been added to your account."
          : result.status === "pending"
            ? "Payment is still processing. Check back shortly."
            : "This payment did not succeed. No credits were added.";
    } catch {
      message = "We couldn't verify that payment. If you were charged, contact support.";
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <Card>
        <Alert variant={outcome === "success" ? "success" : outcome === "pending" ? "info" : "danger"}>
          {message}
        </Alert>
        <Link href="/dashboard/credits" className="mt-4 inline-block">
          <Button>Back to Credits &amp; Plans</Button>
        </Link>
      </Card>
    </div>
  );
}
