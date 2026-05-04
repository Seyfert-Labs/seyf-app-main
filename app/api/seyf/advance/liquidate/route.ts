import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrCreatePocUserId } from '@/lib/seyf/poc-user-cookie'
import { liquidateAdvance } from '@/lib/seyf/advance/engine'
import { toErrorResponse } from '@/lib/seyf/api-error'

const liquidateSchema = z.object({
  advance_id: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const { userId } = await getOrCreatePocUserId()
    const body = await req.json()
    const parsed = liquidateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const result = await liquidateAdvance(userId, parsed.data.advance_id)
    return NextResponse.json({ ok: true, item: result })
  } catch (e) {
    return toErrorResponse(e, 'advance/liquidate')
  }
}
