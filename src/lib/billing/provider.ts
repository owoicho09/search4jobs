export interface InitializeTransactionParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifyTransactionResult {
  status: "success" | "failed" | "pending";
  reference: string;
  amountKobo: number;
}

export interface ParsedWebhookEvent {
  eventType: string;
  reference: string;
  dedupeKey: string;
  status: "success" | "failed" | "pending" | "unknown";
}

/**
 * Provider-agnostic billing interface so a second payment provider could be
 * added later without touching call sites. Paystack is the only
 * implementation for now (see paystack.ts), chosen because
 * PAYMENT_PROVIDER_SECRET_KEY's format and the brief's ₦ pricing match it.
 */
export interface PaymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  initializeTransaction(params: InitializeTransactionParams): Promise<InitializeTransactionResult>;
  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
  parseWebhookEvent(rawBody: string): ParsedWebhookEvent | null;
}
