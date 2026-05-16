export type CycleRecord = {
  userId: string
  /** Always 28 for this milestone. */
  cycleDays: 28
  principalMxn: number
  startDate: string
  expectedEndDate: string
  referenceRateAnnualPercent: number
  projectedYieldMxn: number
  /** Idempotency: confirmed onchain tx hash (or mock) once deployed. */
  confirmedOnchainTx: string | null
  updatedAt: string
}

type CycleStore = {
  activeByUserId: Map<string, CycleRecord>
}

function store(): CycleStore {
  const g = globalThis as unknown as {
    __seyfCycleStore?: CycleStore
  }

  if (!g.__seyfCycleStore) {
    g.__seyfCycleStore = {
      activeByUserId: new Map(),
    }
  }

  return g.__seyfCycleStore
}

function addDaysISO(startIso: string, days: number): string {
  const d = new Date(startIso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

export function getActiveCycle(userId: string): CycleRecord | null {
  return store().activeByUserId.get(userId) ?? null
}

export function upsertActiveCycleOnDepositConfirmed(params: {
  userId: string
  amountMxn: number
  referenceRateAnnualPercent: number
  now?: Date
}): CycleRecord {
  const s = store()
  const now = params.now ?? new Date()
  const nowIso = now.toISOString()

  const existing = s.activeByUserId.get(params.userId)
  const startDate = existing?.startDate ?? nowIso
  const expectedEndDate = addDaysISO(startDate, 28)

  const principalMxn = (existing?.principalMxn ?? 0) + params.amountMxn

  // Simple projection for 28d cycle.
  const projectedYieldMxn = principalMxn * (params.referenceRateAnnualPercent / 100) * (28 / 365)

  const next: CycleRecord = {
    userId: params.userId,
    cycleDays: 28,
    principalMxn,
    startDate,
    expectedEndDate,
    referenceRateAnnualPercent: params.referenceRateAnnualPercent,
    projectedYieldMxn,
    confirmedOnchainTx: existing?.confirmedOnchainTx ?? null,
    updatedAt: nowIso,
  }

  s.activeByUserId.set(params.userId, next)
  return next
}

export function markCycleDeployedOnchain(params: {
  userId: string
  onchainTx: string
  now?: Date
}) {
  const s = store()
  const existing = s.activeByUserId.get(params.userId)
  if (!existing) return
  if (existing.confirmedOnchainTx) return

  s.activeByUserId.set(params.userId, {
    ...existing,
    confirmedOnchainTx: params.onchainTx,
    updatedAt: (params.now ?? new Date()).toISOString(),
  })
}
