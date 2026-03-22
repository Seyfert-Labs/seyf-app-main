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

/** Campos útiles para UI (OpenAPI Order — ver get-order-details). */
export function pickOrderDisplayFields(order: unknown): {
  orderId: string | null;
  status: string | null;
  confirmedTxSignature: string | null;
  statusPage: string | null;
  depositClabe: string | null;
} {
  if (!order || typeof order !== "object") {
    return {
      orderId: null,
      status: null,
      confirmedTxSignature: null,
      statusPage: null,
      depositClabe: null,
    };
  }
  const o = order as Record<string, unknown>;
  const orderId =
    typeof o.orderId === "string"
      ? o.orderId
      : typeof o.order_id === "string"
        ? o.order_id
        : null;
  const status = typeof o.status === "string" ? o.status : null;
  const confirmedTxSignature =
    typeof o.confirmedTxSignature === "string"
      ? o.confirmedTxSignature
      : typeof o.confirmed_tx_signature === "string"
        ? o.confirmed_tx_signature
        : null;
  const statusPage =
    typeof o.statusPage === "string"
      ? o.statusPage
      : typeof o.status_page === "string"
        ? o.status_page
        : null;
  const depositClabe =
    typeof o.depositClabe === "string"
      ? o.depositClabe
      : typeof o.deposit_clabe === "string"
        ? o.deposit_clabe
        : null;
  return {
    orderId,
    status,
    confirmedTxSignature,
    statusPage,
    depositClabe,
  };
}
