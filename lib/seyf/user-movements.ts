import {
  fetchCustomerOrdersAllPages,
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

function parseDecimalAmount(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return 0;
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * En listados, `orderType` a veces viene vacío; inferimos offramp/onramp por campos típicos.
 */
function inferRampOrderTypeFromRow(row: Record<string, unknown>): "onramp" | "offramp" | "" {
  const burn =
    typeof row.burnTransaction === "string" && row.burnTransaction.length > 0;
  if (burn) return "offramp";
  if (row.isAnchorOrder === true) return "offramp";
  const w =
    typeof row.withdrawAnchorAccount === "string"
      ? row.withdrawAnchorAccount
      : typeof row.withdraw_anchor_account === "string"
        ? row.withdraw_anchor_account
        : "";
  if (w.length > 5) return "offramp";

  const tgt = String(row.targetAsset ?? row.target_asset ?? "").toUpperCase();
  const src = String(row.sourceAsset ?? row.source_asset ?? "").toUpperCase();
  if (
    tgt &&
    tgt.includes("MXN") &&
    src &&
    !src.includes("MXN") &&
    src.trim().length > 0
  ) {
    return "offramp";
  }
  if (
    src &&
    src.includes("MXN") &&
    tgt &&
    !tgt.includes("MXN") &&
    tgt.trim().length > 0
  ) {
    return "onramp";
  }
  const clabe = row.depositClabe ?? row.deposit_clabe;
  if (typeof clabe === "string" && clabe.replace(/\D/g, "").length >= 10) {
    return "onramp";
  }
  return "";
}

function resolvedOrderType(
  row: Record<string, unknown>,
  d: ReturnType<typeof pickRampOrderTransactionDetails>,
): string {
  const fromApi = (d.orderType ?? "").toLowerCase();
  if (fromApi === "onramp" || fromApi === "offramp") return fromApi;
  const inferred = inferRampOrderTypeFromRow(row);
  return inferred;
}

function detalleEtherfuseAmigable(
  ot: string,
  d: ReturnType<typeof pickRampOrderTransactionDetails>,
): string {
  if (ot === "onramp") {
    return d.depositClabe
      ? "Sigue las instrucciones de transferencia que te dimos (CLABE y monto exacto)."
      : "Estamos generando los datos de tu depósito.";
  }
  if (ot === "offramp") {
    return "Retiro a tu cuenta en pesos.";
  }
  return "Movimiento registrado en tu cuenta.";
}

function etherfuseRowToMovement(row: Record<string, unknown>): UserMovement | null {
  const d = pickRampOrderTransactionDetails(row);
  const oid = d.orderId;
  if (!oid) return null;
  const ot = resolvedOrderType(row, d);
  let tipo: MovimientoTipo;
  let titulo: string;
  if (ot === "onramp") {
    tipo = "deposito";
    titulo = "Depósito desde tu banco";
  } else if (ot === "offramp") {
    tipo = "retiro";
    titulo = "Retiro a tu cuenta";
  } else {
    tipo = "deposito";
    titulo = "Movimiento";
  }
  let monto = parseDecimalAmount(d.amountInFiat);
  if (ot === "offramp" && monto !== 0) {
    monto = -Math.abs(monto);
  }
  const createdAt =
    d.createdAt ?? d.completedAt ?? d.updatedAt ?? new Date().toISOString();
  const estado = mapEstado(d.status);
  return {
    id: `ef-${oid}`,
    source: "etherfuse",
    tipo,
    titulo,
    monto,
    createdAt,
    estado,
    detalle: detalleEtherfuseAmigable(ot, d),
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
    titulo: "Ahorro invertido (prueba)",
    monto: r.status === "completed" ? r.amountMxn : 0,
    createdAt: r.createdAt,
    estado,
    detalle:
      r.errorMessage ??
      `Solo en entorno de prueba · tasa de referencia ${r.rateSnapshotAnnualPercent}% anual`,
    orderId: null,
    stellarTxSignature: r.stellarTxHash?.trim() || null,
  };
}

export type FetchUserMovementsOptions = {
  /** Límite de páginas Etherfuse (100 órdenes/página). Por defecto todas las permitidas; el dashboard usa pocas para no saturar con polling. */
  etherfuseMaxPages?: number;
  /** Límite de filas ledger; por defecto 80. */
  ledgerRunsLimit?: number;
};

/**
 * Movimientos del usuario: ledger MVP (si aplica) + órdenes GET /ramp/customer/{id}/orders (Etherfuse FX API).
 */
export async function fetchUserMovements(
  ctx: EtherfuseRampContext | null,
  options?: FetchUserMovementsOptions,
): Promise<UserMovement[]> {
  const ledgerLimit = options?.ledgerRunsLimit ?? 80;
  const etherfusePages = options?.etherfuseMaxPages;

  const out: UserMovement[] = [];

  if (investAllowed()) {
    const runs = await listRuns(ledgerLimit);
    out.push(...runs.map(ledgerRunToMovement));
  }

  if (ctx && etherfuseRampAllowed()) {
    try {
      const rows =
        etherfusePages != null
          ? await fetchCustomerOrdersAllPages(ctx.customerId, etherfusePages)
          : await fetchCustomerOrdersAllPages(ctx.customerId);
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
