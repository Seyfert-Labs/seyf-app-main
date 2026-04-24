import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createMxOnrampQuote,
  fetchRampableAssetsForWallet,
  pickOnrampTargetIdentifier,
} from "@/lib/etherfuse/ramp-api";
import { toErrorResponse } from "@/lib/seyf/api-error";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

const bodySchema = z.object({
  sourceAmount: z.string().min(1),
  targetAsset: z.string().min(5).optional(),
});

/**
 * POST /api/seyf/etherfuse/quote/onramp
 * Cuerpo: { sourceAmount: string, targetAsset?: string } (monto en MXN, ej. "1000")
 */
export async function POST(req: Request) {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

  const ctx = await getEtherfuseRampContext();
  if (!ctx) {
    return NextResponse.json(
      {
        error:
          "Sin contexto rampa: cookie /identidad o (solo dev) variables ETHERFUSE_MVP_* en .env.local.",
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
    const { assets } = await fetchRampableAssetsForWallet({
      walletPublicKey: ctx.publicKey,
    });
    const target = pickOnrampTargetIdentifier(
      assets,
      parsed.data.targetAsset ?? null,
    );
    if (!target) {
      return NextResponse.json(
        {
          error:
            "No hay activo destino. Define ETHERFUSE_ONRAMP_TARGET_ASSET (CODE:ISSUER) o pasa targetAsset en el body.",
        },
        { status: 422 },
      );
    }

    const quote = await createMxOnrampQuote({
      customerId: ctx.customerId,
      sourceAmount: parsed.data.sourceAmount,
      targetAssetIdentifier: target,
    });
    return NextResponse.json({
      quote,
      targetAssetUsed: target,
      contextSource: ctx.source,
    });
  } catch (e) {
    return toErrorResponse(e, "quote/onramp");
  }
}
