import { NextResponse } from 'next/server'
import { getLedgerMeta, listRuns } from '@/lib/seyf/investment-mvp'

/**
 * GET /api/seyf/invest/summary
 * Resumen para conectar el dashboard al ledger mock (opcional).
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.SEYF_ALLOW_MOCK_INVEST !== 'true') {
    return NextResponse.json(
      { error: 'Mock invest disabled in production.' },
      { status: 403 },
    )
  }

  const [meta, runs] = await Promise.all([getLedgerMeta(), listRuns(20)])
  const principalMxn = runs.filter((r) => r.status === 'completed').reduce((s, r) => s + r.amountMxn, 0)
  const lastRate = runs[0]?.rateSnapshotAnnualPercent ?? null

  return NextResponse.json({
    activeCycleId: meta.activeCycleId,
    principalMxn,
    lastReferenceAnnualRatePercent: lastRate,
    recentRuns: runs,
  })
}
