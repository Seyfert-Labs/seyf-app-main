import { NextResponse } from "next/server";
import { z } from "zod";
import { extractOrderIdFromCreateOrderResponse } from "@/lib/etherfuse/order-create-response";
import { resolveMvpPartnerCryptoWalletId } from "@/lib/etherfuse/partner-accounts";
import { createMxOnrampOrder } from "@/lib/etherfuse/ramp-api";
import {
  SEYF_RAMP_UNAUTHORIZED_MESSAGE_ES,
  seyfApiError,
  seyfErrorFromUnknown,
  SEYF_VALIDATION_MESSAGE_ES,
} from "@/lib/seyf/api-error";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

const bodySchema = z.object({
  quoteId: z.string().uuid(),
});

/**
 * POST /api/seyf/etherfuse/order/onramp
 * Cuerpo: { quoteId } — debe ser el quoteId devuelto por Etherfuse en /ramp/quote (caduca en ~2 min).
 */
export async function POST(req: Request) {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

  const ctx = await getEtherfuseRampContext();
  if (!ctx) {
    return seyfApiError(401, "unauthorized", { message_es: SEYF_RAMP_UNAUTHORIZED_MESSAGE_ES });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return seyfApiError(400, "bad_json");
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return seyfApiError(400, "validation_error", { message_es: SEYF_VALIDATION_MESSAGE_ES });
  }

  try {
    let cryptoWalletId: string | undefined;
    try {
      cryptoWalletId = await resolveMvpPartnerCryptoWalletId(ctx.publicKey);
    } catch {
      cryptoWalletId = undefined;
    }
    const order = await createMxOnrampOrder({
      bankAccountId: ctx.bankAccountId,
      quoteId: parsed.data.quoteId,
      ...(cryptoWalletId
        ? { cryptoWalletId }
        : { publicKey: ctx.publicKey }),
    });
    const orderId = extractOrderIdFromCreateOrderResponse(order);
    return NextResponse.json({
      order,
      ...(orderId ? { orderId } : {}),
      contextSource: ctx.source,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const conflict =
      message.includes("409") || message.toLowerCase().includes("pending");
    if (conflict) {
      return seyfApiError(409, "conflict", {
        message_es:
          "Ya hay una operación pendiente con estos datos. Espera un momento o cancela la anterior en Etherfuse.",
        retryable: false,
      });
    }
    return seyfErrorFromUnknown(e);
  }
}
