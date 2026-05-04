import { NextResponse } from 'next/server'
import { z } from 'zod'
import { toErrorResponse, AppError } from '@/lib/seyf/api-error'
import { assertEtherfuseOpsAccess } from '@/lib/seyf/etherfuse-ops-auth'
import { computeEtherfuseReadiness } from '@/lib/seyf/etherfuse-readiness'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const bodySchema = z.object({
  customerId: z.string().uuid(),
  publicKey: z.string().trim().min(1),
  bankAccountId: z.string().uuid(),
})

export async function POST(req: Request) {
  try {
    assertEtherfuseOpsAccess(req)
    const raw = (await req.json().catch(() => null)) as unknown
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      throw new AppError('validation_error', {
        statusCode: 400,
        retryable: false,
        message: `Payload inválido para diagnóstico: ${parsed.error.message}`,
      })
    }
    const readiness = await computeEtherfuseReadiness({
      customerId: parsed.data.customerId,
      publicKey: parsed.data.publicKey,
      bankAccountId: parsed.data.bankAccountId,
      source: 'cookie',
    })
    return NextResponse.json(
      {
        ok: true,
        readiness,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return toErrorResponse(e, 'etherfuse/ops/diagnose')
  }
}
