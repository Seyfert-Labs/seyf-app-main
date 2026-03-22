import { getEtherfuseBaseUrl } from "@/lib/etherfuse/config";

/**
 * Respuesta de GET /lookup/stablebonds (público, sin API key).
 * @see https://docs.etherfuse.com/api-reference/lookup/get-all-stablebonds
 */
export type EtherfuseStablebondInfo = {
  symbol?: string;
  netAmountDecimal?: string;
  netValueDecimal?: string;
  bondCurrency?: string;
  /** Precio del token en moneda del bono (p. ej. MXN por 1 CETES token) — no es la tasa anual gubernamental CETES */
  tokenPriceDecimal?: string;
  purchaseOrderAmount?: string;
  redeemOrderAmount?: string;
  blockchains?: Array<{
    blockchain?: string;
    tokenIdentifier?: string;
    totalSupply?: string;
  }>;
  solanaMintAddress?: string;
};

export type EtherfuseStablebondsResponse = {
  calculatedAt?: string;
  stablebonds?: EtherfuseStablebondInfo[];
};

/**
 * Lookup público (sin Authorization). Caché recomendado ~5 min según docs Etherfuse.
 */
export async function fetchEtherfuseStablebonds(
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<EtherfuseStablebondsResponse> {
  const base = getEtherfuseBaseUrl();
  const res = await fetch(`${base}/lookup/stablebonds`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Etherfuse /lookup/stablebonds: respuesta no JSON (${res.status})`);
  }
  if (!res.ok) {
    const err =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : text.slice(0, 200);
    throw new Error(`Etherfuse /lookup/stablebonds (${res.status}): ${err}`);
  }
  return json as EtherfuseStablebondsResponse;
}

export function pickCetesStablebond(
  data: EtherfuseStablebondsResponse,
): EtherfuseStablebondInfo | null {
  const list = data.stablebonds;
  if (!Array.isArray(list)) return null;
  const row = list.find((b) => (b.symbol ?? "").toUpperCase() === "CETES");
  return row ?? null;
}
