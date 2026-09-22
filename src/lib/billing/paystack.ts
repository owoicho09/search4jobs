import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  InitializeTransactionParams,
  InitializeTransactionResult,
  ParsedWebhookEvent,
  PaymentProvider,
  VerifyTransactionResult,
} from "@/lib/billing/provider";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getSecretKey(): string | undefined {
  return process.env.PAYMENT_PROVIDER_SECRET_KEY;
}

class PaystackProvider implements PaymentProvider {
  readonly name = "paystack";

  isConfigured(): boolean {
    return Boolean(getSecretKey());
  }

  private requireSecretKey(): string {
    const key = getSecretKey();
    if (!key) {
      throw new Error("Billing is not configured (missing PAYMENT_PROVIDER_SECRET_KEY).");
    }
    return key;
  }

  async initializeTransaction(params: InitializeTransactionParams): Promise<InitializeTransactionResult> {
    const secretKey = this.requireSecretKey();

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });

    const json = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { authorization_url: string; access_code: string; reference: string };
    };

    if (!response.ok || !json.status || !json.data) {
      throw new Error(`Paystack initialize failed: ${json.message ?? response.statusText}`);
    }

    return {
      authorizationUrl: json.data.authorization_url,
      accessCode: json.data.access_code,
      reference: json.data.reference,
    };
  }

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    const secretKey = this.requireSecretKey();

    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );

    const json = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { status: string; reference: string; amount: number };
    };

    if (!response.ok || !json.status || !json.data) {
      throw new Error(`Paystack verify failed: ${json.message ?? response.statusText}`);
    }

    const status = json.data.status === "success" ? "success" : json.data.status === "abandoned" ? "pending" : "failed";

    return { status, reference: json.data.reference, amountKobo: json.data.amount };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    const secretKey = getSecretKey();
    if (!secretKey || !signatureHeader) return false;

    // Paystack has no separate webhook-signing secret — it signs with the
    // same account secret key (HMAC-SHA512 of the raw request body).
    const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");

    const expectedBuffer = Buffer.from(expected, "hex");
    const providedBuffer = Buffer.from(signatureHeader, "hex");
    if (expectedBuffer.length !== providedBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, providedBuffer);
  }

  parseWebhookEvent(rawBody: string): ParsedWebhookEvent | null {
    try {
      const json = JSON.parse(rawBody) as {
        event?: string;
        data?: { reference?: string; status?: string };
      };

      const eventType = json.event;
      const reference = json.data?.reference;
      if (!eventType || !reference) return null;

      const status =
        json.data?.status === "success"
          ? "success"
          : json.data?.status === "failed"
            ? "failed"
            : json.data?.status === "abandoned"
              ? "pending"
              : "unknown";

      return { eventType, reference, dedupeKey: `${eventType}:${reference}`, status };
    } catch {
      return null;
    }
  }
}

export const paystackProvider = new PaystackProvider();
