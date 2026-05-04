import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/seyf/api-error";
import { saveEtherfuseOnboardingSession } from "@/lib/etherfuse/onboarding-session";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";
import { computeEtherfuseReadiness } from "@/lib/seyf/etherfuse-readiness";

/**
 * GET /api/seyf/etherfuse/readiness
 * Semáforos de readiness para habilitar onramp programático.
 */
export async function GET() {
  try {
    const denied = guardEtherfuseRampRoutes();
    if (denied) return denied;

    const ctx = await getEtherfuseRampContext();
    if (!ctx) {
      const webhookConfigured = Boolean(process.env.ETHERFUSE_WEBHOOK_SECRET?.trim());
      return NextResponse.json({
        contextReady: false,
        walletRegistered: false,
        kycApproved: false,
        documentsUploaded: false,
        bankAccountReady: false,
        effectiveBankAccountId: null,
        trustlineReady: false,
        webhookConfigured,
        onrampEnabled: false,
        reasons: [
          "Sin contexto rampa: completa /identidad.",
          ...(process.env.NODE_ENV === "production" && !webhookConfigured
            ? ["Configura ETHERFUSE_WEBHOOK_SECRET y registra webhook kyc_updated."]
            : []),
          ...(process.env.NODE_ENV !== "production"
            ? ["En desarrollo puedes usar contexto MVP para pruebas internas."]
            : []),
        ],
      });
    }

    const readiness = await computeEtherfuseReadiness({
      customerId: ctx.customerId,
      publicKey: ctx.publicKey,
      bankAccountId: ctx.bankAccountId,
      source: ctx.source,
    });

    if (
      readiness.bankAccountReady &&
      readiness.effectiveBankAccountId &&
      readiness.effectiveBankAccountId !== ctx.bankAccountId
    ) {
      await saveEtherfuseOnboardingSession({
        customerId: ctx.customerId,
        publicKey: ctx.publicKey,
        bankAccountId: readiness.effectiveBankAccountId,
      });
    }

    return NextResponse.json(readiness);
  } catch (e) {
    return toErrorResponse(e, "etherfuse/readiness");
  }
}
