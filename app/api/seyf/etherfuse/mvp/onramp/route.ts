import { NextResponse } from "next/server";
import { z } from "zod";
import { executeMvpPartnerOnramp } from "@/lib/etherfuse/mvp-onramp";
import {
  seyfApiError,
  seyfErrorFromUnknown,
  SEYF_VALIDATION_MESSAGE_ES,
} from "@/lib/seyf/api-error";
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
    return seyfApiError(400, "bad_json");
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return seyfApiError(400, "validation_error", { message_es: SEYF_VALIDATION_MESSAGE_ES });
  }

  const mxn = Number.parseFloat(parsed.data.sourceAmount.replace(",", "."));
  if (!Number.isFinite(mxn) || mxn < 500) {
    return seyfApiError(400, "validation_error", {
      message_es: "El monto no es válido o es menor al mínimo permitido (500 MXN).",
    });
  }

  try {
    const result = await executeMvpPartnerOnramp({
      sourceAmount: parsed.data.sourceAmount,
      amountMxn: mxn,
      forceNew: parsed.data.forceNew === true,
    });
    return NextResponse.json(result);
  } catch (e) {
    return seyfErrorFromUnknown(e);
  }
}
