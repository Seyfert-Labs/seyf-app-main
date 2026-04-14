import { NextResponse } from 'next/server'
import { z } from 'zod'
import { seyfApiError, SEYF_VALIDATION_MESSAGE_ES } from '@/lib/seyf/api-error'
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
    return seyfApiError(403, 'forbidden', {
      message_es: 'Esta simulación de inversión no está habilitada en producción.',
    })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return seyfApiError(400, 'bad_json')
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return seyfApiError(400, 'validation_error', { message_es: SEYF_VALIDATION_MESSAGE_ES })
  }

  const run = await runMockAutoInvest(parsed.data)
  return NextResponse.json({ ok: true, run })
}
