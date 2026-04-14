import { NextResponse } from "next/server";
import { fetchRampableAssetsForWallet } from "@/lib/etherfuse/ramp-api";
import {
  SEYF_RAMP_UNAUTHORIZED_MESSAGE_ES,
  seyfApiError,
  seyfErrorFromUnknown,
} from "@/lib/seyf/api-error";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

/**
 * GET /api/seyf/etherfuse/assets
 * Lista activos rampables para la wallet de la sesión (cookie Etherfuse).
 */
export async function GET() {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

  const ctx = await getEtherfuseRampContext();
  if (!ctx) {
    return seyfApiError(401, "unauthorized", { message_es: SEYF_RAMP_UNAUTHORIZED_MESSAGE_ES });
  }

  try {
    const { assets } = await fetchRampableAssetsForWallet({
      walletPublicKey: ctx.publicKey,
    });
    return NextResponse.json({ assets, contextSource: ctx.source });
  } catch (e) {
    return seyfErrorFromUnknown(e);
  }
}
