import { NextResponse } from 'next/server'
import { z } from 'zod'
import { etherfuseFetch, etherfuseReadBody } from '@/lib/etherfuse/client'
import {
  seyfApiError,
  SEYF_VALIDATION_MESSAGE_ES,
} from '@/lib/seyf/api-error'
import { isEtherfuseDevPanelEnabled } from '@/lib/seyf/etherfuse-dev-panel'

const bodySchema = z.object({
  orderId: z.string().uuid(),
})

/**
 * POST /api/seyf/etherfuse/sandbox/fiat-received
 * Solo con isEtherfuseDevPanelEnabled(). Simula depósito MXN en sandbox.
 * @see https://docs.etherfuse.com/sandbox-api/fiat-received
 */
export async function POST(req: Request) {
  if (!isEtherfuseDevPanelEnabled()) {
    return seyfApiError(404, 'not_found')
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return seyfApiError(400, 'bad_json')
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return seyfApiError(400, 'validation_error', { message_es: SEYF_VALIDATION_MESSAGE_ES })
  }

  const res = await etherfuseFetch('/ramp/order/fiat_received', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: parsed.data.orderId }),
  })
  const { json: out, text } = await etherfuseReadBody(res)
  if (!res.ok) {
    console.error('[sandbox/fiat-received]', res.status, text.slice(0, 800), out)
    const st = res.status >= 400 && res.status < 600 ? res.status : 502
    if (st === 404) return seyfApiError(404, 'not_found')
    if (st >= 500) {
      return seyfApiError(502, 'provider_unavailable', { retryable: true })
    }
    return seyfApiError(400, 'validation_error', { message_es: SEYF_VALIDATION_MESSAGE_ES })
  }
  return NextResponse.json({ ok: true as const, result: out })
}
