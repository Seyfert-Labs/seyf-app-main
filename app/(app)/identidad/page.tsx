import { getEtherfuseOnboardingSession } from '@/lib/etherfuse/onboarding-session'
import { fetchEtherfuseKycStatus } from '@/lib/etherfuse/kyc'
import type { EtherfuseKycSnapshot } from '@/lib/etherfuse/kyc'
import { getStoredKycSnapshot, upsertStoredKycSnapshot } from '@/lib/seyf/kyc-state-store'
import { triggerWalletProvisioning } from './actions'
import IdentidadClient from './identidad-client'

export default async function IdentidadPage() {
  const session = await getEtherfuseOnboardingSession()
  let initialKyc: EtherfuseKycSnapshot | null = null
  if (session) {
    initialKyc = await getStoredKycSnapshot(session.customerId, session.publicKey)
    try {
      const r = await fetchEtherfuseKycStatus(session.customerId, session.publicKey)
      if (r.ok) {
        initialKyc = r.data
        await upsertStoredKycSnapshot({
          customerId: r.data.customerId,
          walletPublicKey: r.data.walletPublicKey,
          status: r.data.status,
          approvedAt: r.data.approvedAt,
          currentRejectionReason: r.data.currentRejectionReason,
        })
        if (r.data.status === 'approved' || r.data.status === 'approved_chain_deploying') {
          await triggerWalletProvisioning(session.customerId)
        }
      }
    } catch {
      // Fallback a último estado guardado (webhook/local cache).
    }
  }
  return (
    <IdentidadClient initialSession={session} initialKyc={initialKyc} />
  )
}
