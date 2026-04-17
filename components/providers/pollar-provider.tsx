'use client'

import { ReactNode, useMemo } from 'react'
import { PollarProvider } from '@pollar/react'
import type { PollarClientConfig } from '@pollar/core'
import '@pollar/react/styles.css'

import { stellarWalletNetworkFromEnv } from '@/lib/seyf/stellar-wallet-network'

type Props = {
  children: ReactNode
}

export default function SeyfPollarProvider({ children }: Props) {
  const apiKey =
    process.env.NEXT_PUBLIC_POLLAR_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY?.trim() ||
    ''

  const stellarNetwork = stellarWalletNetworkFromEnv()

  const config = useMemo((): PollarClientConfig => {
    return {
      apiKey,
      stellarNetwork,
    }
  }, [apiKey, stellarNetwork])

  if (typeof window !== 'undefined' && !apiKey) {
    console.warn(
      '[Seyf] Falta NEXT_PUBLIC_POLLAR_API_KEY (clave publicable desde https://dashboard.pollar.xyz/).',
    )
  }

  return <PollarProvider config={config}>{children}</PollarProvider>
}
