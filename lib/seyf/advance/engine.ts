import { SorobanAdvanceClient } from './soroban'
import { createAdvanceRecord, getAdvanceById, listUserAdvances, updateAdvanceRecord } from './store'
import { getPocLedgerSnapshot, pocLedgerDebit, pocLedgerCredit } from '../poc-omnibus-ledger'
import { AppError } from '../api-error'
import { fetchEtherfuseStablebonds, pickCetesStablebond } from '@/lib/etherfuse/stablebonds-lookup'
import { cetesStablebondDisplayFromRow } from '../stablebond-cetes-display'
import { getEtherfuseRampContext } from '../etherfuse-ramp-context'
import { fetchDashboardCetesSaldo } from '../dashboard-cetes-saldo'

const soroban = new SorobanAdvanceClient()

const MAX_ADVANCE_RATIO_OF_PRINCIPAL = 0.9
const ADVANCE_DISCOUNT_PERCENT = 1.5
const LIQUIDATION_FEE_PERCENT = 1.5
const FALLBACK_CETES_APY_PERCENT = 3.38
const DAYS_PER_YEAR = 365
const CYCLE_DAYS = 28

export type SimulationResult = {
  advance_available: boolean
  principal_mxn?: number
  real_cetes_apy_percent?: number
  advance_rate_percent?: number
  years_selected?: number
  years_max_allowed?: number
  max_advance_ratio_percent?: number
  max_advance_mxn?: number
  fee_mxn?: number
  net_to_user_mxn?: number
  cycle_end_date?: string
  error?: "no_active_cycle" | string
}

export type AdvanceListItem = {
  id: string
  status: 'pending' | 'completed' | 'failed' | 'liquidated'
  amount_mxn: number
  fee_mxn: number
  net_mxn: number
  years: number
  rate_percent: number
  due_at: string
  created_at: string
  liquidated_at: string | null
  liquidation_fee_mxn: number | null
  time_left_label: string
  can_liquidate: boolean
}

function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.max(min, Math.min(max, Math.floor(v)))
}

async function resolveRealCetesApyPercent(): Promise<number> {
  try {
    const data = await fetchEtherfuseStablebonds({ next: { revalidate: 300 } })
    const cetes = pickCetesStablebond(data)
    const parsed = cetesStablebondDisplayFromRow(cetes)
    if (parsed.annualPercent != null && parsed.annualPercent > 0) {
      return parsed.annualPercent
    }
  } catch {
    // fallback below
  }
  return FALLBACK_CETES_APY_PERCENT
}

function currentAdvanceCycleId() {
  const bucket = Math.floor(Date.now() / (CYCLE_DAYS * 86_400_000))
  return `advance-cycle-${bucket}`
}

async function resolvePrincipalMxnForAdvance(userId: string): Promise<number> {
  const ctx = await getEtherfuseRampContext()
  if (ctx) {
    const saldo = await fetchDashboardCetesSaldo(ctx)
    if (saldo.kind === 'ok' && saldo.principalMxn > 0) {
      return saldo.principalMxn
    }
  }
  const { balanceMxn } = getPocLedgerSnapshot(userId)
  return Math.max(0, balanceMxn)
}

export async function simulateAdvance(userId: string, yearsRequested = 1): Promise<SimulationResult> {
  const balanceMxn = await resolvePrincipalMxnForAdvance(userId)
  if (balanceMxn <= 0) {
    return { advance_available: false, principal_mxn: 0, max_advance_mxn: 0 }
  }

  const realApy = await resolveRealCetesApyPercent()
  const advanceRatePercent = Math.max(0, realApy - ADVANCE_DISCOUNT_PERCENT)

  const yearsByCap = advanceRatePercent > 0
    ? Math.floor(MAX_ADVANCE_RATIO_OF_PRINCIPAL / (advanceRatePercent / 100))
    : 1
  const yearsMaxAllowed = Math.max(1, yearsByCap)
  const yearsSelected = clampInt(yearsRequested, 1, yearsMaxAllowed)

  const grossAdvance = balanceMxn * (advanceRatePercent / 100) * yearsSelected
  const capByPrincipal = balanceMxn * MAX_ADVANCE_RATIO_OF_PRINCIPAL
  const max_advance_mxn = Math.max(0, Math.min(grossAdvance, capByPrincipal))
  const effectiveFeeMxn = max_advance_mxn > 0 ? max_advance_mxn * (LIQUIDATION_FEE_PERCENT / 100) : 0
  const net_to_user_mxn = Math.max(0, max_advance_mxn - effectiveFeeMxn)
  
  const d = new Date()
  d.setDate(d.getDate() + yearsSelected * DAYS_PER_YEAR)

  return {
    advance_available: true,
    principal_mxn: balanceMxn,
    real_cetes_apy_percent: realApy,
    advance_rate_percent: advanceRatePercent,
    years_selected: yearsSelected,
    years_max_allowed: yearsMaxAllowed,
    max_advance_ratio_percent: MAX_ADVANCE_RATIO_OF_PRINCIPAL * 100,
    max_advance_mxn,
    fee_mxn: effectiveFeeMxn,
    net_to_user_mxn,
    cycle_end_date: d.toISOString()
  }
}

