/**
 * Permite el botón «Reiniciar prueba» en /identidad (borra cookie de sesión Etherfuse).
 * En desarrollo está activo por defecto; en prod solo si SEYF_ALLOW_KYC_RESET=true.
 */
export function isKycTestResetEnabled(): boolean {
  if (process.env.SEYF_ALLOW_KYC_RESET === 'true') return true
  return process.env.NODE_ENV === 'development'
}
