/**
 * Analiza respuestas JSON de rutas Seyf (`/api/seyf/*`) para mostrar un solo mensaje al usuario.
 */
export function messageFromSeyfApiBody(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>

  const err = root.error
  if (typeof err === 'string' && err.trim()) return err.trim()

  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    const es = e.message_es
    if (typeof es === 'string' && es.trim()) return es.trim()
    const alt = e.messageEs
    if (typeof alt === 'string' && alt.trim()) return alt.trim()
  }

  return null
}

export function userFacingSeyfApiMessage(data: unknown, status: number): string {
  const fromBody = messageFromSeyfApiBody(data)
  if (fromBody) return fromBody
  return `Error ${status}. Intenta de nuevo o revisa /identidad.`
}
