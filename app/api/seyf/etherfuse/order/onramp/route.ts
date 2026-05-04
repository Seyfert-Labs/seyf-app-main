import { NextResponse } from "next/server";
import { z } from "zod";
import { extractOrderIdFromCreateOrderResponse } from "@/lib/etherfuse/order-create-response";
import { createMxOnrampOrder } from "@/lib/etherfuse/ramp-api";
import { acceptAllEtherfuseAgreements } from "@/lib/etherfuse/agreements";
import { generateOnboardingPresignedUrlResolving409 } from "@/lib/etherfuse/onboarding";
import { AppError, toErrorResponse } from "@/lib/seyf/api-error";
import { upsertStoredAgreementsAccepted } from "@/lib/seyf/agreements-state-store";
import { assertEtherfuseKycApproved } from "@/lib/seyf/etherfuse-kyc-guard";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

const bodySchema = z.object({
  quoteId: z.string().uuid(),
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

  try {
    await assertEtherfuseKycApproved({
      customerId: ctx.customerId,
      publicKey: ctx.publicKey,
    });
    const buildOrder = () =>
      createMxOnrampOrder({
        bankAccountId: ctx.bankAccountId,
        quoteId: parsed.data.quoteId,
        publicKey: ctx.publicKey,
      });
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
  }
}
