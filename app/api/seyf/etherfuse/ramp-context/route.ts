import { NextResponse } from "next/server";
import { resolveMvpPartnerCryptoWalletId } from "@/lib/etherfuse/partner-accounts";
import { toErrorResponse } from "@/lib/seyf/api-error";
import { getEtherfuseKycGateResult } from "@/lib/seyf/etherfuse-kyc-guard";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

/**
 * GET /api/seyf/etherfuse/ramp-context
 * Wallet y IDs que usan las rutas de cotización/orden (misma lógica que GET /ramp/assets y POST order).
 * Incluye si Etherfuse devolvió un `cryptoWalletId` para esa clave Stellar (recomendado en órdenes).
 */
export async function GET() {
  try {
    const denied = guardEtherfuseRampRoutes();
    if (denied) return denied;

    const ctx = await getEtherfuseRampContext();
    if (!ctx) {
      const productionMsg =
        "Sin contexto rampa: completa /identidad para crear sesión onboarding real.";
      const devMsg =
        "Sin contexto rampa: completa /identidad o configura ETHERFUSE_MVP_* en desarrollo.";
      return NextResponse.json(
        {
          publicKey: "",
          customerId: "",
          bankAccountId: "",
          source: "cookie",
          cryptoWalletId: null,
          cryptoWalletResolved: false,
          cryptoWalletError: null,
          kycStatus: null,
          kycApproved: false,
          kycReason:
            process.env.NODE_ENV === "production" ? productionMsg : devMsg,
        },
      );
    }

    let cryptoWalletId: string | null = null;
    let cryptoWalletError: string | null = null;
    let kycStatus: string | null = null;
    let kycApproved = false;
    let kycReason: string | null = null;
    try {
      cryptoWalletId = await resolveMvpPartnerCryptoWalletId(ctx.publicKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[seyf/ramp-context] cryptoWallet lookup failed:", msg);
      cryptoWalletError = msg;
    }
    try {
      const kycGate = await getEtherfuseKycGateResult({
        customerId: ctx.customerId,
        publicKey: ctx.publicKey,
      });
      kycStatus = kycGate.status;
      kycApproved = kycGate.approved;
      kycReason = kycGate.reason;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[seyf/ramp-context] kyc status lookup failed:", msg);
      kycStatus = null;
      kycApproved = false;
      kycReason = "No pudimos validar tu estado KYC. Intenta de nuevo.";
    }

    return NextResponse.json({
      publicKey: ctx.publicKey,
      customerId: ctx.customerId,
      bankAccountId: ctx.bankAccountId,
      source: ctx.source,
      cryptoWalletId,
      cryptoWalletResolved: Boolean(cryptoWalletId),
      cryptoWalletError,
      kycStatus,
      kycApproved,
      kycReason,
    });
  } catch (e) {
    return toErrorResponse(e, "ramp-context");
  }
}
