import { getEtherfuseConfig } from '@/lib/etherfuse/config'

/**
 * Bloque «Herramientas de desarrollo» en dashboard (onramp/offramp en `/anadir` y `/retirar`; `/dev/etherfuse-*` redirigen). PoC ledger
 * (`/dev/poc-omnibus`) y POST sandbox fiat_received.
 * En desarrollo activo por defecto; en otros entornos: SEYF_ETHERFUSE_DEV_PANEL=true.
 */
export function isEtherfuseDevPanelEnabled(): boolean {
  if (process.env.SEYF_ETHERFUSE_DEV_PANEL === 'true') return true
  return process.env.NODE_ENV === 'development'
}

/**
 * API host de Etherfuse tipo sandbox (p. ej. `api.sand.etherfuse.com`).
 * En Vercel, NODE_ENV es `production` aunque apuntes a sandbox: hace falta permitir
 * el proxy `POST /ramp/order/fiat_received` sin abrir todo el dev panel.
 */
export function isEtherfuseSandboxApiHost(): boolean {
  if (process.env.SEYF_ALLOW_SANDBOX_FIAT_SIMULATION === 'true') return true
  try {
    const { baseUrl } = getEtherfuseConfig()
    const host = new URL(baseUrl).hostname.toLowerCase()
    return host === 'api.sand.etherfuse.com' || host.endsWith('.sand.etherfuse.com')
  } catch {
    return false
  }
}

/** Proxy interno hacia el sandbox `fiat_received` de Etherfuse (botón «Ya hice la transferencia» en /anadir). */
export function isSandboxFiatReceivedProxyEnabled(): boolean {
  return isEtherfuseDevPanelEnabled() || isEtherfuseSandboxApiHost()
}
