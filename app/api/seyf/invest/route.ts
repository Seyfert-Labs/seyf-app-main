import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runMockAutoInvest } from '@/lib/seyf/investment-mvp'
import { notifyUser } from '@/lib/seyf/notifications/notify'
import { assertWalletActiveForUser } from '@/lib/seyf/wallet-provisioning'

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

  let result: Awaited<ReturnType<typeof runMockAutoInvest>>
  try {
    await assertWalletActiveForUser(parsed.data.userId)
    result = await runMockAutoInvest(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo iniciar la inversión.'
    return NextResponse.json({ error: message }, { status: 409 })
  }

  if (result.createdNew) {
    void notifyUser(parsed.data.userId, 'deposit_deployed', {
      depositId: parsed.data.depositId,
      amountMxn: parsed.data.amountMxn,
      instrumentLabel: 'CETES',
    }).catch((error) => {
      console.error('[seyf][notifications] deposit_deployed', error)
    })
  }

  return NextResponse.json({ ok: true, run: result.run, notificationQueued: result.createdNew })
}
