/**
 * Extrae quoteId de la respuesta POST /ramp/quote (OpenAPI QuoteResponse u objetos anidados).
 */
export function quoteIdFromEtherfusePayload(q: unknown, depth = 0): string | undefined {
  if (depth > 5) return undefined;
  if (!q || typeof q !== "object") return undefined;
  const o = q as Record<string, unknown>;
  const nested = o.quote;
  if (nested && typeof nested === "object") {
    const inner = quoteIdFromEtherfusePayload(nested, depth + 1);
    if (inner) return inner;
  }
  if (typeof o.quoteId === "string" && o.quoteId.trim()) return o.quoteId.trim();
  if (typeof o.quote_id === "string" && o.quote_id.trim()) return o.quote_id.trim();
  if (typeof o.id === "string" && o.id.trim()) return o.id.trim();
  return undefined;
}
