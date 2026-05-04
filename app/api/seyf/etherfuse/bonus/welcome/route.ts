import { NextResponse } from 'next/server'
import { AppError, toErrorResponse } from '@/lib/seyf/api-error'
import { guardEtherfuseRampRoutes } from '@/lib/seyf/etherfuse-ramp-guard'
import { getEtherfuseRampContext } from '@/lib/seyf/etherfuse-ramp-context'
import { isPublicStellarTestnet } from '@/lib/seyf/stellar-wallet-network'
import { getWelcomeBonusClaimByCustomerId, upsertWelcomeBonusClaim } from '@/lib/seyf/welcome-bonus-store'
import { assertEtherfuseKycApproved } from '@/lib/seyf/etherfuse-kyc-guard'
import { fetchRampableAssetsForWallet, pickCetesTargetIdentifier } from '@/lib/etherfuse/ramp-api'
import { executeMvpPartnerOnramp } from '@/lib/etherfuse/mvp-onramp'
import { etherfuseFetch, etherfuseReadBody } from '@/lib/etherfuse/client'
import { acceptAllEtherfuseAgreements } from '@/lib/etherfuse/agreements'
import { generateOnboardingPresignedUrlResolving409 } from '@/lib/etherfuse/onboarding'
import { upsertStoredAgreementsAccepted } from '@/lib/seyf/agreements-state-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const WELCOME_BONUS_MXN = 300

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

export async function GET() {
  const denied = guardEtherfuseRampRoutes()
  if (denied) return denied
  try {
    ensureTestnet()
    const ctx = await getEtherfuseRampContext()
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

export async function POST() {
  const denied = guardEtherfuseRampRoutes()
  if (denied) return denied
  try {
    ensureTestnet()
    const ctx = await getEtherfuseRampContext()
    if (!ctx) {
      throw new AppError('validation_error', {
        statusCode: 401,
        retryable: false,
        message: 'Sin contexto rampa: completa /identidad.',
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

    const sim = await etherfuseFetch('/ramp/order/fiat_received', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: ramp.deposit.orderId }),
    })
    const { json: simJson, text: simText } = await etherfuseReadBody(sim)
    if (!sim.ok) {
      throw new AppError('provider_unavailable', {
        statusCode: sim.status >= 400 && sim.status < 600 ? sim.status : 502,
        retryable: false,
        message: `Sandbox fiat_received falló: ${simText.slice(0, 500)}`,
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
        fiatReceived: simJson,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return toErrorResponse(e, 'etherfuse/bonus/welcome:post')
  }
}
