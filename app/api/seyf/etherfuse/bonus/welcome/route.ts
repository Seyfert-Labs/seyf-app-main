import { NextResponse } from 'next/server'
import { AppError, toErrorResponse } from '@/lib/seyf/api-error'
import { guardEtherfuseRampRoutes } from '@/lib/seyf/etherfuse-ramp-guard'
import { resolveEtherfuseRampContext } from '@/lib/seyf/etherfuse-ramp-context'
import { rateLimitResponse } from '@/lib/seyf/redis-guards'
import { isPublicStellarTestnet } from '@/lib/seyf/stellar-wallet-network'
import { getWelcomeBonusClaimByCustomerId, upsertWelcomeBonusClaim } from '@/lib/seyf/welcome-bonus-store'
import { assertEtherfuseKycApproved } from '@/lib/seyf/etherfuse-kyc-guard'
import { fetchRampableAssetsForWallet, pickCetesTargetIdentifier } from '@/lib/etherfuse/ramp-api'
import { executeMvpPartnerOnramp } from '@/lib/etherfuse/mvp-onramp'
import { etherfuseFetch, etherfuseReadBody } from '@/lib/etherfuse/client'
import { acceptAllEtherfuseAgreements } from '@/lib/etherfuse/agreements'
import { generateOnboardingPresignedUrlResolving409 } from '@/lib/etherfuse/onboarding'
import { upsertStoredAgreementsAccepted } from '@/lib/seyf/agreements-state-store'
import { fetchOrderDetailsWithRetry, pickRampOrderTransactionDetails } from '@/lib/etherfuse/orders-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const WELCOME_BONUS_MXN = 300
const BONUS_AUTO_CONFIRM_ATTEMPTS = 4

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isOrderEffectivelyFunded(status: string | null): boolean {
  const s = (status ?? '').toLowerCase()
  return s === 'funded' || s === 'completed' || s === 'success'
}

