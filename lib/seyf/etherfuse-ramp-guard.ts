import { NextResponse } from "next/server";

/**
 * Igual que el mock de inversión: en producción la rampa vía API solo si se habilita explícitamente.
 */
export function guardEtherfuseRampRoutes(): NextResponse | null {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SEYF_ALLOW_ETHERFUSE_RAMP !== "true"
  ) {
    return NextResponse.json(
      {
        error:
          "Rampa Etherfuse deshabilitada en producción. Establece SEYF_ALLOW_ETHERFUSE_RAMP=true o usa otro entorno.",
      },
      { status: 403 },
    );
  }
  return null;
}
