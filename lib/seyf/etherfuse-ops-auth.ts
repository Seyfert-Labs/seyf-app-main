import { AppError } from '@/lib/seyf/api-error'

export function assertEtherfuseOpsAccess(req: Request): void {
  if (process.env.NODE_ENV !== 'production') return
  const expected = process.env.SEYF_ETHERFUSE_OPS_TOKEN?.trim()
  if (!expected) {
    throw new AppError('validation_error', {
      statusCode: 503,
      retryable: false,
      message: 'SEYF_ETHERFUSE_OPS_TOKEN no configurado en producción.',
    })
  }
  const provided = req.headers.get('x-seyf-ops-token')?.trim()
  if (!provided || provided !== expected) {
    throw new AppError('validation_error', {
      statusCode: 403,
      retryable: false,
      message: 'No autorizado para operaciones Etherfuse.',
    })
  }
}
