import EtherfuseOfframpDevClient from '../dev/etherfuse-offramp/etherfuse-offramp-dev-client'

/** Offramp Etherfuse (sandbox / producción según `SEYF_ALLOW_ETHERFUSE_RAMP` en las APIs). */
export default function RetirarPage() {
  return <EtherfuseOfframpDevClient />
}
