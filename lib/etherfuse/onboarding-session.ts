import { cookies } from 'next/headers'
import { z } from 'zod'
import { normalizeStellarPublicKey } from '@/lib/etherfuse/stellar-public-key'

/** Nombre httpOnly; el JSON debe ser UUIDs creados con la misma org que `ETHERFUSE_API_KEY`. */
const COOKIE_NAME = 'seyf_ef_onboarding'

const sessionSchema = z.object({
  customerId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  publicKey: z.string().min(1),
})

export type EtherfuseOnboardingSession = z.infer<typeof sessionSchema>

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90 // 90 días

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SEC,
  }
}

export async function getEtherfuseOnboardingSession(): Promise<EtherfuseOnboardingSession | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE_NAME)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const out = sessionSchema.safeParse(parsed)
    if (!out.success) return null
    return {
      ...out.data,
      publicKey: normalizeStellarPublicKey(out.data.publicKey),
    }
  } catch {
    return null
  }
}

export async function saveEtherfuseOnboardingSession(
  data: EtherfuseOnboardingSession,
): Promise<void> {
  const jar = await cookies()
  const normalized: EtherfuseOnboardingSession = {
    ...data,
    publicKey: normalizeStellarPublicKey(data.publicKey),
  }
  jar.set(COOKIE_NAME, JSON.stringify(normalized), cookieOptions())
}

export async function clearEtherfuseOnboardingSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

/**
 * Reutiliza customerId/bankAccountId si la cookie coincide con la misma wallet;
 * si cambia la clave pública, genera IDs nuevos (otro cliente lógico en Etherfuse).
 */
export function resolveOnboardingIds(
  existing: EtherfuseOnboardingSession | null,
  publicKey: string,
  freshIds: { customerId: string; bankAccountId: string },
): { customerId: string; bankAccountId: string } {
  const next = normalizeStellarPublicKey(publicKey)
  if (
    existing &&
    normalizeStellarPublicKey(existing.publicKey) === next
  ) {
    return {
      customerId: existing.customerId,
      bankAccountId: existing.bankAccountId,
    }
  }
  return freshIds
}
