import { randomUUID } from "node:crypto";
import {
  etherfuseFetch,
  etherfuseReadBody,
  extractEtherfuseErrorMessage,
} from "./client";
import {
  getEtherfuseDefaultBlockchain,
  type EtherfuseBlockchain,
} from "./integration-model";

export type RampableAssetRow = {
  symbol?: string;
  identifier?: string;
  name?: string;
  currency?: string | null;
  balance?: string | null;
  image?: string | null;
};

/**
 * GET /ramp/assets
 * @see https://docs.etherfuse.com/api-reference/assets/get-rampable-assets
 */
export async function fetchRampableAssetsForWallet(params: {
  walletPublicKey: string;
  blockchain?: EtherfuseBlockchain;
  currency?: string;
}): Promise<{ assets: RampableAssetRow[] }> {
  const blockchain = params.blockchain ?? getEtherfuseDefaultBlockchain();
  const currency = (params.currency ?? "mxn").toLowerCase();
  const q = new URLSearchParams({
    blockchain,
    currency,
    wallet: params.walletPublicKey,
  });
  const res = await etherfuseFetch(`/ramp/assets?${q}`, { method: "GET" });
  const { json, text } = await etherfuseReadBody<{ assets?: RampableAssetRow[] }>(
    res,
  );
  if (!res.ok) {
    const msg = extractEtherfuseErrorMessage(json, text, 400);
    throw new Error(`Etherfuse /ramp/assets (${res.status}): ${msg}`);
  }
  const assets = json?.assets;
  return { assets: Array.isArray(assets) ? assets : [] };
}

/**
 * Elige CODE:ISSUER para onramp MXN → crypto (preferencia Seyf: CETES estable, luego MXNe/USDC).
 *
 * `ETHERFUSE_ONRAMP_TARGET_ASSET` ya no tiene prioridad sobre GET /ramp/assets: un issuer obsoleto
 * en .env provoca `NonStableAsset` en sandbox; solo se usa si coincide con un `identifier` devuelto
 * por la API o si la lista de activos viene vacía.
 */
export function pickOnrampTargetIdentifier(
  assets: RampableAssetRow[],
  explicit?: string | null,
): string | null {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  const fromEnv = process.env.ETHERFUSE_ONRAMP_TARGET_ASSET?.trim();
  const prefs = ["CETES", "MXNE", "USDC"];
  for (const sym of prefs) {
    const row = assets.find(
      (a) => (a.symbol ?? "").toUpperCase() === sym.toUpperCase(),
    );
    if (row?.identifier) return row.identifier;
  }
  if (fromEnv && assets.length > 0) {
    const inList = assets.some(
      (a) => (a.identifier ?? "").trim() === fromEnv,
    );
    if (inList) return fromEnv;
  }
  const first = assets.find((a) => a.identifier?.length);
  if (first?.identifier) return first.identifier;
  if (fromEnv) return fromEnv;
  return null;
}

/** Activo CETES (CODE:ISSUER) para onramp MXN → CETES en Stellar. */
export function pickCetesTargetIdentifier(
  assets: RampableAssetRow[],
): string | null {
  const row = assets.find(
    (a) => (a.symbol ?? "").toUpperCase() === "CETES",
  );
  return row?.identifier?.trim() ? row.identifier.trim() : null;
}

/**
 * POST /ramp/quote (onramp MXN → targetAsset)
 * @see https://docs.etherfuse.com/api-reference/quotes/get-quote-for-conversion
 */
export async function createMxOnrampQuote(params: {
  customerId: string;
  sourceAmount: string;
  targetAssetIdentifier: string;
  blockchain?: EtherfuseBlockchain;
  quoteId?: string;
}): Promise<unknown> {
  const quoteId = params.quoteId ?? randomUUID();
  const blockchain = params.blockchain ?? getEtherfuseDefaultBlockchain();
  const res = await etherfuseFetch("/ramp/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteId,
      customerId: params.customerId,
      blockchain,
      quoteAssets: {
        type: "onramp",
        sourceAsset: "MXN",
        targetAsset: params.targetAssetIdentifier,
      },
      sourceAmount: params.sourceAmount,
    }),
  });
  const { json, text } = await etherfuseReadBody(res);
  if (!res.ok) {
    const msg = extractEtherfuseErrorMessage(json, text, 400);
    throw new Error(`Etherfuse /ramp/quote (${res.status}): ${msg}`);
  }
  return json;
}

/**
 * POST /ramp/order (usa quote previo; en onramp devuelve CLABE de depósito)
 * Stellar: preferir `cryptoWalletId` (UUID de GET /ramp/wallets) para evitar "Proxy account not found".
 * @see https://docs.etherfuse.com/guides/testing-onramps
 * @see https://docs.etherfuse.com/api-reference/orders/create-a-new-order
 */
export async function createMxOnrampOrder(params: {
  bankAccountId: string;
  quoteId: string;
  /** Obligatorio si no envías cryptoWalletId */
  publicKey?: string;
  /** UUID del registro en /ramp/wallets — recomendado en Stellar */
  cryptoWalletId?: string;
  orderId?: string;
  memo?: string | null;
}): Promise<unknown> {
  const hasPk = Boolean(params.publicKey?.trim());
  const hasWid = Boolean(params.cryptoWalletId?.trim());
  if (!hasPk && !hasWid) {
    throw new Error("createMxOnrampOrder: indica publicKey o cryptoWalletId");
  }
  const orderId = params.orderId ?? randomUUID();
  const body: Record<string, unknown> = {
    orderId,
    bankAccountId: params.bankAccountId,
    quoteId: params.quoteId,
  };
  if (hasWid) body.cryptoWalletId = params.cryptoWalletId!.trim();
  if (hasPk) body.publicKey = params.publicKey!.trim();
  if (params.memo) body.memo = params.memo;
  const res = await etherfuseFetch("/ramp/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const { json, text } = await etherfuseReadBody(res);
  if (!res.ok) {
    const msg = extractEtherfuseErrorMessage(json, text, 400);
    throw new Error(`Etherfuse /ramp/order (${res.status}): ${msg}`);
  }
  return json;
}
