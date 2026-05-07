import { NextResponse } from "next/server";
import { z } from "zod";
import { extractOrderIdFromCreateOrderResponse } from "@/lib/etherfuse/order-create-response";
import { createMxOnrampOrder } from "@/lib/etherfuse/ramp-api";
import { resolveMvpPartnerCryptoWalletId } from "@/lib/etherfuse/partner-accounts";
import { acceptAllEtherfuseAgreements } from "@/lib/etherfuse/agreements";
import { generateOnboardingPresignedUrlResolving409 } from "@/lib/etherfuse/onboarding";
import { AppError, toErrorResponse } from "@/lib/seyf/api-error";
import { upsertStoredAgreementsAccepted } from "@/lib/seyf/agreements-state-store";
import { assertEtherfuseKycApproved } from "@/lib/seyf/etherfuse-kyc-guard";
import { resolveEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";
import { acquireOnrampLock, releaseOnrampLock } from "@/lib/seyf/redis-guards";

const bodySchema = z.object({
  quoteId: z.string().uuid(),
  wallet: z.string().optional(), // wallet hint para buscar sesión en Redis
});

async function ensureAgreementsForWallet(ctx: {
  customerId: string;
  bankAccountId: string;
  publicKey: string;
}): Promise<void> {
  const resolved = await generateOnboardingPresignedUrlResolving409({
    customerId: ctx.customerId,
    bankAccountId: ctx.bankAccountId,
    publicKey: ctx.publicKey,
  });
  await acceptAllEtherfuseAgreements({
    presignedUrl: resolved.presignedUrl,
  });
  await upsertStoredAgreementsAccepted({
    customerId: resolved.customerId,
    walletPublicKey: ctx.publicKey,
  });
}

/**
 * POST /api/seyf/etherfuse/order/onramp
 * Cuerpo: { quoteId } — debe ser el quoteId devuelto por Etherfuse en /ramp/quote (caduca en ~2 min).
 */
export async function POST(req: Request) {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Usar wallet hint del body para buscar sesión en Redis (más confiable que solo cookie)
  const ctx = await resolveEtherfuseRampContext({
    walletPublicKeyHint: parsed.data.wallet ?? null,
  });
  if (!ctx) {
    return NextResponse.json(
      {
        error:
          "Sin contexto rampa: completa /identidad o activa tu cuenta CLABE en /anadir.",
      },
      { status: 401 },
    );
  }

  // Distributed lock — prevents concurrent onramp orders for the same customer
  const locked = await acquireOnrampLock(ctx.customerId);
  if (!locked) {
    return NextResponse.json(
      {
        error: {
          code: "conflict",
          message_es: "Ya hay una orden en proceso. Espera unos segundos e intenta de nuevo.",
          retryable: true,
        },
      },
      { status: 409 },
    );
  }
  try {
    await assertEtherfuseKycApproved({
      customerId: ctx.customerId,
      publicKey: ctx.publicKey,
    });
    const buildOrder = async () => {
      const cryptoWalletId = await resolveMvpPartnerCryptoWalletId(ctx.publicKey);
      return createMxOnrampOrder({
        bankAccountId: ctx.bankAccountId,
        quoteId: parsed.data.quoteId,
        cryptoWalletId,
      });
    };
    let order: unknown;
    try {
      order = await buildOrder();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("terms and conditions")) {
        await ensureAgreementsForWallet({
          customerId: ctx.customerId,
          bankAccountId: ctx.bankAccountId,
          publicKey: ctx.publicKey,
        });
        order = await buildOrder();
      } else {
        throw e;
      }
    }
    const orderId = extractOrderIdFromCreateOrderResponse(order);
    return NextResponse.json({
      order,
      ...(orderId ? { orderId } : {}),
      contextSource: ctx.source,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("(409)")) {
      return toErrorResponse(
        new AppError("provider_unavailable", { statusCode: 409, retryable: false, message: e.message }),
        "order/onramp",
      );
    }
    return toErrorResponse(e, "order/onramp");
  } finally {
    await releaseOnrampLock(ctx.customerId);
  }
}
