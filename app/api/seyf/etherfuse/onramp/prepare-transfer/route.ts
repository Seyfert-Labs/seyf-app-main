import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, toErrorResponse } from "@/lib/seyf/api-error";
import { resolveEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";
import { prepareSpeiDepositQuoteAndOrder } from "@/lib/seyf/etherfuse-spei-deposit-prepare";

const bodySchema = z.object({
  sourceAmount: z.string().min(1),
  targetAsset: z.string().min(5).optional(),
  wallet: z.string().optional(),
});

/**
 * POST /api/seyf/etherfuse/onramp/prepare-transfer
 * Una sola petición: cotización + orden SPEI (CLABE) con el mismo contexto — evita 400 por desfase quote/order.
 */
export async function POST(req: Request) {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

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

  const ctx = await resolveEtherfuseRampContext({
    walletPublicKeyHint: parsed.data.wallet ?? null,
  });
  if (!ctx) {
    return NextResponse.json(
      {
        error:
          "Sin contexto rampa: completa /identidad, activa CLABE en /anadir o pasa `wallet` en el body.",
      },
      { status: 401 },
    );
  }

  try {
    const result = await prepareSpeiDepositQuoteAndOrder({
      ctx,
      sourceAmount: parsed.data.sourceAmount,
      targetAsset: parsed.data.targetAsset ?? null,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: {
            code: "conflict",
            message_es: "Ya hay una orden en proceso. Espera unos segundos e intenta de nuevo.",
            retryable: true,
          },
        },
        { status: 409 },
      );
    }
    return NextResponse.json({
      order: result.order,
      quote: result.quote,
      targetAssetUsed: result.targetAssetUsed,
      contextSource: result.contextSource,
      ...(result.orderId ? { orderId: result.orderId } : {}),
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("(409)")) {
      return toErrorResponse(
        new AppError("provider_unavailable", { statusCode: 409, retryable: false, message: e.message }),
        "onramp/prepare-transfer",
      );
    }
    return toErrorResponse(e, "onramp/prepare-transfer");
  }
}
