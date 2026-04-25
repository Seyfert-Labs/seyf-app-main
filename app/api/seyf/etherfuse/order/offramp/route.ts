import { NextResponse } from "next/server";
import { z } from "zod";
import { extractOrderIdFromCreateOrderResponse } from "@/lib/etherfuse/order-create-response";
import { resolveMvpPartnerCryptoWalletId } from "@/lib/etherfuse/partner-accounts";
import { createMxOfframpOrder } from "@/lib/etherfuse/ramp-api";
import { AppError, toErrorResponse } from "@/lib/seyf/api-error";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";
import { assertWalletActiveForUser } from "@/lib/seyf/wallet-provisioning";

const bodySchema = z.object({
  quoteId: z.string().uuid(),
  /** Stellar: flujo anchor (pago + memo) en lugar de burn prearmado. */
  useAnchor: z.boolean().optional(),
});

/**
 * POST /api/seyf/etherfuse/order/offramp
 * Cuerpo: { quoteId, useAnchor?: boolean } — quote de offramp (~2 min de validez).
 */
export async function POST(req: Request) {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

  const ctx = await getEtherfuseRampContext();
  if (!ctx) {
    return NextResponse.json(
      {
        error:
          "Sin contexto rampa: cookie /identidad o (solo dev) ETHERFUSE_MVP_* en .env.local.",
      },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await assertWalletActiveForUser(ctx.customerId);
    let cryptoWalletId: string | undefined;
    try {
      cryptoWalletId = await resolveMvpPartnerCryptoWalletId(ctx.publicKey);
    } catch {
      cryptoWalletId = undefined;
    }
    const order = await createMxOfframpOrder({
      bankAccountId: ctx.bankAccountId,
      quoteId: parsed.data.quoteId,
      ...(cryptoWalletId
        ? { cryptoWalletId }
        : { publicKey: ctx.publicKey }),
      ...(parsed.data.useAnchor === true ? { useAnchor: true } : {}),
    });
    const orderId = extractOrderIdFromCreateOrderResponse(order);
    return NextResponse.json({
      order,
      ...(orderId ? { orderId } : {}),
      contextSource: ctx.source,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("(409)")) {
      return toErrorResponse(
        new AppError("provider_unavailable", { statusCode: 409, retryable: false, message: e.message }),
        "order/offramp",
      );
    }
    return toErrorResponse(e, "order/offramp");
  }
}
