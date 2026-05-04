import { NextResponse } from 'next/server'
import { getOrCreatePocUserId } from '@/lib/seyf/poc-user-cookie'
import { simulateAdvance } from '@/lib/seyf/advance/engine'
import { toErrorResponse } from '@/lib/seyf/api-error'

export async function GET(req: Request) {
  try {
    const { userId } = await getOrCreatePocUserId()
    const yearsRaw = Number.parseInt(new URL(req.url).searchParams.get('years') ?? '', 10)
    const years = Number.isFinite(yearsRaw) ? yearsRaw : 1
    const result = await simulateAdvance(userId, years)
    
    return NextResponse.json(result)
  } catch (e) {
    return toErrorResponse(e, 'advance/simulate')
  }
}