export async function confirmAdvance(userId: string, amountMxn: number, yearsRequested = 1, idempotencyKey?: string) {
  const activeCycleId = currentAdvanceCycleId()

  if (amountMxn <= 0) throw new AppError("validation_error", { message: "Monto debe ser mayor a 0 MXN" })

  const simulation = await simulateAdvance(userId, yearsRequested)
  if (simulation.error) throw new AppError("validation_error", { message: simulation.error })
  
  if (!simulation.max_advance_mxn || amountMxn > simulation.max_advance_mxn) {
    throw new AppError("validation_error", { message: "Monto excede el límite permitido" })
  }

  const rateBps = Math.max(0, Math.round((simulation.advance_rate_percent ?? 0) * 100))
  const years = Math.max(1, simulation.years_selected ?? 1)
  const principalForQuote = Math.max(0, simulation.principal_mxn ?? 0)
  const effectiveFeeMxn = Math.max(0, simulation.fee_mxn ?? 0)
  const quote = soroban.calculateQuote(
    principalForQuote,
    rateBps,
    years * DAYS_PER_YEAR,
    years * DAYS_PER_YEAR,
    effectiveFeeMxn
  )

  const record = await createAdvanceRecord({
    user_id: userId,
    cycle_id: activeCycleId,
    amount_mxn: amountMxn,
    fee_mxn: effectiveFeeMxn,
    net_mxn: amountMxn,
    years,
    rate_percent: simulation.advance_rate_percent ?? 0,
    principal_mxn_snapshot: principalForQuote,
    due_at: simulation.cycle_end_date ?? new Date(Date.now() + years * DAYS_PER_YEAR * 86_400_000).toISOString(),
  })

  try {
    const result = await soroban.executeAdvance(userId, activeCycleId, amountMxn, quote)
    
    if (result.success) {
      pocLedgerCredit(userId, amountMxn, `Adelanto de rendimiento (Ciclo ${activeCycleId})`)
      if (effectiveFeeMxn > 0) {
        pocLedgerDebit(userId, effectiveFeeMxn, `Comisión por adelanto`)
      }

      await updateAdvanceRecord(record.id, {
        status: 'completed',
        stellar_tx_hash: result.stellar_tx_hash
      })
      
      return { ...record, status: 'completed', stellar_tx_hash: result.stellar_tx_hash }
    } else {
      await updateAdvanceRecord(record.id, { status: 'failed' })
      throw new Error(`Execution failed: ${result.error_code}`)
    }
  } catch (e) {
    await updateAdvanceRecord(record.id, { status: 'failed' })
    throw e
  }
}

function formatTimeLeftLabel(dueAt: string): string {
  const due = +new Date(dueAt)
  const now = Date.now()
  const diffMs = Math.max(0, due - now)
  const days = Math.floor(diffMs / 86_400_000)
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((diffMs % 3_600_000) / 60_000)
  return `${hours}h ${mins}m`
}

export async function listAdvances(userId: string): Promise<AdvanceListItem[]> {
  const rows = await listUserAdvances(userId)
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    amount_mxn: r.amount_mxn,
    fee_mxn: r.fee_mxn,
    net_mxn: r.net_mxn,
    years: r.years ?? 1,
    rate_percent: r.rate_percent ?? 0,
    due_at: r.due_at ?? r.created_at,
    created_at: r.created_at,
    liquidated_at: r.liquidated_at ?? null,
    liquidation_fee_mxn: r.liquidation_fee_mxn ?? null,
    time_left_label: r.status === 'completed' ? formatTimeLeftLabel(r.due_at ?? r.created_at) : '--',
    can_liquidate: r.status === 'completed',
  }))
}

export async function liquidateAdvance(userId: string, advanceId: string) {
  const row = await getAdvanceById(userId, advanceId)
  if (!row) {
    throw new AppError('validation_error', { message: 'Adelanto no encontrado' })
  }
  if (row.status !== 'completed') {
    throw new AppError('validation_error', { message: 'Este adelanto no está disponible para liquidación' })
  }
  const liquidationFeeMxn = row.amount_mxn * (LIQUIDATION_FEE_PERCENT / 100)
  const totalToDebit = row.amount_mxn + liquidationFeeMxn
  const { balanceMxn } = getPocLedgerSnapshot(userId)
  if (balanceMxn + 1e-9 < totalToDebit) {
    throw new AppError('validation_error', { message: 'Saldo insuficiente para liquidar el adelanto' })
  }

  pocLedgerDebit(userId, row.amount_mxn, `Liquidación de adelanto ${row.id}`)
  if (liquidationFeeMxn > 0) {
    pocLedgerDebit(userId, liquidationFeeMxn, `Comisión liquidación adelanto ${row.id}`)
  }

  const updated = await updateAdvanceRecord(row.id, {
    status: 'liquidated',
    liquidated_at: new Date().toISOString(),
    liquidation_fee_mxn: liquidationFeeMxn,
  })
  return updated
}
