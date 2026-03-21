import { NextResponse } from "next/server";
import { z } from "zod";
import { getEtherfuseOnboardingSession } from "@/lib/etherfuse/onboarding-session";
import { createMxOnrampOrder } from "@/lib/etherfuse/ramp-api";
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

  const session = await getEtherfuseOnboardingSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sesión Etherfuse requerida. Completa el flujo en /identidad." },
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
    const order = await createMxOnrampOrder({
      bankAccountId: session.bankAccountId,
      quoteId: parsed.data.quoteId,
      publicKey: session.publicKey,
    });
    return NextResponse.json({ order });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear orden";
    const conflict = message.includes("409") || message.toLowerCase().includes("pending");
    return NextResponse.json(
      { error: message },
      { status: conflict ? 409 : 502 },
    );
  }
}
