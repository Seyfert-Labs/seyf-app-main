import { NextResponse } from "next/server";
import { getEtherfuseOnboardingSession } from "@/lib/etherfuse/onboarding-session";
import { fetchRampableAssetsForWallet } from "@/lib/etherfuse/ramp-api";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

/**
 * GET /api/seyf/etherfuse/assets
 * Lista activos rampables para la wallet de la sesión (cookie Etherfuse).
 */
export async function GET() {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

  const session = await getEtherfuseOnboardingSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sesión Etherfuse requerida. Completa el flujo en /identidad." },
      { status: 401 },
    );
  }

  try {
    const { assets } = await fetchRampableAssetsForWallet({
      walletPublicKey: session.publicKey,
    });
    return NextResponse.json({ assets });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al listar activos";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
