import { parseOfframpQuoteMxnPerSourceUnit } from "@/lib/etherfuse/quote-parse";
import {
  createMxOfframpQuote,
  fetchRampableAssetsForWallet,
  pickCetesTargetIdentifier,
  type RampableAssetRow,
} from "@/lib/etherfuse/ramp-api";
import type { EtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";

function parseTokenBalance(row: RampableAssetRow | undefined): number {
  const raw = row?.balance;
  if (raw == null || raw === "") return 0;
  const n = Number.parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function isEtherfuseRampAllowedForServer(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.SEYF_ALLOW_ETHERFUSE_RAMP === "true";
}

export type DashboardCetesSaldo =
  | {
      kind: "ok";
      principalMxn: number;
      cetesBalance: number;
      mxnPerCetes: number;
    }
  | { kind: "no_context" }
  | { kind: "disabled" }
  | { kind: "error"; message: string };

/**
 * Saldo mostrado en MXN = balance CETES (GET /ramp/assets) × tipo offramp CETES→MXN
 * (POST /ramp/quote: `destinationAmount` / `sourceAmount`; OpenAPI QuoteResponse).
 * Alineado con la base de conocimiento Etherfuse FX API (p. ej. búsqueda MCP `search_etherfuse_fx_api`).
 */
export async function fetchDashboardCetesSaldo(
  ctx: EtherfuseRampContext | null,
): Promise<DashboardCetesSaldo> {
  if (!ctx) return { kind: "no_context" };
  if (!isEtherfuseRampAllowedForServer()) return { kind: "disabled" };

  try {
    const { assets } = await fetchRampableAssetsForWallet({
      walletPublicKey: ctx.publicKey,
    });
    const cetesId = pickCetesTargetIdentifier(assets);
    if (!cetesId) {
      return {
        kind: "error",
        message:
          "No hay CETES en activos rampables para esta wallet (GET /ramp/assets).",
      };
    }
    const cetesRow = assets.find(
      (a) => (a.symbol ?? "").toUpperCase() === "CETES",
    );
    const cetesBalance = parseTokenBalance(cetesRow);

    const quote = await createMxOfframpQuote({
      customerId: ctx.customerId,
      sourceAmount: "1",
      sourceAssetIdentifier: cetesId,
    });
    const mxnPerCetes = parseOfframpQuoteMxnPerSourceUnit(quote);
    if (mxnPerCetes == null) {
      return {
        kind: "error",
        message: "Cotización offramp sin monto MXN reconocible.",
      };
    }

    const principalMxn = cetesBalance * mxnPerCetes;
    return {
      kind: "ok",
      principalMxn,
      cetesBalance,
      mxnPerCetes,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar saldo CETES";
    return { kind: "error", message };
  }
}
