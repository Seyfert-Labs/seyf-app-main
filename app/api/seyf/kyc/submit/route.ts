import { NextResponse } from 'next/server'
import { z } from 'zod'
import { submitEtherfuseKycIdentityData } from '@/lib/etherfuse/kyc'
import { generateOnboardingPresignedUrlResolving409 } from '@/lib/etherfuse/onboarding'
import {
  isRecoverableRegisterWalletConflict,
  registerOrganizationWallet,
} from '@/lib/etherfuse/wallets'
import {
  getEtherfuseOnboardingSession,
  resolveOnboardingIds,
  saveEtherfuseOnboardingSession,
} from '@/lib/etherfuse/onboarding-session'
import { newEtherfuseOnboardingIds } from '@/lib/etherfuse/integration-model'
import {
  isValidStellarPublicKey,
  normalizeStellarPublicKey,
} from '@/lib/etherfuse/stellar-public-key'
import { AppError, toErrorResponse } from '@/lib/seyf/api-error'
import { rateLimitResponse } from '@/lib/seyf/redis-guards'
import { normalizeDateOfBirthToIso } from '@/lib/seyf/normalize-date-of-birth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Evita que `""` falle reglas `.email()` / `.min()` en campos que Etherfuse trata como omitidos. */
function emptyToUndefined(v: unknown): unknown {
  return typeof v === 'string' && v.trim() === '' ? undefined : v
}

const bodySchema = z.object({
  publicKey: z.string().trim().min(1),
  identity: z.object({
    id: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
    email: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
    phoneNumber: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
    occupation: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
    name: z.object({
      givenName: z.string().trim().min(1),
      familyName: z.string().trim().min(1),
    }),
    dateOfBirth: z
      .string()
      .trim()
      .refine((s) => normalizeDateOfBirthToIso(s) !== null, {
        message: 'identity.dateOfBirth must be a valid date (YYYY-MM-DD)',
      })
      .transform((s) => normalizeDateOfBirthToIso(s)!),
    address: z.object({
      street: z.string().trim().min(1),
      city: z.string().trim().min(1),
      region: z.string().trim().min(1),
      postalCode: z.string().trim().min(1),
      // accept up to 3 chars and slice to 2 — prevents length(2) failure if user typed extra chars
      country: z.string().trim().min(2).transform((s) => s.slice(0, 2).toUpperCase()),
    }),
    idNumbers: z
      .array(
        z.object({
          id: z.string().trim().min(1).optional(),
          type: z.string().trim().min(1),
          value: z.string().trim().min(1),
        }),
      )
      // filter out entries with empty value before validating min(1) array length
      .transform((arr) => arr.filter((x) => x.value.trim().length > 0))
      .pipe(z.array(z.object({ id: z.string().optional(), type: z.string(), value: z.string() })).min(1)),
  }),
})

function mapKycProviderSetupError(message: string): AppError | null {
  const m = message.toLowerCase()
  /**
   * No mapear `see org:` / “otra organización”: Etherfuse lo usa también para conflicto de
   * customerId dentro de la misma API key; el mensaje fijo confundía y bloqueaba KYC injustamente.
   */
  if (m.includes('organization not found')) {
    return new AppError('validation_error', {
      statusCode: 400,
      retryable: false,
      message:
        'No encontramos tu organización en Etherfuse para esta API key/entorno. Revisa ETHERFUSE_API_BASE_URL y ETHERFUSE_API_KEY.',
    })
  }
  return null
}

