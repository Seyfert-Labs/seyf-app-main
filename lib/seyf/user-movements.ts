import {
  fetchCustomerOrdersFirstPage,
  pickRampOrderTransactionDetails,
} from "@/lib/etherfuse/orders-api";
import type { InvestmentRun } from "@/lib/seyf/investment-mvp";
import { listRuns } from "@/lib/seyf/investment-mvp";
import type { EtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import type {
  MovimientoEstado,
  MovimientoTipo,
  UserMovement,
} from "@/lib/seyf/user-movements-types";

export type {
  MovimientoEstado,
  MovimientoTipo,
  UserMovement,
} from "@/lib/seyf/user-movements-types";
export {
  formatMovementFechaHora,
  formatMovementListSubtitle,
} from "@/lib/seyf/user-movements-types";

function investAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.SEYF_ALLOW_MOCK_INVEST === "true";
}

function etherfuseRampAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.SEYF_ALLOW_ETHERFUSE_RAMP === "true";
}

function mapEstado(status: string | null): MovimientoEstado {
  const s = (status ?? "").toLowerCase();
  if (["completed", "funded", "success"].includes(s)) return "completado";
  if (["failed", "canceled", "cancelled", "rejected"].includes(s)) {
    return "fallido";
  }
  return "pendiente";
}

function parseAmountFiat(s: string | null): number {
  if (!s) return 0;
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function etherfuseRowToMovement(row: Record<string, unknown>): UserMovement | null {
  const d = pickRampOrderTransactionDetails(row);
  const oid = d.orderId;
  if (!oid) return null;
  const ot = (d.orderType ?? "").toLowerCase();
  let tipo: MovimientoTipo;
  let titulo: string;
  if (ot === "onramp") {
    tipo = "deposito";
    titulo = "Depósito onramp (MXN → crypto)";
  } else if (ot === "offramp") {
    tipo = "retiro";
    titulo = "Retiro offramp (crypto → MXN)";
  } else {
    tipo = "deposito";
    titulo = `Orden ${d.orderType ?? "Etherfuse"}`;
  }
  const monto = parseAmountFiat(d.amountInFiat);
  const createdAt =
    d.createdAt ?? d.completedAt ?? d.updatedAt ?? new Date().toISOString();
  const estado = mapEstado(d.status);
  const parts = [
    `Orden ${oid}`,
    d.status ? `Estado: ${d.status}` : null,
    d.amountInTokens ? `Tokens: ${d.amountInTokens}` : null,
    d.depositClabe ? `CLABE: ${d.depositClabe}` : null,
    d.sourceAsset || d.targetAsset
      ? `Activos: ${d.sourceAsset ?? "—"} → ${d.targetAsset ?? "—"}`
      : null,
  ].filter(Boolean);
  return {
    id: `ef-${oid}`,
    source: "etherfuse",
    tipo,
    titulo,
    monto,
    createdAt,
    estado,
    detalle: parts.join(" · "),
    orderId: oid,
    stellarTxSignature: d.confirmedTxSignature,
  };
}

function ledgerRunToMovement(r: InvestmentRun): UserMovement {
  const estado: MovimientoEstado =
    r.status === "completed"
      ? "completado"
      : r.status === "failed"
        ? "fallido"
        : "pendiente";
  return {
    id: `ledger-${r.id}`,
    source: "ledger",
    tipo: "inversion",
    titulo: "Inversión Stablebond (MVP)",
    monto: r.status === "completed" ? r.amountMxn : 0,
    createdAt: r.createdAt,
    estado,
    detalle:
      r.errorMessage ??
      `Simulación ledger · tasa ref. ${r.rateSnapshotAnnualPercent}% anual`,
    orderId: null,
    stellarTxSignature: r.stellarTxHash?.trim() || null,
  };
}

/**
 * Movimientos del usuario: ledger MVP (si aplica) + órdenes GET /ramp/customer/{id}/orders (Etherfuse FX API).
 */
export async function fetchUserMovements(
  ctx: EtherfuseRampContext | null,
): Promise<UserMovement[]> {
  const out: UserMovement[] = [];

  if (investAllowed()) {
    const runs = await listRuns(80);
    out.push(...runs.map(ledgerRunToMovement));
  }

  if (ctx && etherfuseRampAllowed()) {
    try {
      const rows = await fetchCustomerOrdersFirstPage(ctx.customerId);
      for (const row of rows) {
        if (row && typeof row === "object") {
          const m = etherfuseRowToMovement(row as Record<string, unknown>);
          if (m) out.push(m);
        }
      }
    } catch {
      /* sin API key o red: solo ledger */
    }
  }

  out.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return out;
}
