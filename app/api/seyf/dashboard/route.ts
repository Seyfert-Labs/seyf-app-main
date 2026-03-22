import { NextResponse } from 'next/server'
import { buildDashboardViewModel } from '@/lib/seyf/dashboard-view-model'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const vm = await buildDashboardViewModel()
  return NextResponse.json(vm, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
