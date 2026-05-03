import { NextResponse } from 'next/server'
import { listStoredKycRows } from '@/lib/seyf/kyc-state-store'
import { toErrorResponse } from '@/lib/seyf/api-error'
import { assertEtherfuseOpsAccess } from '@/lib/seyf/etherfuse-ops-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  try {
    assertEtherfuseOpsAccess(req)
    const rows = await listStoredKycRows(250)
    return NextResponse.json(
      {
        ok: true,
        users: rows,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return toErrorResponse(e, 'etherfuse/ops/users')
  }
}
