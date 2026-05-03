import { isPublicStellarTestnet } from '@/lib/seyf/stellar-wallet-network'

/**
 * Alta automática de cuenta bancaria en sandbox con CLABE sintética (sin pedirla al usuario).
 * Activo solo en testnet + SEYF_TESTNET_SYNTHETIC_CLABE (18 dígitos).
 * Desactivar: SEYF_TESTNET_AUTOFILL_BANK_ACCOUNT=false
 */
export function isEtherfuseTestnetBankAutofillActive(): boolean {
  if (!isPublicStellarTestnet()) return false
  if (process.env.SEYF_TESTNET_AUTOFILL_BANK_ACCOUNT === 'false') return false
  const c = process.env.SEYF_TESTNET_SYNTHETIC_CLABE?.trim() ?? ''
  return /^\d{18}$/.test(c)
}

export function getTestnetSyntheticClabe(): string {
  const c = process.env.SEYF_TESTNET_SYNTHETIC_CLABE?.trim() ?? ''
  if (!/^\d{18}$/.test(c)) {
    throw new Error('SEYF_TESTNET_SYNTHETIC_CLABE debe tener exactamente 18 dígitos.')
  }
  return c
}
