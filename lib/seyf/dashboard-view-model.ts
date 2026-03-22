import type { InvestmentRun } from "@/lib/seyf/investment-mvp";
import { listRuns, MOCK_ANNUAL_RATE_PERCENT } from "@/lib/seyf/investment-mvp";
import { fetchDashboardCetesSaldo, type DashboardCetesSaldo } from "@/lib/seyf/dashboard-cetes-saldo";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import type { UserMovement } from "@/lib/seyf/user-movements-types";
import { fetchUserMovements } from "@/lib/seyf/user-movements";

export type DashboardViewModel = {
  principalMxn: number;
  rendimientoMxn: number;
  adelantableMxn: number;
  puntos: number;
  tasaAnual: number;
  saldoGastoMxn: number;
  saldoNote: string | null;
  movementsRecent: UserMovement[];
};

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
    const c = new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(s.cetesBalance);
    const r = new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(s.mxnPerCetes);
    return `${c} CETES × ${r} MXN/CETES (cotización offramp Etherfuse)`;
  }
  if (s.kind === "no_context") {
    return "Vincula tu cuenta en Identidad para ver tu saldo CETES valorado en MXN.";
  }
  if (s.kind === "disabled") {
    return "La rampa Etherfuse no está habilitada en este entorno.";
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
      "Saldo principal desde depósitos del ledger MVP (activa Identidad + Etherfuse para valor CETES en vivo).";
  }

  const movementsRecent = movementsAll.slice(0, 8);

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
