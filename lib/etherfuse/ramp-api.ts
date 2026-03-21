import { randomUUID } from "node:crypto";
import { etherfuseFetch, etherfuseReadBody } from "./client";
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
    throw new Error(`Etherfuse /ramp/assets (${res.status}): ${text.slice(0, 400)}`);
  }
  const assets = json?.assets;
  return { assets: Array.isArray(assets) ? assets : [] };
}

/**
 * Elige CODE:ISSUER para onramp MXN → crypto (preferencia Seyf: MXNe si existe, luego USDC/CETES).
 */
export function pickOnrampTargetIdentifier(
  assets: RampableAssetRow[],
  explicit?: string | null,
): string | null {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  const fromEnv = process.env.ETHERFUSE_ONRAMP_TARGET_ASSET?.trim();
  if (fromEnv) return fromEnv;
  const prefs = ["MXNE", "USDC", "CETES"];
  for (const sym of prefs) {
    const row = assets.find(
      (a) => (a.symbol ?? "").toUpperCase() === sym.toUpperCase(),
    );
    if (row?.identifier) return row.identifier;
  }
  const first = assets.find((a) => a.identifier?.length);
  return first?.identifier ?? null;
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
  const { json, text } = await etherfuseReadBody<{ error?: string }>(res);
  if (!res.ok) {
    const msg =
      json && typeof json.error === "string" ? json.error : text.slice(0, 400);
    throw new Error(`Etherfuse /ramp/quote (${res.status}): ${msg}`);
  }
  return json;
}

/**
 * POST /ramp/order (usa quote previo; en onramp devuelve CLABE de depósito)
 * @see https://docs.etherfuse.com/api-reference/orders/create-a-new-order
 */
export async function createMxOnrampOrder(params: {
  bankAccountId: string;
  quoteId: string;
  publicKey: string;
  orderId?: string;
  memo?: string | null;
}): Promise<unknown> {
  const orderId = params.orderId ?? randomUUID();
  const body: Record<string, unknown> = {
    orderId,
    bankAccountId: params.bankAccountId,
    quoteId: params.quoteId,
    publicKey: params.publicKey,
  };
  if (params.memo) body.memo = params.memo;
  const res = await etherfuseFetch("/ramp/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const { json, text } = await etherfuseReadBody<{ error?: string }>(res);
  if (!res.ok) {
    const msg =
      json && typeof json.error === "string" ? json.error : text.slice(0, 400);
    throw new Error(`Etherfuse /ramp/order (${res.status}): ${msg}`);
  }
  return json;
}
