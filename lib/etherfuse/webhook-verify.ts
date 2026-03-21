import { createHmac, timingSafeEqual } from "node:crypto";
import canonicalize from "canonicalize";

/**
 * Verifica X-Signature (HMAC-SHA256 sobre JSON canonicalizado JCS).
 * @see https://docs.etherfuse.com/guides/verifying-webhooks
 */
export function verifyEtherfuseWebhookSignature(
  payload: unknown,
  signatureHeader: string | null | undefined,
  secretBase64: string,
): boolean {
  if (!signatureHeader || !secretBase64) return false;
  const canonicalized = canonicalize(payload);
  if (canonicalized === undefined) return false;
  let key: Buffer;
  try {
    key = Buffer.from(secretBase64, "base64");
  } catch {
    return false;
  }
  if (key.length === 0) return false;
  const hmac = createHmac("sha256", key).update(canonicalized).digest("hex");
  const expected = `sha256=${hmac}`;
  if (expected.length !== signatureHeader.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
