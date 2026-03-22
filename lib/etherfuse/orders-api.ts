import { etherfuseFetch, etherfuseReadBody } from "./client";

type OrderRow = Record<string, unknown>;

function orderIdFromRow(row: OrderRow): string | undefined {
  if (typeof row.orderId === "string") return row.orderId;
  if (typeof row.order_id === "string") return row.order_id;
  return undefined;
}

function statusFromRow(row: OrderRow): string | undefined {
  if (typeof row.status === "string") return row.status;
  return undefined;
}

function typeFromRow(row: OrderRow): string | undefined {
  if (typeof row.orderType === "string") return row.orderType;
  if (typeof row.order_type === "string") return row.order_type;
  return undefined;
}

function bankFromRow(row: OrderRow): string | undefined {
  if (typeof row.bankAccountId === "string") return row.bankAccountId;
  if (typeof row.bank_account_id === "string") return row.bank_account_id;
  return undefined;
}

function amountFiatFromRow(row: OrderRow): number | undefined {
  const v = row.amountInFiat ?? row.amount_in_fiat;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * GET /ramp/orders (primera página)
 */
export async function fetchOrdersFirstPage(): Promise<OrderRow[]> {
  const res = await etherfuseFetch("/ramp/orders", { method: "GET" });
  const { json, text } = await etherfuseReadBody<{ items?: OrderRow[] }>(res);
  if (!res.ok) {
    throw new Error(`Etherfuse /ramp/orders (${res.status}): ${text.slice(0, 400)}`);
  }
  return Array.isArray(json?.items) ? json.items : [];
}

/**
 * Busca onramp pendiente (status created) con mismo banco y mismo monto fiat.
 */
export function findPendingOnrampOrderForAmount(
  orders: OrderRow[],
  bankAccountId: string,
  amountMxn: number,
): string | null {
  for (const row of orders) {
    if (typeFromRow(row)?.toLowerCase() !== "onramp") continue;
    if (statusFromRow(row)?.toLowerCase() !== "created") continue;
    if (bankFromRow(row) !== bankAccountId) continue;
    const fiat = amountFiatFromRow(row);
    if (fiat === undefined) continue;
    if (Math.abs(fiat - amountMxn) < 0.005) {
      const oid = orderIdFromRow(row);
      if (oid) return oid;
    }
  }
  return null;
}

/**
 * GET /ramp/order/{order_id}
 * @see https://docs.etherfuse.com/api-reference/orders/get-order-details
 */
export async function fetchOrderDetails(orderId: string): Promise<unknown> {
  const res = await etherfuseFetch(
    `/ramp/order/${encodeURIComponent(orderId)}`,
    { method: "GET" },
  );
  const { json, text } = await etherfuseReadBody(res);
  if (!res.ok) {
    throw new Error(
      `Etherfuse /ramp/order/${orderId} (${res.status}): ${text.slice(0, 400)}`,
    );
  }
  return json;
}

/**
 * POST /ramp/order/{order_id}/cancel — solo status `created`
 * @see https://docs.etherfuse.com/api-reference/orders/cancel-an-order
 */
export async function cancelOrder(orderId: string): Promise<void> {
  const res = await etherfuseFetch(
    `/ramp/order/${encodeURIComponent(orderId)}/cancel`,
    { method: "POST" },
  );
  const { text } = await etherfuseReadBody(res);
  if (!res.ok) {
    throw new Error(
      `Etherfuse cancel order (${res.status}): ${text.slice(0, 400)}`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Tras `fiat_received` el estado puede tardar; reintenta GET /ramp/order/{id}.
 */
export async function fetchOrderDetailsWithRetry(
  orderId: string,
  opts?: { attempts?: number; delayMs?: number },
): Promise<unknown> {
  const attempts = opts?.attempts ?? 5;
  const delayMs = opts?.delayMs ?? 1200;
  let last: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchOrderDetails(orderId);
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
      if (i < attempts - 1) await sleep(delayMs);
    }
  }
  throw last ?? new Error("fetchOrderDetailsWithRetry: sin respuesta");
}

/**
 * Campos de `Order` (GET /ramp/order/{id}, webhooks) para UI y depuración.
 * @see https://docs.etherfuse.com/api-reference/orders/get-order-details
 */
export type RampOrderTransactionDetails = {
  orderId: string | null;
  customerId: string | null;
  status: string | null;
  orderType: string | null;
  statusPage: string | null;
  depositClabe: string | null;
  confirmedTxSignature: string | null;
  amountInFiat: string | null;
  amountInTokens: string | null;
  exchangeRate: string | null;
  etherfuseMidMarketRate: string | null;
  feeBps: number | null;
  feeAmountInFiat: string | null;
  sourceAsset: string | null;
  targetAsset: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  walletId: string | null;
  bankAccountId: string | null;
};

function strFrom(
  o: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function intFrom(
  o: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
    if (typeof v === "string") {
      const n = Number.parseInt(v, 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

const emptyTxDetails: RampOrderTransactionDetails = {
  orderId: null,
  customerId: null,
  status: null,
  orderType: null,
  statusPage: null,
  depositClabe: null,
  confirmedTxSignature: null,
  amountInFiat: null,
  amountInTokens: null,
  exchangeRate: null,
  etherfuseMidMarketRate: null,
  feeBps: null,
  feeAmountInFiat: null,
  sourceAsset: null,
  targetAsset: null,
  createdAt: null,
  updatedAt: null,
  completedAt: null,
  walletId: null,
  bankAccountId: null,
};

/** Detalle de orden/transacción on-chain (GET /ramp/order/{id}). */
export function pickRampOrderTransactionDetails(
  order: unknown,
): RampOrderTransactionDetails {
  if (!order || typeof order !== "object") {
    return { ...emptyTxDetails };
  }
  const o = order as Record<string, unknown>;
  return {
    orderId: strFrom(o, "orderId", "order_id"),
    customerId: strFrom(o, "customerId", "customer_id"),
    status: strFrom(o, "status", "order_status"),
    orderType: strFrom(o, "orderType", "order_type"),
    statusPage: strFrom(o, "statusPage", "status_page"),
    depositClabe: strFrom(o, "depositClabe", "deposit_clabe"),
    confirmedTxSignature: strFrom(
      o,
      "confirmedTxSignature",
      "confirmed_tx_signature",
    ),
    amountInFiat: strFrom(o, "amountInFiat", "amount_in_fiat"),
    amountInTokens: strFrom(o, "amountInTokens", "amount_in_tokens"),
    exchangeRate: strFrom(o, "exchangeRate", "exchange_rate"),
    etherfuseMidMarketRate: strFrom(
      o,
      "etherfuseMidMarketRate",
      "etherfuse_mid_market_rate",
    ),
    feeBps: intFrom(o, "feeBps", "fee_bps"),
    feeAmountInFiat: strFrom(o, "feeAmountInFiat", "fee_amount_in_fiat"),
    sourceAsset: strFrom(o, "sourceAsset", "source_asset"),
    targetAsset: strFrom(o, "targetAsset", "target_asset"),
    createdAt: strFrom(o, "createdAt", "created_at"),
    updatedAt: strFrom(o, "updatedAt", "updated_at"),
    completedAt: strFrom(o, "completedAt", "completed_at"),
    walletId: strFrom(o, "walletId", "wallet_id"),
    bankAccountId: strFrom(o, "bankAccountId", "bank_account_id"),
  };
}

/** @deprecated Usar `pickRampOrderTransactionDetails` (mismo comportamiento). */
export function pickOrderDisplayFields(
  order: unknown,
): RampOrderTransactionDetails {
  return pickRampOrderTransactionDetails(order);
}

/**
 * Respuestas del panel onramp (`/dev/etherfuse-ramp`): `mxn-cetes` o JSON tras mock SPEI
 * (`orderDisplay`, `order`, `orderPolled`).
 */
export function extractConfirmedTxSignatureFromOnrampPanelJson(
  jsonStr: string,
): string | null {
  const s = jsonStr.trim();
  if (!s) return null;
  try {
    const root = JSON.parse(s) as Record<string, unknown>;
    const od = root.orderDisplay;
    if (od && typeof od === "object") {
      const sig = (od as { confirmedTxSignature?: unknown })
        .confirmedTxSignature;
      if (typeof sig === "string" && sig.trim().length > 0) return sig.trim();
    }
    for (const key of ["order", "orderPolled", "orderAfterPoll"] as const) {
      const raw = root[key];
      if (raw) {
        const d = pickRampOrderTransactionDetails(raw);
        if (d.confirmedTxSignature) return d.confirmedTxSignature;
      }
    }
  } catch {
    return null;
  }
  return null;
}
