import { NextResponse } from "next/server";
import {
  fetchEtherfuseStablebonds,
  pickCetesStablebond,
} from "@/lib/etherfuse/stablebonds-lookup";
import { toErrorResponse } from "@/lib/seyf/api-error";

export const revalidate = 300;

/**
 * GET /api/seyf/etherfuse/lookup/stablebonds
 * Proxy al lookup público Etherfuse (stablebonds, incl. CETES: precio en MXN, supply, cadenas).
 * Query: ?cetesOnly=1 — solo la fila CETES.
 *
 * No usa ETHERFUSE_API_KEY (endpoint público). Sí usa ETHERFUSE_API_BASE_URL para sand vs prod.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cetesOnly = searchParams.get("cetesOnly") === "1" || searchParams.get("cetesOnly") === "true";

    const data = await fetchEtherfuseStablebonds({ next: { revalidate: 300 } });

    if (cetesOnly) {
      const cetes = pickCetesStablebond(data);
      return NextResponse.json({
        calculatedAt: data.calculatedAt,
        cetes,
      });
    }

    return NextResponse.json(data);
  } catch (e) {
    return toErrorResponse(e, "lookup/stablebonds");
  }
}
