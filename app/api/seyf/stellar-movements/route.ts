import { NextResponse } from 'next/server'
import {
  fetchChainMovements,
  type HorizonNetwork,
} from '@/lib/seyf/horizon-payments'
import { toErrorResponse } from '@/lib/seyf/api-error'
import { chainMovementToUserMovement } from '@/lib/seyf/stellar-chain-to-user-movement'
import type { UserMovement } from '@/lib/seyf/user-movements-types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Cuenta pública Stellar (56 chars, base32). */
function looksLikeStellarAccount(s: string): boolean {
  return s.length === 56 && s.startsWith('G')
}

async function movementsForNetwork(
  account: string,
  network: HorizonNetwork,
  limit: number,
) {
  try {
    const { movements } = await fetchChainMovements(account, network, { limit })
    return movements
  } catch {
    return []
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const account = (searchParams.get('account') ?? '').trim()
  if (!account) {
    return NextResponse.json({ error: 'Falta account' }, { status: 400 })
  }
  if (!looksLikeStellarAccount(account)) {
    return NextResponse.json({ error: 'Cuenta Stellar inválida' }, { status: 400 })
  }

  const limitPerNet = 30

  try {
    const [testRows, mainRows] = await Promise.all([
      movementsForNetwork(account, 'testnet', limitPerNet),
      movementsForNetwork(account, 'mainnet', limitPerNet),
    ])

    const out: UserMovement[] = [
      ...testRows.map((m) => chainMovementToUserMovement(m, 'testnet')),
      ...mainRows.map((m) => chainMovementToUserMovement(m, 'mainnet')),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    return NextResponse.json(out, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (e) {
    return toErrorResponse(e, 'stellar-movements')
  }
}
