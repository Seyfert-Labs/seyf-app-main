/**
 * Permite «Reiniciar verificación» en /dev (borra cookie de sesión Etherfuse en el navegador).
 * En desarrollo está activo por defecto; en prod solo si SEYF_ALLOW_KYC_RESET=true.
 */
export function isKycTestResetEnabled(): boolean {
  if (process.env.SEYF_ALLOW_KYC_RESET === 'true') return true
  return process.env.NODE_ENV === 'development'
}
