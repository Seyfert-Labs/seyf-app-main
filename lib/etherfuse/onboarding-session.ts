import { cookies } from 'next/headers'
import { z } from 'zod'

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
    return out.success ? out.data : null
  } catch {
    return null
  }
}

export async function saveEtherfuseOnboardingSession(
  data: EtherfuseOnboardingSession,
): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE_NAME, JSON.stringify(data), cookieOptions())
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
  if (existing && existing.publicKey === publicKey) {
    return {
      customerId: existing.customerId,
      bankAccountId: existing.bankAccountId,
    }
  }
  return freshIds
}
