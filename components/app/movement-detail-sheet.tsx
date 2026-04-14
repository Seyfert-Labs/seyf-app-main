'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { UserMovement } from '@/lib/seyf/user-movements-types'
import { formatMovementFechaHora } from '@/lib/seyf/user-movements-types'
import { stellarTxExplorerUrl } from '@/lib/etherfuse/stellar-tx-url'
import { getSeyfErrorDisplayMessage } from '@/lib/seyf/read-client-api-error'

function txSigFromOrderPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>
  const order = root.order
  if (!order || typeof order !== 'object') return null
  const o = order as Record<string, unknown>
  const s = o.confirmedTxSignature ?? o.confirmed_tx_signature
  return typeof s === 'string' && s.trim() ? s.trim() : null
}

function formatMXNMovement(amount: number) {
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(abs)
  return amount < 0 ? `− ${formatted}` : `+ ${formatted}`
}

function formatMovementAmountLabel(movement: UserMovement): string {
  const code = movement.chainAssetCode?.trim()
  if (code) {
    const abs = Math.abs(movement.monto)
    const n = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 7 }).format(abs)
    return movement.monto < 0 ? `− ${n} ${code}` : `+ ${n} ${code}`
  }
  return formatMXNMovement(movement.monto)
}

export function MovementDetailSheet({
  movement,
  onClose,
  icon,
}: {
  movement: UserMovement | null
  onClose: () => void
  icon: ReactNode
}) {
  const [resolvedSig, setResolvedSig] = useState<string | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  useEffect(() => {
    setResolvedSig(null)
    setTxError(null)
    setTxLoading(false)
    if (!movement?.orderId) return
    if (movement.stellarTxSignature) return

    let cancelled = false
    setTxLoading(true)
    void fetch(`/api/seyf/etherfuse/prueba/order/${encodeURIComponent(movement.orderId)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          if (!cancelled) {
            setTxError(getSeyfErrorDisplayMessage(data, 'No se pudo cargar el comprobante.'))
          }
          return null
        }
        return data
      })
      .then((data) => {
        if (cancelled || !data) return
        const sig = txSigFromOrderPayload(data)
        if (sig) setResolvedSig(sig)
      })
      .catch(() => {
        if (!cancelled) setTxError('No se pudo cargar el comprobante.')
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [movement?.orderId, movement?.stellarTxSignature])

  if (!movement) return null

  const sig = movement.stellarTxSignature ?? resolvedSig
  const stellarUrl = stellarTxExplorerUrl(
    sig,
    movement.source === 'stellar' ? movement.stellarNetwork ?? undefined : undefined,
  )
  const { fecha, hora } = formatMovementFechaHora(movement.createdAt)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-t-[1.75rem] border border-border border-b-0 bg-popover p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-detail-title"
      >
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground">
            {icon}
          </div>
          <div className="min-w-0">
            <p id="movement-detail-title" className="text-lg font-black text-foreground">
              {movement.titulo}
            </p>
            <p className="text-sm text-muted-foreground">
              {fecha} a las {hora}
            </p>
          </div>
        </div>
        <div className="mb-6 space-y-3">
          <DetailRow label="Monto" value={formatMovementAmountLabel(movement)} />
          <DetailRow
            label="Estado"
            value={movement.estado.charAt(0).toUpperCase() + movement.estado.slice(1)}
          />
          <DetailRow label="Notas" value={movement.detalle} />
          {movement.orderId ? (
            <DetailRow label="Folio" value={movement.orderId} mono />
          ) : null}
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-sm font-medium text-foreground">Comprobante público</p>
            {txLoading ? (
              <p className="text-xs text-muted-foreground">Obteniendo enlace…</p>
            ) : null}
            {txError ? <p className="text-xs text-amber-600">{txError}</p> : null}
            {stellarUrl ? (
              <a
                href={stellarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-full bg-foreground py-3 text-sm font-bold text-background hover:bg-foreground/90"
              >
                Ver comprobante
              </a>
            ) : !txLoading && movement.source === 'etherfuse' ? (
              <p className="text-xs text-muted-foreground">
                El comprobante aparece cuando la operación queda confirmada.
              </p>
            ) : !txLoading && movement.source === 'ledger' ? (
              <p className="text-xs text-muted-foreground">
                En pruebas internas el comprobante solo existe si se guardó al crear el movimiento.
              </p>
            ) : !txLoading && movement.source === 'stellar' && !stellarUrl ? (
              <p className="text-xs text-muted-foreground">No hay hash de transacción para enlazar.</p>
            ) : null}
            {sig ? (
              <p className="break-all font-mono text-[10px] text-muted-foreground">{sig}</p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-12 w-full rounded-full bg-secondary text-sm font-bold text-foreground ring-1 ring-border hover:bg-secondary/80"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="shrink-0 text-sm text-muted-foreground">{label}</p>
      <p
        className={`text-right text-sm font-semibold text-foreground ${mono ? 'break-all font-mono text-xs' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}
