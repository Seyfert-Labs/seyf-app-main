import { NextResponse } from 'next/server'
import { z } from 'zod'
import { etherfuseFetch, etherfuseReadBody } from '@/lib/etherfuse/client'
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
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const res = await etherfuseFetch('/ramp/order/fiat_received', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: parsed.data.orderId }),
  })
  const { json: out, text } = await etherfuseReadBody(res)
  if (!res.ok) {
    console.error("[seyf/sandbox/fiat-received] provider error:", text.slice(0, 500), out)
    return NextResponse.json(
      { error: "Sandbox provider error" },
      { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
    )
  }
  return NextResponse.json({ ok: true as const, result: out })
}
