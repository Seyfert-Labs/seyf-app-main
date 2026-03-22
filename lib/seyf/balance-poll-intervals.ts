/** Intervalos de sondeo para saldos y movimientos (ms). */
export const DASHBOARD_POLL_MS = 4_000
/** Mismo intervalo que el dashboard para que el historial no quede desactualizado. */
export const HISTORIAL_POLL_MS = DASHBOARD_POLL_MS
export const ACCESLY_BALANCE_POLL_MS = 8_000

/** Refrescos extra tras montar (p. ej. saldo que tarda en propagarse en API). */
export const DASHBOARD_POLL_EXTRA_DELAYS_MS = [2_000, 5_000, 12_000] as const
/** Igual que dashboard: mismos refuerzos al entrar a /historial. */
export const HISTORIAL_POLL_EXTRA_DELAYS_MS = DASHBOARD_POLL_EXTRA_DELAYS_MS
export const ACCESLY_BALANCE_EXTRA_DELAYS_MS = [2_000, 6_000] as const
