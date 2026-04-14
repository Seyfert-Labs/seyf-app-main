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

const SEYF_RETRY_BACKOFF_MS = 450

/**
 * Si la primera respuesta es error Seyf con `retryable: true`, espera un instante y repite el `fetch` una sola vez.
 * Útil para `provider_unavailable`, `spei_timeout`, `deploy_failed`, etc.
 */
export async function fetchWithSeyfRetryOnce(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const first = await fetch(input, init)
  if (first.ok) return first
  let parsed: unknown
  try {
    parsed = await first.clone().json()
  } catch {
    return first
  }
  if (getSeyfErrorRetryable(parsed) !== true) return first
  await new Promise((r) => setTimeout(r, SEYF_RETRY_BACKOFF_MS))
  return fetch(input, init)
}
