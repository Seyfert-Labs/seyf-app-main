import { NextResponse } from 'next/server'
import { seyfErrorFromUnknown } from '@/lib/seyf/api-error'
import { getEtherfuseRampContext } from '@/lib/seyf/etherfuse-ramp-context'
import { fetchUserMovements } from '@/lib/seyf/user-movements'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const ctx = await getEtherfuseRampContext()
    const movements = await fetchUserMovements(ctx)
    return NextResponse.json(
      { movements },
      {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      },
    )
  } catch (e) {
    return seyfErrorFromUnknown(e)
  }
}
