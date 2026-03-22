import { NextResponse } from "next/server";
import { z } from "zod";
import { etherfuseFetch, etherfuseReadBody } from "@/lib/etherfuse/client";
import {
  fetchOrderDetailsWithRetry,
  pickOrderDisplayFields,
} from "@/lib/etherfuse/orders-api";
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orderId } = parsed.data;

  try {
    const fr = await etherfuseFetch("/ramp/order/fiat_received", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const { json: simJson, text } = await etherfuseReadBody(fr);
    const simulateFiat = fr.ok
      ? { ok: true as const, result: simJson }
      : { ok: false as const, status: fr.status, error: text.slice(0, 500) };

    let orderSnapshot: unknown = null;
    let orderFetchError: string | null = null;
    try {
      orderSnapshot = await fetchOrderDetailsWithRetry(orderId);
    } catch (e) {
      orderFetchError = e instanceof Error ? e.message : String(e);
    }

    const orderDisplay = orderSnapshot
      ? pickOrderDisplayFields(orderSnapshot)
      : null;

    return NextResponse.json({
      simulateFiat,
      order: orderSnapshot,
      orderDisplay,
      orderFetchError,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error al confirmar onramp sandbox";
    console.error("[mxn-cetes/confirm]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
