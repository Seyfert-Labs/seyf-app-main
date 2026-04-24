import { NextResponse } from "next/server";
import { resolveMvpPartnerRampIdentity } from "@/lib/etherfuse/partner-accounts";
import { toErrorResponse } from "@/lib/seyf/api-error";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

function maskPk(pk: string) {
  if (pk.length <= 12) return pk;
  return `${pk.slice(0, 6)}…${pk.slice(-4)}`;
}

/**
 * GET /api/seyf/etherfuse/mvp/account
 * Wallet Stellar + IDs de cuenta bancaria y cliente (resolución vía API Etherfuse).
 */
export async function GET() {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

  try {
    const id = await resolveMvpPartnerRampIdentity();
    return NextResponse.json({
      walletPublicKey: id.publicKey,
      walletMasked: maskPk(id.publicKey),
      bankAccountId: id.bankAccountId,
      customerId: id.customerId,
    });
  } catch (e) {
    return toErrorResponse(e, "mvp/account");
  }
}
