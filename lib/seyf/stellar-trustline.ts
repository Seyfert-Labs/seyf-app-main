import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk'

/** Emisor CETES testnet por defecto (mismo que documentación Etherfuse / sandbox). */
const CETES_ISSUER_TESTNET = 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4'

type StellarNetwork = 'testnet' | 'mainnet' | 'public'

function resolveNetwork(): { passphrase: string; horizonUrl: string; network: StellarNetwork } {
  const env = (
    process.env.NEXT_PUBLIC_POLLAR_STELLAR_NETWORK ??
    process.env.NEXT_PUBLIC_STELLAR_NETWORK ??
    'testnet'
  )
    .trim()
    .toLowerCase()

  if (env === 'mainnet' || env === 'public') {
    return {
      passphrase: Networks.PUBLIC,
      horizonUrl: 'https://horizon.stellar.org',
      network: 'mainnet',
    }
  }
  return {
    passphrase: Networks.TESTNET,
    horizonUrl: 'https://horizon-testnet.stellar.org',
    network: 'testnet',
  }
}

function getCetesAsset(): Asset {
  const issuer = process.env.ETHERFUSE_CETES_ISSUER?.trim() || CETES_ISSUER_TESTNET
  return new Asset('CETES', issuer)
}

/**
 * Builds an unsigned XDR for a `changeTrust` operation (CETES).
 * The XDR must be signed by the wallet owner (via Pollar client SDK) and submitted.
 */
export async function buildCetesTrustlineXdr(publicKey: string): Promise<string> {
  const { passphrase, horizonUrl } = resolveNetwork()
  const server = new Horizon.Server(horizonUrl)
  const account = await server.loadAccount(publicKey)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: passphrase,
  })
    .addOperation(
      Operation.changeTrust({
        asset: getCetesAsset(),
      }),
    )
    .setTimeout(120)
    .build()

  return tx.toXDR()
}

/**
 * Checks whether the account already has a trustline for CETES.
 */
export async function hasCetesTrustline(publicKey: string): Promise<boolean> {
  const { horizonUrl } = resolveNetwork()
  const server = new Horizon.Server(horizonUrl)

  try {
    const account = await server.loadAccount(publicKey)
    const cetes = getCetesAsset()
    const wantIssuer = cetes.getIssuer().toUpperCase()
    const wantCode = cetes.getCode().toUpperCase()
    return account.balances.some(
      (b) =>
        'asset_code' in b &&
        'asset_issuer' in b &&
        String(b.asset_code).toUpperCase() === wantCode &&
        String(b.asset_issuer).toUpperCase() === wantIssuer,
    )
  } catch {
    return false
  }
}

export function getCetesAssetIdentifier(): string {
  const asset = getCetesAsset()
  return `${asset.getCode()}:${asset.getIssuer()}`
}

export function getStellarNetworkName(): StellarNetwork {
  return resolveNetwork().network
}
