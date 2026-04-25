import { NextResponse } from 'next/server'
import { getEtherfuseOnboardingSession } from '@/lib/etherfuse/onboarding-session'
import { getUserWalletByUserId } from '@/lib/seyf/user-wallets'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const session = await getEtherfuseOnboardingSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const row = await getUserWalletByUserId(session.customerId)
    const status = row?.status ?? 'provisioning'
    return NextResponse.json(
      {
        status,
        provisioned: status === 'active',
        network: process.env.STELLAR_NETWORK ?? 'testnet',
      },
      {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      },
    )
  } catch (error) {
    console.error('[seyf][wallet-status] db_error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
