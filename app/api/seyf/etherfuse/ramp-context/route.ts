import { NextResponse } from "next/server";
import { resolveMvpPartnerCryptoWalletId } from "@/lib/etherfuse/partner-accounts";
import { toErrorMessage } from "@/lib/seyf/api-error";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

/**
 * GET /api/seyf/etherfuse/ramp-context
 * Wallet y IDs que usan las rutas de cotización/orden (misma lógica que GET /ramp/assets y POST order).
 * Incluye si Etherfuse devolvió un `cryptoWalletId` para esa clave Stellar (recomendado en órdenes).
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

  let cryptoWalletId: string | null = null;
  let cryptoWalletError: string | null = null;
  try {
    cryptoWalletId = await resolveMvpPartnerCryptoWalletId(ctx.publicKey);
  } catch (e) {
    const msg = toErrorMessage(e);
    console.error("[seyf/ramp-context] cryptoWallet lookup failed:", msg);
    cryptoWalletError = msg;
  }

  return NextResponse.json({
    publicKey: ctx.publicKey,
    customerId: ctx.customerId,
    bankAccountId: ctx.bankAccountId,
    source: ctx.source,
    cryptoWalletId,
    cryptoWalletResolved: Boolean(cryptoWalletId),
    cryptoWalletError,
  });
}
