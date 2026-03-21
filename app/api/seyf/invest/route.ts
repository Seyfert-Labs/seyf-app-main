import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runMockAutoInvest } from '@/lib/seyf/investment-mvp'

const bodySchema = z.object({
  depositId: z.string().min(1),
  userId: z.string().min(1).default('demo-user'),
  amountMxn: z.number().positive().max(1_000_000),
})

/**
 * POST /api/seyf/invest
 * Dispara la inversión automática mock (MXNe → Stablebonds simulado).
 * En producción: proteger con auth + webhook secret; sustituir por job Stellar.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production' && process.env.SEYF_ALLOW_MOCK_INVEST !== 'true') {
    return NextResponse.json(
      { error: 'Mock invest disabled in production. Set SEYF_ALLOW_MOCK_INVEST=true or use real pipeline.' },
      { status: 403 },
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const run = await runMockAutoInvest(parsed.data)
  return NextResponse.json({ ok: true, run })
}
