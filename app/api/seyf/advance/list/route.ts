import { NextResponse } from 'next/server'
import { getOrCreatePocUserId } from '@/lib/seyf/poc-user-cookie'
import { listAdvances } from '@/lib/seyf/advance/engine'
import { toErrorResponse } from '@/lib/seyf/api-error'

export async function GET() {
  try {
    const { userId } = await getOrCreatePocUserId()
    const items = await listAdvances(userId)
    return NextResponse.json({ items })
  } catch (e) {
    return toErrorResponse(e, 'advance/list')
  }
}
