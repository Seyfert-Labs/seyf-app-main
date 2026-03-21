/**
 * Panel de prueba rampa Etherfuse (`/dev/etherfuse-ramp`) y POST sandbox fiat_received.
 * En desarrollo activo por defecto; en otros entornos: SEYF_ETHERFUSE_DEV_PANEL=true.
 */
export function isEtherfuseDevPanelEnabled(): boolean {
  if (process.env.SEYF_ETHERFUSE_DEV_PANEL === 'true') return true
  return process.env.NODE_ENV === 'development'
}
