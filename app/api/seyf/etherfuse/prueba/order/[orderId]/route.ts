import { NextResponse } from "next/server";
import { fetchOrderDetails } from "@/lib/etherfuse/orders-api";
import { seyfApiError, seyfErrorFromUnknown } from "@/lib/seyf/api-error";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

/**
 * GET /api/seyf/etherfuse/prueba/order/[orderId]
 * Estado actual de la orden (polling desde la página de prueba).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

  const { orderId } = await ctx.params;
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return seyfApiError(400, "validation_error", {
      message_es: "El identificador de orden no es válido.",
    });
  }

  try {
    const order = await fetchOrderDetails(orderId);
    return NextResponse.json({ order });
  } catch (e) {
    return seyfErrorFromUnknown(e);
  }
}
