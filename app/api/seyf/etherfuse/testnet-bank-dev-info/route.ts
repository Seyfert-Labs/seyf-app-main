import { NextResponse } from 'next/server'
import { getEtherfuseConfig } from '@/lib/etherfuse/config'
import { verifyEtherfuseApiKey } from '@/lib/etherfuse/client'
import { getEtherfuseOnboardingSession } from '@/lib/etherfuse/onboarding-session'
import { isEtherfuseDevPanelEnabled } from '@/lib/seyf/etherfuse-dev-panel'
import {
  isEtherfuseTestnetBankAutofillActive,
} from '@/lib/seyf/etherfuse-testnet-bank-autofill'
import { isPublicStellarTestnet } from '@/lib/seyf/stellar-wallet-network'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET — Solo con panel dev activo: red testnet, env CLABE sintética y sesión onboarding actual (cookie).
 */
export async function GET() {
  if (!isEtherfuseDevPanelEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const session = await getEtherfuseOnboardingSession()
  const baseUrl = getEtherfuseConfig().baseUrl
  let organization: { id: string; displayName: string; approvedAt: string | null } | null = null
  let organizationError: string | null = null
  try {
    const check = await verifyEtherfuseApiKey()
    organization = check.organization
  } catch (e) {
    organizationError = e instanceof Error ? e.message : 'No se pudo validar /ramp/me'
  }

  return NextResponse.json(
    {
      stellarTestnet: isPublicStellarTestnet(),
      bankAutofillActive: isEtherfuseTestnetBankAutofillActive(),
      etherfuseBaseUrl: baseUrl,
      organization,
      organizationError,
      session: session
        ? {
            hasSession: true as const,
            customerId: session.customerId,
            bankAccountId: session.bankAccountId,
            publicKey: session.publicKey,
          }
        : { hasSession: false as const },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
