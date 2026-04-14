import { NextResponse } from 'next/server'
import { seyfApiError, seyfErrorFromUnknown } from '@/lib/seyf/api-error'
import {
  fetchChainMovements,
  type HorizonNetwork,
} from '@/lib/seyf/horizon-payments'
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
    return seyfApiError(400, 'validation_error', {
      message_es: 'Falta el parámetro de cuenta pública.',
    })
  }
  if (!looksLikeStellarAccount(account)) {
    return seyfApiError(400, 'validation_error', {
      message_es: 'La cuenta pública no tiene un formato válido.',
    })
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
    return seyfErrorFromUnknown(e)
  }
}
