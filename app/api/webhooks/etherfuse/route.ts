import { NextResponse } from "next/server";
import { seyfApiError } from "@/lib/seyf/api-error";
import { verifyEtherfuseWebhookSignature } from "@/lib/etherfuse/webhook-verify";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/etherfuse
 * Configura la URL en devnet (Ramp → Webhooks) apuntando a tu dominio + esta ruta.
 * Secreto en ETHERFUSE_WEBHOOK_SECRET (base64, el que devuelve create webhook una sola vez).
 *
 * @see https://docs.etherfuse.com/guides/verifying-webhooks
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return seyfApiError(400, "bad_json");
  }

  const secret = process.env.ETHERFUSE_WEBHOOK_SECRET?.trim();
  const sig = req.headers.get("x-signature");

  if (secret) {
    if (!verifyEtherfuseWebhookSignature(payload, sig, secret)) {
      return seyfApiError(401, "unauthorized", {
        message_es: "La firma del webhook no es válida.",
      });
    }
  } else if (process.env.NODE_ENV === "production") {
    return seyfApiError(503, "provider_unavailable", {
      message_es: "El servicio de webhooks no está configurado correctamente en el servidor.",
      retryable: false,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(
      "[webhook etherfuse]",
      typeof payload === "object" && payload !== null
        ? JSON.stringify(payload).slice(0, 2500)
        : String(payload),
    );
  }

  return NextResponse.json({ ok: true });
}
