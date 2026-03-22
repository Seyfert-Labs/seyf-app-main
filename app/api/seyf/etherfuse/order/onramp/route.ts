import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveMvpPartnerCryptoWalletId } from "@/lib/etherfuse/partner-accounts";
import { createMxOnrampOrder } from "@/lib/etherfuse/ramp-api";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

const bodySchema = z.object({
  quoteId: z.string().uuid(),
});

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
    let cryptoWalletId: string | undefined;
    try {
      cryptoWalletId = await resolveMvpPartnerCryptoWalletId(ctx.publicKey);
    } catch {
      cryptoWalletId = undefined;
    }
    const order = await createMxOnrampOrder({
      bankAccountId: ctx.bankAccountId,
      quoteId: parsed.data.quoteId,
      ...(cryptoWalletId
        ? { cryptoWalletId }
        : { publicKey: ctx.publicKey }),
    });
    return NextResponse.json({ order, contextSource: ctx.source });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear orden";
    const conflict = message.includes("409") || message.toLowerCase().includes("pending");
    return NextResponse.json(
      { error: message },
      { status: conflict ? 409 : 502 },
    );
  }
}
