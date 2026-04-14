import { NextResponse } from "next/server";
import { resolveMvpPartnerCryptoWalletId } from "@/lib/etherfuse/partner-accounts";
import {
  SEYF_RAMP_UNAUTHORIZED_MESSAGE_ES,
  seyfApiError,
} from "@/lib/seyf/api-error";
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
    return seyfApiError(401, "unauthorized", { message_es: SEYF_RAMP_UNAUTHORIZED_MESSAGE_ES });
  }

  let cryptoWalletId: string | null = null;
  let cryptoWalletResolveFailed = false;
  try {
    cryptoWalletId = await resolveMvpPartnerCryptoWalletId(ctx.publicKey);
  } catch (e) {
    cryptoWalletResolveFailed = true;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ramp-context] cryptoWalletId resolve failed", e);
    }
  }

  return NextResponse.json({
    publicKey: ctx.publicKey,
    customerId: ctx.customerId,
    bankAccountId: ctx.bankAccountId,
    source: ctx.source,
    cryptoWalletId,
    cryptoWalletResolved: Boolean(cryptoWalletId),
    cryptoWalletResolveFailed,
  });
}
