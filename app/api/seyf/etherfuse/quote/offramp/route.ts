import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createMxOfframpQuote,
  fetchRampableAssetsForWallet,
  pickOfframpSourceIdentifier,
} from "@/lib/etherfuse/ramp-api";
import {
  SEYF_RAMP_UNAUTHORIZED_MESSAGE_ES,
  seyfApiError,
  seyfErrorFromUnknown,
  SEYF_VALIDATION_MESSAGE_ES,
} from "@/lib/seyf/api-error";
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
    const { assets } = await fetchRampableAssetsForWallet({
      walletPublicKey: ctx.publicKey,
    });
    const source = pickOfframpSourceIdentifier(
      assets,
      parsed.data.sourceAsset ?? null,
    );
    if (!source) {
      return seyfApiError(422, "validation_error", {
        message_es:
          "No hay un activo origen configurado para esta cotización. Revisa la configuración o elige otro activo.",
      });
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
    console.error("[quote/offramp]", e);
    return seyfErrorFromUnknown(e);
  }
}
