import {
  etherfuseFetch,
  etherfuseReadBody,
  extractEtherfuseErrorMessage,
} from './client.ts'

export type EtherfuseCetesRateSnapshot = {
  /** e.g. 28 */
  tenorDays: 28
  /** Annual nominal rate as percent (e.g. 9.8). */
  annualRatePercent: number
  fetchedAt: string
  raw: unknown
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number.parseFloat(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function findFirstRatePercent(json: unknown): number | null {
  if (!json || typeof json !== 'object') return null
  const o = json as Record<string, unknown>

  // Common candidates across APIs.
  for (const key of [
    'cetes28AnnualRatePercent',
    'cetes_28_annual_rate_percent',
    'cetes28Rate',
    'cetes_28_rate',
    'rate',
    'annualRate',
    'annual_rate',
    'annualRatePercent',
    'annual_rate_percent',
  ]) {
    const n = parseNumber(o[key])
    if (n != null) return n
  }

  // Look into a nested object if present.
  for (const nestedKey of ['data', 'result', 'snapshot']) {
    const nested = o[nestedKey]
    if (nested && typeof nested === 'object') {
      const n = findFirstRatePercent(nested)
      if (n != null) return n
    }
  }

  return null
}

/**
 * Fetches CETES 28d reference rate from Etherfuse.
 *
 * NOTE: endpoint shape may vary; this function is defensive and stores `raw`.
 * If parsing fails, it throws with a helpful message.
 */
export async function fetchEtherfuseCetes28DayRateSnapshot(): Promise<EtherfuseCetesRateSnapshot> {
  const res = await etherfuseFetch('/rates/cetes?tenorDays=28', { method: 'GET' })
  const { json, text } = await etherfuseReadBody(res)
  if (!res.ok) {
    const msg = extractEtherfuseErrorMessage(json, text, 400)
    throw new Error(`Etherfuse CETES rate (${res.status}): ${msg}`)
  }

  const rate = findFirstRatePercent(json)
  if (rate == null) {
    throw new Error(
      `Etherfuse CETES rate: respuesta sin tasa reconocible: ${text.slice(0, 400)}`,
    )
  }

  return {
    tenorDays: 28,
    annualRatePercent: rate,
    fetchedAt: new Date().toISOString(),
    raw: json,
  }
}
