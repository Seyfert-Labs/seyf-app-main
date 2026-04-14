import type { SeyfApiErrorCode, SeyfApiErrorPayload } from '@/lib/seyf/api-error'

export type SeyfClientApiError = SeyfApiErrorPayload['error']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Detecta el cuerpo `{ error: { code, message_es, retryable } }` devuelto por las rutas Seyf. */
export function extractSeyfApiError(json: unknown): SeyfClientApiError | null {
  if (!isRecord(json)) return null
  const err = json.error
  if (!isRecord(err)) return null
  const code = err.code
  const message_es = err.message_es
  const retryable = err.retryable
  if (typeof code !== 'string' || typeof message_es !== 'string' || typeof retryable !== 'boolean') {
    return null
  }
  return { code: code as SeyfApiErrorCode, message_es, retryable }
}

/** Mensaje seguro para UI: usa payload Seyf o un fallback genérico (nunca muestra string técnico legacy). */
export function getSeyfErrorDisplayMessage(json: unknown, fallbackEs = 'No pudimos completar la acción.'): string {
  const parsed = extractSeyfApiError(json)
  if (parsed) return parsed.message_es
  if (isRecord(json) && typeof json.error === 'string') {
    return fallbackEs
  }
  return fallbackEs
}

/** Para CTAs: `true` / `false` si el cuerpo es error Seyf; si no, `null` (p. ej. HTML o formato viejo). */
export function getSeyfErrorRetryable(json: unknown): boolean | null {
  return extractSeyfApiError(json)?.retryable ?? null
}
