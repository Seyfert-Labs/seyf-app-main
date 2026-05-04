import { redirect } from 'next/navigation'
import { isEtherfuseDevPanelEnabled } from '@/lib/seyf/etherfuse-dev-panel'
import { isKycTestResetEnabled } from '@/lib/seyf/kyc-test-reset'
import DevHubClient from './dev-hub-client'

/** Herramientas internas. Oculto si el panel dev está desactivado. */
export default function DevHubPage() {
  if (!isEtherfuseDevPanelEnabled()) {
    redirect('/dashboard')
  }

  return <DevHubClient showKycReset={isKycTestResetEnabled()} />
}
