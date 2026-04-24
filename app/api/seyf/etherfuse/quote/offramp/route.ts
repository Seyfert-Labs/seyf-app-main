import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createMxOfframpQuote,
  fetchRampableAssetsForWallet,
  pickOfframpSourceIdentifier,
} from "@/lib/etherfuse/ramp-api";
import { toErrorResponse } from "@/lib/seyf/api-error";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

const bodySchema = z.object({
  /** Monto en el activo fuente (tokens), ej. "10" o "0.5" */
  sourceAmount: z.string().min(1),
  sourceAsset: z.string().min(5).optional(),
});

/**
 * POST /api/seyf/etherfuse/quote/offramp
 * Cuerpo: { sourceAmount, sourceAsset?: CODE:ISSUER } — venta crypto → MXN.
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
    const source = pickOfframpSourceIdentifier(
      assets,
      parsed.data.sourceAsset ?? null,
    );
    if (!source) {
      return NextResponse.json(
        {
          error:
            "No hay activo origen. Define ETHERFUSE_OFFRAMP_SOURCE_ASSET (CODE:ISSUER) o pasa sourceAsset en el body.",
        },
        { status: 422 },
      );
    }

    const quote = await createMxOfframpQuote({
      customerId: ctx.customerId,
      sourceAmount: parsed.data.sourceAmount,
      sourceAssetIdentifier: source,
    });
    return NextResponse.json({
      quote,
      sourceAssetUsed: source,
      contextSource: ctx.source,
    });
  } catch (e) {
    return toErrorResponse(e, "quote/offramp");
  }
}
