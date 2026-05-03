/**
 * Copy y enlaces para cuando `onrampEnabled` es false pero el motivo no es solo KYC.
 * Evita que usuarios con identidad verificada vean solo «Ir a verificar identidad».
 */

export type EtherfuseReadinessClientPayload = {
  onrampEnabled: boolean
  reasons: string[]
  kycApproved: boolean
  agreementsAccepted: boolean
  bankAccountReady: boolean
  trustlineReady: boolean
  documentsUploaded: boolean
  webhookConfigured: boolean
}

export function parseEtherfuseReadinessJson(raw: unknown): EtherfuseReadinessClientPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const j = raw as Record<string, unknown>
  return {
    onrampEnabled: j.onrampEnabled === true,
    reasons: Array.isArray(j.reasons)
      ? j.reasons.filter((x): x is string => typeof x === 'string')
      : [],
    kycApproved: j.kycApproved === true,
    agreementsAccepted: j.agreementsAccepted === true,
    bankAccountReady: j.bankAccountReady === true,
    trustlineReady: j.trustlineReady === true,
    documentsUploaded: j.documentsUploaded === true,
    webhookConfigured: j.webhookConfigured === true,
  }
}

export function etherfuseDepositBlockedCopy(params: {
  readiness: EtherfuseReadinessClientPayload | null
  kycLoading: boolean
  mode: 'deposit' | 'withdraw'
  fallbackReason?: string | null
}): {
  title: string
  lead: string
  primaryLink: { href: string; label: string }
  extraLinks: Array<{ href: string; label: string }>
} {
  const { readiness: r, kycLoading, mode, fallbackReason } = params

  if (kycLoading && !r) {
    return {
      title: mode === 'deposit' ? 'Validando requisitos…' : 'Validando tu cuenta…',
      lead:
        mode === 'deposit'
          ? 'Revisamos que todo esté listo para mostrarte los datos de depósito.'
          : 'Revisamos que todo esté listo para retirar.',
      primaryLink: { href: '/identidad', label: 'Ir a Identidad' },
      extraLinks: [],
    }
  }

  if (!r) {
    return {
      title: mode === 'deposit' ? 'Verificación requerida' : 'Completa tu cuenta',
      lead:
        fallbackReason ??
        (mode === 'deposit'
          ? 'No pudimos cargar el estado. Intenta de nuevo o continúa desde Identidad.'
          : 'No pudimos cargar el estado. Intenta de nuevo o continúa desde Identidad.'),
      primaryLink: { href: '/identidad', label: 'Ir a Identidad' },
      extraLinks: [],
    }
  }

  const kycOk = r.kycApproved && r.documentsUploaded
  const speiBlockedLead =
    mode === 'deposit'
      ? 'Puede faltar un paso más: acuerdos, cuenta bancaria vinculada o activar tu inversión. La CLABE que ves al crear un depósito es solo para esa transferencia; la que registras en Identidad es la de tu banco.'
      : 'Puede faltar un paso más: acuerdos, cuenta bancaria o activar tu inversión. El retiro va a la cuenta que registraste.'

  const title = kycOk
    ? mode === 'deposit'
      ? 'Faltan pasos para tu primer depósito'
      : 'Faltan pasos para retirar'
    : mode === 'deposit'
      ? 'Verificación requerida'
      : 'Completa tu cuenta'

  const lead =
    kycOk && !r.onrampEnabled
      ? speiBlockedLead
      : r.reasons[0] ??
        fallbackReason ??
        (mode === 'deposit'
          ? 'Completa los pasos en Identidad para generar tu depósito.'
          : 'Completa la verificación para retirar a tu banco.')

  let primaryLink: { href: string; label: string } = { href: '/identidad', label: 'Ir a Identidad' }
  if (!r.kycApproved || !r.documentsUploaded) {
    primaryLink = { href: '/identidad', label: 'Completar identidad y documentos' }
  } else if (!r.agreementsAccepted) {
    primaryLink = { href: '/identidad', label: 'Aceptar acuerdos legales' }
  } else if (!r.bankAccountReady) {
    primaryLink = { href: '/identidad#cuenta-spei', label: 'Vincular CLABE bancaria' }
  } else if (!r.trustlineReady) {
    primaryLink = { href: '/identidad', label: 'Completar configuración en Identidad' }
  }

  return {
    title,
    lead,
    primaryLink,
    extraLinks: [],
  }
}
