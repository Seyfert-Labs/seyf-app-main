/**
 * Convierte entradas habituales a `YYYY-MM-DD` (Etherfuse / HTML `input[type=date]`).
 * Devuelve `null` si no se reconoce una fecha civil válida.
 */
function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1000 || y > 9999) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  )
}

export function normalizeDateOfBirthToIso(input: string): string | null {
  const t = input.trim()
  if (!t) return null

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (iso) {
    const y = Number(iso[1])
    const m = Number(iso[2])
    const d = Number(iso[3])
    if (!isValidYmd(y, m, d)) return null
    return `${iso[1]}-${iso[2]}-${iso[3]}`
  }

  // `1990-05-15T00:00:00.000Z` u otra ISO con hora
  if (t.includes('T') || t.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(t)) {
    const dt = new Date(t)
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
  }

  // DD/MM/YYYY o DD-MM-YYYY (formularios MX / texto)
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    const year = Number(dmy[3])
    if (!isValidYmd(year, month, day)) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // YYYYMMDD
  if (/^\d{8}$/.test(t)) {
    const y = Number(t.slice(0, 4))
    const m = Number(t.slice(4, 6))
    const d = Number(t.slice(6, 8))
    if (!isValidYmd(y, m, d)) return null
    return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`
  }

  return null
}
