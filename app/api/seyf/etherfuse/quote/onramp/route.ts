import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createMxOnrampQuote,
  fetchRampableAssetsForWallet,
  pickOnrampTargetIdentifier,
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
    const target = pickOnrampTargetIdentifier(
      assets,
      parsed.data.targetAsset ?? null,
    );
    if (!target) {
      return seyfApiError(422, "validation_error", {
        message_es:
          "No hay un activo destino configurado para esta cotización. Revisa la configuración o elige otro activo.",
      });
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
    console.error("[quote/onramp]", e);
    return seyfErrorFromUnknown(e);
  }
}
