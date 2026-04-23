import { NextResponse } from "next/server";
import { fetchRampableAssetsForWallet } from "@/lib/etherfuse/ramp-api";
import { toErrorResponse } from "@/lib/seyf/api-error";
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
    return NextResponse.json(
      {
        error:
          "Sin contexto rampa: cookie /identidad o (solo dev) ETHERFUSE_MVP_* en .env.local.",
      },
      { status: 401 },
    );
  }

  try {
    const { assets } = await fetchRampableAssetsForWallet({
      walletPublicKey: ctx.publicKey,
    });
    return NextResponse.json({ assets, contextSource: ctx.source });
  } catch (e) {
    return toErrorResponse(e, "etherfuse/assets");
  }
}