export async function POST(req: Request) {
  // 5 intentos por IP cada 10 minutos — evita fuerza bruta en KYC
  const limited = await rateLimitResponse(req, 'kyc/submit', { limit: 5, windowSec: 600 })
  if (limited) return limited
  try {
    const raw = (await req.json().catch(() => null)) as unknown
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      throw new AppError('validation_error', {
        statusCode: 400,
        retryable: false,
        message: `Invalid KYC payload: ${parsed.error.message}`,
      })
    }

    const publicKey = normalizeStellarPublicKey(parsed.data.publicKey)
    if (!isValidStellarPublicKey(publicKey)) {
      throw new AppError('validation_error', {
        statusCode: 400,
        retryable: false,
        message: 'Invalid Stellar public key.',
      })
    }

    const existing = await getEtherfuseOnboardingSession()
    const fresh = newEtherfuseOnboardingIds()
    const ids = resolveOnboardingIds(existing, publicKey, fresh)
    const hasMatchingSession =
      !!existing &&
      normalizeStellarPublicKey(existing.publicKey) === publicKey &&
      !!existing.customerId &&
      !!existing.bankAccountId

    await saveEtherfuseOnboardingSession({
      customerId: ids.customerId,
      bankAccountId: ids.bankAccountId,
      publicKey,
    })
    // Always register the user's Pollar wallet at org level first.
    // This keeps Wallets & Banks in Etherfuse aligned with real app users.
    try {
      await registerOrganizationWallet({
        publicKey,
        blockchain: 'stellar',
        claimOwnership: true,
      })
    } catch (e) {
      if (isRecoverableRegisterWalletConflict(e)) {
        // Wallet ya figura en la org; seguimos para onboarding-url + resolución 409 / customerId real.
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        const mapped = mapKycProviderSetupError(msg)
        if (mapped) throw mapped
        throw e
      }
    }
    /**
     * Resuelve customerId/bankAccountId garantizando que existan en el org activo.
     * Si hay sesión guardada (cookie) pero el customerId ya no existe en Etherfuse
     * (p.ej. cambio de org/API key), se descarta y se genera contexto fresco.
     */
    const resolveOnboardingContext = async (useStaleSession: boolean) => {
      const baseIds = useStaleSession ? ids : newEtherfuseOnboardingIds()
      const resolved = await generateOnboardingPresignedUrlResolving409({
        customerId: baseIds.customerId,
        bankAccountId: baseIds.bankAccountId,
        publicKey,
      })
      await saveEtherfuseOnboardingSession({
        customerId: resolved.customerId,
        bankAccountId: resolved.bankAccountId,
        publicKey,
      })
      return { customerId: resolved.customerId, bankAccountId: resolved.bankAccountId }
    }

    let resolvedCustomerId = ids.customerId
    let resolvedBankAccountId = ids.bankAccountId

    if (!hasMatchingSession) {
      try {
        const ctx = await resolveOnboardingContext(true)
        resolvedCustomerId = ctx.customerId
        resolvedBankAccountId = ctx.bankAccountId
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        const mapped = mapKycProviderSetupError(msg)
        if (mapped) throw mapped
        throw e
      }
    }

    const buildIdentityPayload = () => ({
      customerId: resolvedCustomerId,
      pubkey: publicKey,
      identity: {
        ...parsed.data.identity,
        id: parsed.data.identity.id?.trim() || publicKey,
        ...(parsed.data.identity.email ? { email: parsed.data.identity.email.trim() } : {}),
        ...(parsed.data.identity.phoneNumber
          ? { phoneNumber: parsed.data.identity.phoneNumber.trim() }
          : {}),
        ...(parsed.data.identity.occupation
          ? { occupation: parsed.data.identity.occupation.trim() }
          : {}),
        idNumbers: parsed.data.identity.idNumbers.map((x) => ({
          id: x.id?.trim() || x.value.trim(),
          type: x.type.trim(),
          value: x.value.trim(),
        })),
        address: {
          ...parsed.data.identity.address,
          country: parsed.data.identity.address.country.toUpperCase(),
        },
      },
    })

    let submission: Awaited<ReturnType<typeof submitEtherfuseKycIdentityData>>
    try {
      submission = await submitEtherfuseKycIdentityData(buildIdentityPayload())
    } catch (submitErr) {
      const submitMsg = submitErr instanceof Error ? submitErr.message : String(submitErr)
      // Sesión stale (org cambió) — regenerar contexto fresco e intentar de nuevo
      if (submitMsg.toLowerCase().includes('organization not found') || submitMsg.toLowerCase().includes('customer not found')) {
        console.warn('[kyc/submit] stale session detected, regenerating onboarding context and retrying')
        try {
          const freshCtx = await resolveOnboardingContext(false)
          resolvedCustomerId = freshCtx.customerId
          resolvedBankAccountId = freshCtx.bankAccountId
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          const mapped = mapKycProviderSetupError(msg)
          if (mapped) throw mapped
          throw e
        }
        submission = await submitEtherfuseKycIdentityData(buildIdentityPayload())
      } else {
        throw submitErr
      }
    }

    return NextResponse.json(
      {
        ok: true,
        status: submission!.status,
        message: submission!.message,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch (e) {
    const base = toErrorResponse(e, 'kyc/submit')
    // Always include debug_message so Vercel logs + client console show the exact failure
    const body = (await base.json()) as { error?: unknown }
    const debugMsg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      {
        ...(typeof body === 'object' && body ? body : {}),
        debug_message: debugMsg,
      },
      { status: base.status, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
