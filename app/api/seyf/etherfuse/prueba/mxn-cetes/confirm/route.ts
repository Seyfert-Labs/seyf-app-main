import { NextResponse } from "next/server";
import { z } from "zod";
import { etherfuseFetch, etherfuseReadBody } from "@/lib/etherfuse/client";
import {
  fetchOrderDetailsWithRetry,
  pickOrderDisplayFields,
} from "@/lib/etherfuse/orders-api";
import {
  seyfApiError,
  seyfErrorFromUnknown,
  SEYF_VALIDATION_MESSAGE_ES,
} from "@/lib/seyf/api-error";
import { isEtherfuseDevPanelEnabled } from "@/lib/seyf/etherfuse-dev-panel";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

const bodySchema = z.object({
  orderId: z.string().uuid(),
});

/**
 * Tras `mxn-cetes` con `prepareOnly`: simula SPEI en sandbox y refresca la orden.
 */
export async function POST(req: Request) {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

  if (!isEtherfuseDevPanelEnabled()) {
    return seyfApiError(404, "not_found");
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return seyfApiError(400, "bad_json");
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return seyfApiError(400, "validation_error", { message_es: SEYF_VALIDATION_MESSAGE_ES });
  }

  const { orderId } = parsed.data;

  try {
    const fr = await etherfuseFetch("/ramp/order/fiat_received", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const { json: simJson, text } = await etherfuseReadBody(fr);
    if (!fr.ok) {
      console.error("[mxn-cetes/confirm] fiat_received", fr.status, text.slice(0, 800));
    }
    const simulateFiat = fr.ok
      ? { ok: true as const, result: simJson }
      : { ok: false as const, status: fr.status };

    let orderSnapshot: unknown = null;
    let orderFetchFailed = false;
    try {
      orderSnapshot = await fetchOrderDetailsWithRetry(orderId);
    } catch (e) {
      orderFetchFailed = true;
      console.warn("[mxn-cetes/confirm] order fetch", e);
    }

    const orderDisplay = orderSnapshot
      ? pickOrderDisplayFields(orderSnapshot)
      : null;

    return NextResponse.json({
      simulateFiat,
      order: orderSnapshot,
      orderDisplay,
      orderFetchFailed,
    });
  } catch (e) {
    console.error("[mxn-cetes/confirm]", e);
    return seyfErrorFromUnknown(e);
  }
}
