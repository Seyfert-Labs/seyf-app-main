import { NextResponse } from 'next/server'
import { isPublicStellarTestnet } from '@/lib/seyf/stellar-wallet-network'
import { resolveEtherfuseRampContext } from '@/lib/seyf/etherfuse-ramp-context'
import {
  getWelcomeBonusClaimByCustomerId,
  clearWelcomeBonusClaimByCustomerId,
} from '@/lib/seyf/welcome-bonus-store'

export const dynamic = 'force-dynamic'

/**
 * Solo disponible en testnet. Resetea el reclamo del bono de bienvenida para una wallet.
 * Usado cuando la orden quedó atascada en "funded" por la simulación demasiado rápida.
 *
 * DELETE /api/seyf/internal/reset-bonus?wallet=GXXX...
 */
export async function DELETE(request: Request) {
  if (!isPublicStellarTestnet()) {
    return NextResponse.json({ error: 'Solo disponible en testnet.' }, { status: 403 })
  }

  const wallet = new URL(request.url).searchParams.get('wallet') ?? null
  if (!wallet) {
    return NextResponse.json({ error: 'Parámetro "wallet" requerido.' }, { status: 400 })
  }

  const ctx = await resolveEtherfuseRampContext({ walletPublicKeyHint: wallet })
  if (!ctx) {
    return NextResponse.json({ error: 'No se encontró contexto para esta wallet.' }, { status: 404 })
  }

  const existing = await getWelcomeBonusClaimByCustomerId(ctx.customerId)
  if (!existing) {
    return NextResponse.json({ ok: true, message: 'No había reclamo de bono registrado.', customerId: ctx.customerId })
  }

  await clearWelcomeBonusClaimByCustomerId(ctx.customerId)
  return NextResponse.json({
    ok: true,
    message: 'Reclamo de bono eliminado. El usuario puede reclamar de nuevo.',
    customerId: ctx.customerId,
    deletedClaim: existing,
  })
}
