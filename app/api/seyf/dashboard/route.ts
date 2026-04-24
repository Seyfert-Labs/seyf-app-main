import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/lib/seyf/api-error'
import { buildDashboardViewModel } from '@/lib/seyf/dashboard-view-model'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const vm = await buildDashboardViewModel()
    return NextResponse.json(vm, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (e) {
    return toErrorResponse(e, 'dashboard')
  }
}
