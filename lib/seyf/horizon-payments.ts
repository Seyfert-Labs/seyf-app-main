import { stellarWalletNetworkFromEnv } from '@/lib/seyf/stellar-wallet-network'

export type HorizonNetwork = 'testnet' | 'mainnet'

const HORIZON_BASE: Record<HorizonNetwork, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
}

type RawRecord = Record<string, unknown>

export type ChainMovement = {
  id: string
  at: string
  txHash: string
  tipoUi: 'entrada' | 'salida'
  opType: string
  /** Magnitud siempre positiva; el signo lo da tipoUi */
  amount: number
  assetCode: string
  counterparty: string
  detail: string
}

function truncateG(g: string) {
  if (g.length <= 14) return g
  return `${g.slice(0, 6)}…${g.slice(-4)}`
}

function assetCodeFromRecord(r: RawRecord): string {
  const t = r.asset_type
  if (t === 'native') return 'XLM'
  const c = r.asset_code
  return typeof c === 'string' && c.length > 0 ? c : '?'
}

function parseMovement(accountId: string, r: RawRecord): ChainMovement | null {
  const type = String(r.type ?? '')
  const created_at = String(r.created_at ?? '')
  const tx = String(r.transaction_hash ?? '')
  const id = String(r.id ?? `${tx}-${type}`)

  if (type === 'payment' || type === 'path_payment') {
    const from = String(r.from ?? '')
    const to = String(r.to ?? '')
    const asset = assetCodeFromRecord(r)
    const amt = Number.parseFloat(String(r.amount ?? '0'))
    if (!Number.isFinite(amt)) return null
    const incoming = to === accountId
    if (from !== accountId && to !== accountId) return null
    const cp = incoming ? from : to
    return {
      id,
      at: created_at,
      txHash: tx,
      tipoUi: incoming ? 'entrada' : 'salida',
      opType: type,
      amount: amt,
      assetCode: asset,
      counterparty: truncateG(cp),
      detail: incoming ? `Desde ${truncateG(from)}` : `Hacia ${truncateG(to)}`,
    }
  }

  if (type === 'create_account') {
    const account = String(r.account ?? '')
    if (account !== accountId) return null
    const funder = String(r.funder ?? '')
    const amt = Number.parseFloat(String(r.starting_balance ?? '0'))
    if (!Number.isFinite(amt)) return null
    return {
      id,
      at: created_at,
      txHash: tx,
      tipoUi: 'entrada',
      opType: 'create_account',
      amount: amt,
      assetCode: 'XLM',
      counterparty: truncateG(funder),
      detail: `Cuenta creada · fondeo desde ${truncateG(funder)}`,
    }
  }

  return null
}

export function stellarExpertTxUrl(network: HorizonNetwork, txHash: string) {
  const net = network === 'mainnet' ? 'public' : 'testnet'
  return `https://stellar.expert/explorer/${net}/tx/${encodeURIComponent(txHash)}`
}

export async function fetchChainMovements(
  accountId: string,
  network: HorizonNetwork,
  opts?: { cursor?: string; limit?: number },
): Promise<{ movements: ChainMovement[]; nextCursor: string | null }> {
  const limit = opts?.limit ?? 40
  const base = HORIZON_BASE[network]
  let url = `${base}/accounts/${encodeURIComponent(accountId)}/payments?order=desc&limit=${limit}`
  if (opts?.cursor) url += `&cursor=${encodeURIComponent(opts.cursor)}`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (res.status === 404) {
    return { movements: [], nextCursor: null }
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Horizon ${res.status}: ${text.slice(0, 240)}`)
  }
  const json = (await res.json()) as {
    _embedded?: { records?: RawRecord[] }
    _links?: { next?: { href?: string } }
  }
  const records = json._embedded?.records ?? []
  const movements: ChainMovement[] = []
  for (const row of records) {
    const m = parseMovement(accountId, row)
    if (m) movements.push(m)
  }

  let nextCursor: string | null = null
  const nextHref = json._links?.next?.href
  if (nextHref) {
    try {
      const u = new URL(nextHref)
      nextCursor = u.searchParams.get('cursor')
    } catch {
      nextCursor = null
    }
  }

  return { movements, nextCursor }
}

export function horizonNetworkFromEnv(): HorizonNetwork {
  return stellarWalletNetworkFromEnv()
}
