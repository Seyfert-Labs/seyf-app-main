import EtherfuseRampDevClient from '../dev/etherfuse-ramp/etherfuse-ramp-dev-client'
import DepositClabeSection from '@/components/app/deposit-clabe-section'

/** Onramp Etherfuse (sandbox / producción según `SEYF_ALLOW_ETHERFUSE_RAMP` en las APIs). */
export default function AnadirPage() {
  return (
    <>
      <DepositClabeSection />
      <EtherfuseRampDevClient />
    </>
  )
}
