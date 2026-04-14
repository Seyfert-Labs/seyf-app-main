import type { NextResponse } from "next/server";
import { seyfApiError } from "@/lib/seyf/api-error";

/**
 * Igual que el mock de inversión: en producción la rampa vía API solo si se habilita explícitamente.
 */
export function guardEtherfuseRampRoutes(): NextResponse | null {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SEYF_ALLOW_ETHERFUSE_RAMP !== "true"
  ) {
    return seyfApiError(403, "forbidden", {
      message_es:
        "La rampa de depósito/retiro no está disponible en este entorno. Contacta al equipo si necesitas usarla.",
    });
  }
  return null;
}
