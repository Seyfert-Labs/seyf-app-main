/**
 * Campos de respuesta POST /ramp/quote (OpenAPI QuoteResponse).
 * @see https://docs.etherfuse.com/api-reference/quotes/get-quote-for-conversion
 */
export function parseOfframpQuoteMxnPerSourceUnit(quote: unknown): number | null {
  if (!quote || typeof quote !== "object") return null;
  const o = quote as Record<string, unknown>;
  const srcRaw = o.sourceAmount ?? o.source_amount;
  const src =
    typeof srcRaw === "string"
      ? Number.parseFloat(srcRaw.replace(",", "."))
      : typeof srcRaw === "number"
        ? srcRaw
        : NaN;
  if (!Number.isFinite(src) || src <= 0) return null;

  const destPrefer =
    o.destinationAmountAfterFee ?? o.destination_amount_after_fee;
  const destRaw =
    destPrefer ?? o.destinationAmount ?? o.destination_amount;
  const dest =
    typeof destRaw === "string"
      ? Number.parseFloat(destRaw.replace(",", "."))
      : typeof destRaw === "number"
        ? destRaw
        : NaN;
  if (!Number.isFinite(dest) || dest < 0) return null;

  return dest / src;
}
