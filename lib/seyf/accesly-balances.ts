/** Normaliza strings tipo "1,234.56" o números desde balances de wallet (Pollar / legado Accesly). */
export function parseAcceslyAmount(raw: unknown): number {
  if (raw == null) return 0
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const s = String(raw).trim().replace(/,/g, '')
  if (s === '') return 0
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export function balanceForAssetCode(assetBalances: unknown, code: string): number {
  if (!Array.isArray(assetBalances)) return 0
  const want = code.toUpperCase()
  for (const row of assetBalances) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const c = String(o.code ?? o.assetCode ?? '').toUpperCase()
    if (c === want) return parseAcceslyAmount(o.balance)
  }
  return 0
}
