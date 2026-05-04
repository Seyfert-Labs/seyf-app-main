import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrCreatePocUserId } from '@/lib/seyf/poc-user-cookie'
import { confirmAdvance } from '@/lib/seyf/advance/engine'
import { toErrorResponse } from '@/lib/seyf/api-error'

const confirmSchema = z.object({
  amount_mxn: z.number().positive(),
  years: z.number().int().min(1).optional(),
})

export async function POST(req: Request) {
  try {
    const { userId } = await getOrCreatePocUserId()
    const idempotencyKey = req.headers.get('x-idempotency-key') || undefined

    const body = await req.json()
    const parsed = confirmSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const result = await confirmAdvance(
      userId,
      parsed.data.amount_mxn,
      parsed.data.years ?? 1,
      idempotencyKey,
    )
    
    return NextResponse.json(result)
  } catch (e) {
    return toErrorResponse(e, 'advance/confirm')
  }
}
