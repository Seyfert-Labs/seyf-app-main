'use server'

import { clearEtherfuseOnboardingSession } from '@/lib/etherfuse/onboarding-session'
import { generateOnboardingPresignedUrlResolving409 } from '@/lib/etherfuse/onboarding'
import { newEtherfuseOnboardingIds } from '@/lib/etherfuse/integration-model'
import {
  getEtherfuseOnboardingSession,
  resolveOnboardingIds,
  saveEtherfuseOnboardingSession,
} from '@/lib/etherfuse/onboarding-session'
import {
  isValidStellarPublicKey,
  normalizeStellarPublicKey,
} from '@/lib/etherfuse/stellar-public-key'
import { isKycTestResetEnabled } from '@/lib/seyf/kyc-test-reset'

export type StartHostedOnboardingResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * Obtiene la URL firmada de Etherfuse (hosted KYC) y guarda customerId / bankAccountId / publicKey en cookie httpOnly.
 */
export async function startHostedEtherfuseOnboarding(
  publicKeyRaw: string,
): Promise<StartHostedOnboardingResult> {
  const publicKey = normalizeStellarPublicKey(publicKeyRaw)
  if (!isValidStellarPublicKey(publicKey)) {
    return {
      ok: false,
      error:
        'Clave pública Stellar no válida. Debe empezar con G y tener 56 caracteres (formato cuenta Stellar).',
    }
  }

  try {
    const existing = await getEtherfuseOnboardingSession()
    const fresh = newEtherfuseOnboardingIds()
    const { customerId, bankAccountId } = resolveOnboardingIds(existing, publicKey, fresh)

    const resolved = await generateOnboardingPresignedUrlResolving409({
      customerId,
      bankAccountId,
      publicKey,
    })

    await saveEtherfuseOnboardingSession({
      customerId: resolved.customerId,
      bankAccountId: resolved.bankAccountId,
      publicKey,
    })

    return { ok: true, url: resolved.presignedUrl }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo iniciar la verificación.'
    return { ok: false, error: message }
  }
}

export type ResetKycTestSessionResult = { ok: true } | { ok: false; error: string }

/** Solo con isKycTestResetEnabled(): borra la cookie Seyf ↔ Etherfuse en este navegador. */
export async function resetKycTestSession(): Promise<ResetKycTestSessionResult> {
  if (!isKycTestResetEnabled()) {
    return { ok: false, error: 'Reinicio de prueba no disponible en este entorno.' }
  }
  await clearEtherfuseOnboardingSession()
  return { ok: true }
}
