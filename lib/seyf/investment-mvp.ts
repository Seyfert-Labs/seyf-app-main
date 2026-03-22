/**
 * Inversión automática MVP (punto B del PRD) — versión mínima.
 *
 * - Simula: depósito acreditado en MXNe → compra Stablebonds → estado "completado".
 * - Persiste snapshot de tasa y montos en JSON local (solo dev / prototipo).
 * - Sustituir `runMockAutoInvest` por Stellar path payment cuando tengáis activos y claves.
 */

import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

export type InvestmentRunStatus = 'pending_conversion' | 'completed' | 'failed'

export type InvestmentRun = {
  id: string
  depositId: string
  userId: string
  createdAt: string
  status: InvestmentRunStatus
  /** MXN que el usuario depositó (vista producto). */
  amountMxn: number
  /** Cantidad MXNe enviada al swap (mock 1:1 con MXN). */
  amountMxne: string
  /** CETES / stablebond anual de referencia usada para UI y límites (PRD margen conservador aparte). */
  rateSnapshotAnnualPercent: number
  /** Unidades de Stablebond recibidas (mock: mismo número que MXN como placeholder 1:1). */
  stablebondsReceived: string
  stellarTxHash: string | null
  errorMessage?: string
}

type LedgerFile = {
  runs: InvestmentRun[]
  /** Ciclo simple MVP: un id por “oleada” de inversiones (luego 28/91 días). */
  activeCycleId: string
}

const DEFAULT_CYCLE_DAYS = 28

function ledgerPath() {
  return path.join(process.cwd(), 'data', 'seyf-investment-ledger.json')
}

async function loadLedger(): Promise<LedgerFile> {
  try {
    const raw = await readFile(ledgerPath(), 'utf-8')
    const parsed = JSON.parse(raw) as LedgerFile
    if (!Array.isArray(parsed.runs)) parsed.runs = []
    if (!parsed.activeCycleId) parsed.activeCycleId = newCycleId()
    return parsed
  } catch {
    return { runs: [], activeCycleId: newCycleId() }
  }
}

async function saveLedger(ledger: LedgerFile) {
  const dir = path.dirname(ledgerPath())
  await mkdir(dir, { recursive: true })
  await writeFile(ledgerPath(), JSON.stringify(ledger, null, 2), 'utf-8')
}

function newCycleId() {
  return `cycle-${new Date().toISOString().slice(0, 10)}-${DEFAULT_CYCLE_DAYS}d`
}

/** Tasa anual de referencia mock (sustituir por feed Etherfuse / Banxico). */
export const MOCK_ANNUAL_RATE_PERCENT = 9.8

export type RunMockInput = {
  depositId: string
  userId: string
  amountMxn: number
}

/**
 * Idempotente por `depositId`: si ya existe run, devuelve la existente.
 */
export async function runMockAutoInvest(input: RunMockInput): Promise<InvestmentRun> {
  const ledger = await loadLedger()
  const existing = ledger.runs.find((r) => r.depositId === input.depositId)
  if (existing) return existing

  const id = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const amountMxne = input.amountMxn.toFixed(7)

  const run: InvestmentRun = {
    id,
    depositId: input.depositId,
    userId: input.userId,
    createdAt: new Date().toISOString(),
    status: 'completed',
    amountMxn: input.amountMxn,
    amountMxne: amountMxne,
    rateSnapshotAnnualPercent: MOCK_ANNUAL_RATE_PERCENT,
    stablebondsReceived: amountMxne,
    stellarTxHash: null,
  }

  ledger.runs.unshift(run)
  await saveLedger(ledger)
  return run
}

export async function listRuns(limit = 50): Promise<InvestmentRun[]> {
  const { runs } = await loadLedger()
  return runs.slice(0, limit)
}

export async function getLedgerMeta() {
  const ledger = await loadLedger()
  return {
    activeCycleId: ledger.activeCycleId,
    totalRuns: ledger.runs.length,
  }
}
