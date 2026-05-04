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
    email: z.preprocess(emptyToUndefined, z.string().trim().email().optional()),
    phoneNumber: z.preprocess(emptyToUndefined, z.string().trim().min(5).optional()),
    occupation: z.preprocess(emptyToUndefined, z.string().trim().min(2).optional()),
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
      country: z.string().trim().length(2),
    }),
    idNumbers: z
      .array(
        z.object({
          id: z.string().trim().min(1).optional(),
          type: z.string().trim().min(1),
          value: z.string().trim().min(1),
        }),
      )
      .min(1),
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
    // Ensure customer/bank-account context exists in Etherfuse before programmatic KYC submit.
    let resolved: { customerId: string; bankAccountId: string; presignedUrl: string }
    try {
      resolved = await generateOnboardingPresignedUrlResolving409({
        customerId: ids.customerId,
        bankAccountId: ids.bankAccountId,
        publicKey,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const mapped = mapKycProviderSetupError(msg)
      if (mapped) throw mapped
      throw e
    }
    await saveEtherfuseOnboardingSession({
      customerId: resolved.customerId,
      bankAccountId: resolved.bankAccountId,
      publicKey,
    })

    const submission = await submitEtherfuseKycIdentityData({
      customerId: resolved.customerId,
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

    return NextResponse.json(
      {
        ok: true,
        status: submission.status,
        message: submission.message,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch (e) {
    if (process.env.NODE_ENV !== 'production' && e instanceof Error) {
      const base = toErrorResponse(e, 'kyc/submit')
      const body = (await base.json()) as { error?: unknown }
      return NextResponse.json(
        {
          ...(typeof body === 'object' && body ? body : {}),
          debug_message: e.message,
        },
        { status: base.status, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    return toErrorResponse(e, 'kyc/submit')
  }
}
