import { getEtherfuseOnboardingSession } from '@/lib/etherfuse/onboarding-session'
import { fetchEtherfuseKycStatus } from '@/lib/etherfuse/kyc'
import type { EtherfuseKycSnapshot } from '@/lib/etherfuse/kyc'
import { isKycTestResetEnabled } from '@/lib/seyf/kyc-test-reset'
import IdentidadClient from './identidad-client'

export default async function IdentidadPage() {
  const session = await getEtherfuseOnboardingSession()
  const allowKycTestReset = isKycTestResetEnabled()
  let initialKyc: EtherfuseKycSnapshot | null = null
  if (session) {
    try {
      const r = await fetchEtherfuseKycStatus(session.customerId, session.publicKey)
      if (r.ok) initialKyc = r.data
    } catch {
      initialKyc = null
    }
  }
  return (
    <IdentidadClient
      initialSession={session}
      initialKyc={initialKyc}
      allowKycTestReset={allowKycTestReset}
    />
  )
}
