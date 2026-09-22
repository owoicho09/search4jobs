import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.BOT_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("BOT_TOKEN_ENCRYPTION_KEY is not configured.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("BOT_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

/**
 * Encrypts a bot token for storage. Output packs iv + authTag + ciphertext
 * into one base64 string.
 *
 * Key rotation: rotating BOT_TOKEN_ENCRYPTION_KEY invalidates every
 * previously stored token. There is no automatic re-encryption path — after
 * rotating the key, every connected user must reconnect (re-paste) their
 * bot token. Rotate only alongside a plan to notify/reconnect users.
 */
export function encryptBotToken(token: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptBotToken(encrypted: string): string {
  const buffer = Buffer.from(encrypted, "base64");
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = buffer.subarray(IV_LENGTH + 16);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plaintext.toString("utf8");
}

/** Stable, non-reversible fingerprint used for the uniqueness constraint — never the raw token. */
export function hashBotToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