async function autoConfirmSandboxOrder(orderId: string): Promise<{ status: string | null; details: unknown }> {
  let lastDetails: unknown = null
  let lastStatus: string | null = null

  // Esperar 1.5s para que Etherfuse registre la orden antes de simular pago
  await sleep(1500)

  for (let attempt = 0; attempt < BONUS_AUTO_CONFIRM_ATTEMPTS; attempt++) {
    const sim = await etherfuseFetch('/ramp/order/fiat_received', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
    const { text: simText } = await etherfuseReadBody(sim)
    if (!sim.ok) {
      throw new AppError('provider_unavailable', {
        statusCode: sim.status >= 400 && sim.status < 600 ? sim.status : 502,
        retryable: false,
        message: `Sandbox fiat_received falló: ${simText.slice(0, 500)}`,
      })
    }

    lastDetails = await fetchOrderDetailsWithRetry(orderId)
    const details = pickRampOrderTransactionDetails(lastDetails)
    lastStatus = details.status
    if (isOrderEffectivelyFunded(lastStatus)) {
      return { status: lastStatus, details: lastDetails }
    }
    await sleep(700 + attempt * 300)
  }

  return { status: lastStatus, details: lastDetails }
}

function ensureTestnet() {
  if (!isPublicStellarTestnet()) {
    throw new AppError('validation_error', {
      statusCode: 403,
      retryable: false,
      message: 'Bono bienvenida solo disponible en testnet.',
    })
  }
}

async function ensureAgreementsForWallet(ctx: {
  customerId: string
  bankAccountId: string
  publicKey: string
}): Promise<void> {
  const resolved = await generateOnboardingPresignedUrlResolving409({
    customerId: ctx.customerId,
    bankAccountId: ctx.bankAccountId,
    publicKey: ctx.publicKey,
  })
  await acceptAllEtherfuseAgreements({
    presignedUrl: resolved.presignedUrl,
  })
  await upsertStoredAgreementsAccepted({
    customerId: resolved.customerId,
    walletPublicKey: ctx.publicKey,
  })
}

export async function GET(request: Request) {
  const denied = guardEtherfuseRampRoutes()
  if (denied) return denied
  try {
    ensureTestnet()
    const walletHint = new URL(request.url).searchParams.get('wallet') ?? null
    const ctx = await resolveEtherfuseRampContext({ walletPublicKeyHint: walletHint })
    if (!ctx) {
      return NextResponse.json({ ok: true, hasContext: false, claimed: false }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const claim = await getWelcomeBonusClaimByCustomerId(ctx.customerId)
    return NextResponse.json(
      {
        ok: true,
        hasContext: true,
        claimed: Boolean(claim),
        claim,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return toErrorResponse(e, 'etherfuse/bonus/welcome:get')
  }
}

export async function POST(request: Request) {
  const denied = guardEtherfuseRampRoutes()
  if (denied) return denied
  // 3 intentos por IP cada 60s — previene spam del bono
  const limited = await rateLimitResponse(request, 'bonus/welcome', { limit: 3, windowSec: 60 })
  if (limited) return limited
  try {
    ensureTestnet()

    let walletHint: string | null = null
    try {
      const body = await request.json() as Record<string, unknown>
      if (typeof body.wallet === 'string') walletHint = body.wallet
    } catch { /* empty body is fine */ }

    const ctx = await resolveEtherfuseRampContext({
      walletPublicKeyHint: walletHint,
    })
    if (!ctx) {
      console.warn('[bonus/welcome] ctx null — walletHint:', walletHint ?? '(none)')
      throw new AppError('validation_error', {
        statusCode: 400,
        retryable: false,
        message: walletHint
          ? 'No encontramos tu sesión de Etherfuse. Ve a /identidad y completa la verificación nuevamente.'
          : 'Completa primero el proceso de identidad en /identidad para reclamar el bono.',
      })
    }

    const already = await getWelcomeBonusClaimByCustomerId(ctx.customerId)
    if (already) {
      return NextResponse.json(
        { ok: true, alreadyClaimed: true, claim: already },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    await assertEtherfuseKycApproved({ customerId: ctx.customerId, publicKey: ctx.publicKey })

    const { assets } = await fetchRampableAssetsForWallet({ walletPublicKey: ctx.publicKey })
    const cetesId = pickCetesTargetIdentifier(assets)
    if (!cetesId) {
      throw new AppError('validation_error', {
        statusCode: 422,
        retryable: false,
        message: 'No hay activo CETES disponible para esta wallet en testnet.',
      })
    }

    const runBonusOnramp = () =>
      executeMvpPartnerOnramp({
        sourceAmount: String(WELCOME_BONUS_MXN),
        amountMxn: WELCOME_BONUS_MXN,
        targetAssetIdentifier: cetesId,
        identity: {
          customerId: ctx.customerId,
          publicKey: ctx.publicKey,
          bankAccountId: ctx.bankAccountId,
        },
      })

    let ramp: Awaited<ReturnType<typeof executeMvpPartnerOnramp>>
    try {
      ramp = await runBonusOnramp()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('organization not found') || msg.toLowerCase().includes('customer not found')) {
        throw new AppError('validation_error', {
          statusCode: 401,
          retryable: false,
          message: 'Tu sesión pertenece a una organización anterior. Ve a /identidad, usa "Reiniciar verificación" en /dev y vuelve a completar el KYC.',
        })
      }
      if (msg.toLowerCase().includes('terms and conditions')) {
        await ensureAgreementsForWallet({
          customerId: ctx.customerId,
          bankAccountId: ctx.bankAccountId,
          publicKey: ctx.publicKey,
        })
        ramp = await runBonusOnramp()
      } else {
        throw e
      }
    }

    const confirm = await autoConfirmSandboxOrder(ramp.deposit.orderId)
    if (!isOrderEffectivelyFunded(confirm.status)) {
      throw new AppError('provider_unavailable', {
        statusCode: 502,
        retryable: true,
        message:
          'Sandbox procesó el depósito pero la orden sigue pendiente. Reintenta en unos segundos para terminar auto-confirmación.',
      })
    }

    await upsertWelcomeBonusClaim({
      customerId: ctx.customerId,
      orderId: ramp.deposit.orderId,
      amountMxn: WELCOME_BONUS_MXN,
    })

    return NextResponse.json(
      {
        ok: true,
        alreadyClaimed: false,
        amountMxn: WELCOME_BONUS_MXN,
        orderId: ramp.deposit.orderId,
        depositClabe: ramp.deposit.clabe,
        orderStatus: confirm.status,
        orderDetails: confirm.details,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return toErrorResponse(e, 'etherfuse/bonus/welcome:post')
  }
}
