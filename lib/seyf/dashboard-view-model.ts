import type { InvestmentRun } from "@/lib/seyf/investment-mvp";
import { listRuns, MOCK_ANNUAL_RATE_PERCENT } from "@/lib/seyf/investment-mvp";
import { fetchDashboardCetesSaldo, type DashboardCetesSaldo } from "@/lib/seyf/dashboard-cetes-saldo";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { fetchUserMovements } from "@/lib/seyf/user-movements";
import {
  DASHBOARD_MOVEMENTS_PREVIEW_LIMIT,
  type DashboardViewModel,
} from "@/lib/seyf/dashboard-view-model-types";

export type { DashboardViewModel } from "@/lib/seyf/dashboard-view-model-types";
export { DASHBOARD_MOVEMENTS_PREVIEW_LIMIT } from "@/lib/seyf/dashboard-view-model-types";

function investAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.SEYF_ALLOW_MOCK_INVEST === "true";
}

function ledgerPrincipalMxn(runs: InvestmentRun[]): number {
  return runs
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + r.amountMxn, 0);
}

function oldestCompletedRun(runs: InvestmentRun[]): InvestmentRun | null {
  const done = runs.filter((r) => r.status === "completed");
  if (done.length === 0) return null;
  return done.reduce((a, r) =>
    new Date(r.createdAt) < new Date(a.createdAt) ? r : a,
  );
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.min(365, Math.max(1, Math.floor(ms / 86_400_000)));
}

function cetesFootnote(s: DashboardCetesSaldo): string | null {
  if (s.kind === "ok") {
    return "Equivalente en pesos según el tipo del día (referencia, puede variar).";
  }
  if (s.kind === "no_context") {
    return "Completa Identidad para ver tu saldo en pesos al día.";
  }
  if (s.kind === "disabled") {
    return "Consulta de saldo no disponible en este momento.";
  }
  if (s.kind === "error") return s.message;
  return null;
}

/**
 * Ensambla números en vivo: saldo CETES×MXN (Etherfuse) y, en dev o con SEYF_ALLOW_MOCK_INVEST, ledger MVP.
 */
export async function buildDashboardViewModel(): Promise<DashboardViewModel> {
  const ctx = await getEtherfuseRampContext();
  const [cetesSaldo, investRuns, movementsAll] = await Promise.all([
    fetchDashboardCetesSaldo(ctx),
    investAllowed() ? listRuns(20) : Promise.resolve([] as InvestmentRun[]),
    fetchUserMovements(ctx),
  ]);

  const ledgerPrincipal = ledgerPrincipalMxn(investRuns);
  const principalMxn =
    cetesSaldo.kind === "ok" ? cetesSaldo.principalMxn : ledgerPrincipal;

  const lastRate =
    investRuns[0]?.rateSnapshotAnnualPercent ?? MOCK_ANNUAL_RATE_PERCENT;
  const tasaAnual = lastRate;

  const oldest = oldestCompletedRun(investRuns);
  const dias = oldest ? daysSince(oldest.createdAt) : 1;
  const rendimientoMxn =
    principalMxn > 0 ? principalMxn * (tasaAnual / 100) * (dias / 365) : 0;

  const adelantableMxn =
    rendimientoMxn > 0
      ? Math.min(rendimientoMxn * 0.78, principalMxn * 0.12)
      : 0;

  const puntos = Math.round(
    principalMxn * 10 + rendimientoMxn * 2 + investRuns.length * 25,
  );

  let saldoNote = cetesFootnote(cetesSaldo);
  if (cetesSaldo.kind === "no_context" && ledgerPrincipal > 0) {
    saldoNote =
      "Saldo según tus depósitos de prueba. Identidad te da el valor en vivo en pesos.";
  }

  const movementsRecent = movementsAll.slice(0, DASHBOARD_MOVEMENTS_PREVIEW_LIMIT);

  return {
    principalMxn,
    rendimientoMxn,
    adelantableMxn,
    puntos,
    tasaAnual,
    saldoGastoMxn: 0,
    saldoNote,
    movementsRecent,
  };
}
