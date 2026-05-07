import { NextResponse } from 'next/server'
import { getLedgerMeta, listRunsForUser } from '@/lib/seyf/investment-mvp'

/**
 * GET /api/seyf/invest/summary?wallet=G...
 * Resumen del ledger mock filtrado por cuenta Stellar (evita mezclar usuarios).
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production' && process.env.SEYF_ALLOW_MOCK_INVEST !== 'true') {
    return NextResponse.json(
      { error: 'Mock invest disabled in production.' },
      { status: 403 },
    )
  }

  const wallet = new URL(req.url).searchParams.get('wallet')?.trim() ?? ''
  const [meta, runs] = await Promise.all([
    getLedgerMeta(),
    wallet ? listRunsForUser(wallet, 20) : Promise.resolve([]),
  ])
  const principalMxn = runs.filter((r) => r.status === 'completed').reduce((s, r) => s + r.amountMxn, 0)
  const lastRate = runs[0]?.rateSnapshotAnnualPercent ?? null

  return NextResponse.json({
    activeCycleId: meta.activeCycleId,
    principalMxn,
    lastReferenceAnnualRatePercent: lastRate,
    recentRuns: runs,
  })
}
