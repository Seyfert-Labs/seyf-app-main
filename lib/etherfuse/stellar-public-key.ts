/** Cuenta Stellar (StrKey) en formato estándar: G + 55 caracteres base32. */
const STELLAR_ACCOUNT_REGEX = /^G[A-Z2-7]{55}$/

export function normalizeStellarPublicKey(raw: string): string {
  return raw.trim().toUpperCase()
}

export function isValidStellarPublicKey(raw: string): boolean {
  return STELLAR_ACCOUNT_REGEX.test(normalizeStellarPublicKey(raw))
}
