/** Red Stellar alineada con la wallet embebida (Pollar) y Horizon en cliente. */
export type PublicStellarNetwork = 'mainnet' | 'testnet'

export function stellarWalletNetworkFromEnv(): PublicStellarNetwork {
  const n =
    process.env.NEXT_PUBLIC_POLLAR_STELLAR_NETWORK ??
    process.env.NEXT_PUBLIC_ACCESLY_NETWORK ??
    process.env.NEXT_PUBLIC_STELLAR_NETWORK
  return n === 'mainnet' ? 'mainnet' : 'testnet'
}

/** Cliente y servidor: testnet si la red pública no es `mainnet`. */
export function isPublicStellarTestnet(): boolean {
  return stellarWalletNetworkFromEnv() === 'testnet'
}
