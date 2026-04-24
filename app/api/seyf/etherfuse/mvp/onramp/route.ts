import { NextResponse } from "next/server";
import { z } from "zod";
import { executeMvpPartnerOnramp } from "@/lib/etherfuse/mvp-onramp";
import { toErrorResponse } from "@/lib/seyf/api-error";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

const bodySchema = z.object({
  sourceAmount: z.string().min(1),
  forceNew: z.boolean().optional(),
});

/**
 * POST /api/seyf/etherfuse/mvp/onramp
 * Cuenta bancaria + wallet Stellar desde la API de Etherfuse (tu org), sin cookie de /identidad.
 * Si Etherfuse responde 409, reutiliza la orden pendiente misma cuenta + monto.
 * forceNew: cancela esa orden pendiente (status created) y crea otra.
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

  const mxn = Number.parseFloat(parsed.data.sourceAmount.replace(",", "."));
  if (!Number.isFinite(mxn) || mxn < 500) {
    return NextResponse.json(
      { error: "Monto inválido o mínimo 500 MXN." },
      { status: 400 },
    );
  }

  try {
    const result = await executeMvpPartnerOnramp({
      sourceAmount: parsed.data.sourceAmount,
      amountMxn: mxn,
      forceNew: parsed.data.forceNew === true,
    });
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e, "mvp/onramp");
  }
}
