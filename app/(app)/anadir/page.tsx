import EtherfuseRampDevClient from '../dev/etherfuse-ramp/etherfuse-ramp-dev-client'

/** Onramp Etherfuse (sandbox / producción según `SEYF_ALLOW_ETHERFUSE_RAMP` en las APIs). */
export default function AnadirPage() {
  return <EtherfuseRampDevClient />
}
