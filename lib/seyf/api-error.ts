import { NextResponse } from 'next/server'

/** Códigos acordados (issue #37 / PRD US-12). */
export const SEYF_API_ERROR_CODES = [
  'spei_timeout',
  'deploy_failed',
  'advance_limit_exceeded',
  'kyc_pending',
  'insufficient_balance',
  'provider_unavailable',
  'validation_error',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'internal_error',
  'bad_json',
] as const

export type SeyfApiErrorCode = (typeof SEYF_API_ERROR_CODES)[number]

export type SeyfApiErrorPayload = {
  error: {
    code: SeyfApiErrorCode
    message_es: string
    retryable: boolean
  }
}

const GENERIC_500_ES =
  'Algo salió mal. Estamos en ello. Si persiste, intenta más tarde o contacta a soporte.'

/** Mensajes seguros por código (nunca exponen proveedor ni Stellar en bruto). */
export const SEYF_API_ERROR_MESSAGES: Record<SeyfApiErrorCode, string> = {
  spei_timeout:
    'La operación con SPEI tardó demasiado. Puedes intentar de nuevo en unos minutos.',
  deploy_failed:
    'No pudimos completar la operación en la red. Intenta de nuevo o revisa tu saldo y permisos.',
  advance_limit_exceeded:
    'El monto supera el adelanto disponible con las reglas actuales. Ajusta el importe o el plazo.',
  kyc_pending:
    'Tu identidad aún está en revisión o falta completarla. Termina el proceso en Identidad.',
  insufficient_balance:
    'Saldo insuficiente para esta operación. Agrega fondos e inténtalo de nuevo.',
  provider_unavailable:
    'El servicio no respondió a tiempo. Intenta de nuevo en un momento.',
  validation_error: 'Los datos enviados no son válidos. Revisa el formulario e inténtalo de nuevo.',
  unauthorized: 'Necesitas iniciar sesión o vincular tu cuenta para continuar.',
  forbidden: 'No tienes permiso para esta acción en este entorno.',
  not_found: 'No encontramos el recurso solicitado.',
  conflict: 'Esta operación choca con un estado previo (por ejemplo, un proceso pendiente).',
  internal_error: GENERIC_500_ES,
  bad_json: 'El cuerpo de la petición no es JSON válido.',
}

export function seyfApiError(
  status: number,
  code: SeyfApiErrorCode,
  opts?: { message_es?: string; retryable?: boolean },
): NextResponse<SeyfApiErrorPayload> {
  const retryable = opts?.retryable ?? defaultRetryable(code)
  const message_es = opts?.message_es ?? SEYF_API_ERROR_MESSAGES[code]
  return NextResponse.json({ error: { code, message_es, retryable } }, { status })
}

export function defaultRetryable(code: SeyfApiErrorCode): boolean {
  switch (code) {
    case 'spei_timeout':
    case 'provider_unavailable':
      return true
    default:
      return false
  }
}

/** Respuesta 500 genérica sin stack ni detalles técnicos. */
export function seyfInternalError(): NextResponse<SeyfApiErrorPayload> {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[seyf-api] internal_error (detalle solo en servidor)')
  }
  return seyfApiError(500, 'internal_error', { message_es: GENERIC_500_ES, retryable: false })
}

function norm(s: string) {
  return s.toLowerCase()
}

/**
 * Convierte un error desconocido (SDK, fetch, etc.) en respuesta HTTP segura para el cliente.
 * Registra el error original solo en consola del servidor.
 */
export function seyfErrorFromUnknown(
  e: unknown,
  fallbackStatus = 502,
): NextResponse<SeyfApiErrorPayload> {
  console.error('[seyf-api]', e)

  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  const m = norm(raw)

  if (m.includes('timeout') || m.includes('timed out') || m.includes('etimedout')) {
    return seyfApiError(504, 'spei_timeout', { retryable: true })
  }
  if (m.includes('insufficient') || m.includes('underfunded') || m.includes('op_low_reserve')) {
    return seyfApiError(400, 'insufficient_balance', { retryable: false })
  }
  if (m.includes('kyc') || m.includes('verification') || m.includes('identity')) {
    return seyfApiError(403, 'kyc_pending', { retryable: false })
  }
  if (m.includes('advance') || m.includes('limit exceeded') || m.includes('límite')) {
    return seyfApiError(400, 'advance_limit_exceeded', { retryable: false })
  }
  if (
    m.includes('deploy') ||
    m.includes('soroban') ||
    m.includes('invokehostfunction') ||
    m.includes('tx_failed')
  ) {
    return seyfApiError(502, 'deploy_failed', { retryable: true })
  }
  if (
    m.includes('econnrefused') ||
    m.includes('enotfound') ||
    m.includes('fetch failed') ||
    m.includes('503') ||
    m.includes('502') ||
    m.includes('bad gateway') ||
    m.includes('service unavailable')
  ) {
    return seyfApiError(fallbackStatus >= 500 ? fallbackStatus : 503, 'provider_unavailable', {
      retryable: true,
    })
  }

  if (fallbackStatus >= 500) {
    return seyfInternalError()
  }
  if (fallbackStatus === 400) {
    return seyfApiError(400, 'validation_error', { message_es: SEYF_VALIDATION_MESSAGE_ES })
  }
  return seyfApiError(fallbackStatus, 'provider_unavailable', { retryable: true })
}

export const SEYF_VALIDATION_MESSAGE_ES = SEYF_API_ERROR_MESSAGES.validation_error

/** Sin cookie /identidad ni contexto MVP: mismo mensaje en todas las rutas rampa. */
export const SEYF_RAMP_UNAUTHORIZED_MESSAGE_ES =
  'Para usar depósitos y retiros necesitas una sesión vinculada. Inicia con Accesly desde el inicio o completa Identidad.'
