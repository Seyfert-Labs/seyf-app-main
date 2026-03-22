/** Opciones de fetch para sondeo: evita caché del navegador o de intermediarios. */
export const POLL_FETCH_INIT: RequestInit = {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
}

/** Añade query única para bust de caché HTTP intermedia. */
export function pollBustUrl(path: string): string {
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}_=${Date.now()}`
}
