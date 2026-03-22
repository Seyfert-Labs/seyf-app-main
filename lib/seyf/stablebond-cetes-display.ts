import type { EtherfuseStablebondInfo } from "@/lib/etherfuse/stablebonds-lookup";

export type CetesStablebondDisplay = {
  /** % anual u otro yield si la API lo expone (campos opcionales) */
  annualPercent: number | null;
  /** % vs par 1 MXN derivado de tokenPriceDecimal */
  premiumVsParPercent: number | null;
  priceMx: number | null;
};

function numFromUnknown(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Intenta leer un rendimiento % desde campos extra (no documentados en OpenAPI).
 * `annualYieldBps` → se convierte a % dividiendo entre 100.
 */
function annualPercentFromRecord(o: Record<string, unknown>): number | null {
  const keysPercent = [
    "annualYieldPercent",
    "yieldApy",
    "apy",
    "bondYieldPercent",
    "yieldPercent",
    "annualizedYieldPercent",
  ] as const;
  for (const k of keysPercent) {
    const n = numFromUnknown(o[k]);
    if (n != null && n >= 0 && n <= 200) return n;
  }
  const bps = numFromUnknown(o.annualYieldBps ?? o.yieldBps);
  if (bps != null && bps >= 0 && bps <= 20_000) return bps / 100;
  return null;
}

/**
 * A partir de la fila CETES de GET /lookup/stablebonds.
 */
export function cetesStablebondDisplayFromRow(
  cetes: EtherfuseStablebondInfo | null | undefined,
): CetesStablebondDisplay {
  if (!cetes || typeof cetes !== "object") {
    return { annualPercent: null, premiumVsParPercent: null, priceMx: null };
  }
  const o = cetes as Record<string, unknown>;
  const annualPercent = annualPercentFromRecord(o);

  const rawPrice = cetes.tokenPriceDecimal ?? o.tokenPriceDecimal;
  const priceMx = numFromUnknown(rawPrice);
  let premiumVsParPercent: number | null = null;
  if (priceMx != null && priceMx > 0 && priceMx < 1_000_000) {
    const premium = (priceMx - 1) * 100;
    if (premium >= -50 && premium <= 200) premiumVsParPercent = premium;
  }

  return { annualPercent, premiumVsParPercent, priceMx };
}
