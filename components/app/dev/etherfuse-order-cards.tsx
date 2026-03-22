'use client'

import { pickOnrampDepositSummary } from '@/lib/etherfuse/order-create-response'
import {
  type RampOrderTransactionDetails,
  pickRampOrderTransactionDetails,
} from '@/lib/etherfuse/orders-api'

export function pickQuoteId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const id = o.quoteId ?? o.quote_id
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (value == null || value === '') return null
  return (
    <div className="grid grid-cols-[minmax(0,8.5rem)_1fr] gap-x-2 gap-y-1 border-b border-border/40 py-1.5 text-xs last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-mono text-[11px] text-foreground">{value}</span>
    </div>
  )
}

/** Resumen de orden (API) + enlace a comprobante público si hay firma. */
export function OrderTransactionDetailCard({ payloadJson }: { payloadJson: string }) {
  let orderDisplay: RampOrderTransactionDetails | null = null
  let orderFetchError: string | null = null
  let orderRaw: unknown = null
  let pollAttempts: number | null = null
  let hasSandboxFiat = false
  let looksMxCetes = false
  let hasOfframpTrack = false
  try {
    const root = JSON.parse(payloadJson) as {
      orderDisplay?: RampOrderTransactionDetails | null
      orderFetchError?: string | null
      order?: unknown
      orderPolled?: unknown
      orderAfterPoll?: unknown
      pollAttempts?: number
      sandboxFiatReceived?: unknown
      ramp?: unknown
      offrampTrack?: boolean
    }
    looksMxCetes = root.ramp !== undefined && root.ramp !== null
    hasOfframpTrack = root.offrampTrack === true
    hasSandboxFiat =
      root.sandboxFiatReceived !== undefined && root.sandboxFiatReceived !== null
    orderFetchError =
      typeof root.orderFetchError === 'string' ? root.orderFetchError : null
    orderRaw = root.orderPolled ?? root.orderAfterPoll ?? root.order ?? null
    pollAttempts = typeof root.pollAttempts === 'number' ? root.pollAttempts : null
    orderDisplay =
      root.orderDisplay ??
      (orderRaw ? pickRampOrderTransactionDetails(orderRaw) : null)
  } catch {
    return null
  }
  if (
    !orderDisplay?.orderId &&
    !orderFetchError &&
    !orderRaw &&
    !hasSandboxFiat &&
    !looksMxCetes &&
    !hasOfframpTrack
  ) {
    return null
  }

  const d = orderDisplay ?? pickRampOrderTransactionDetails(orderRaw)
  const tx = d.confirmedTxSignature?.trim()
  const stellarTxUrl = tx
    ? `https://stellar.expert/explorer/testnet/tx/${encodeURIComponent(tx)}`
    : null

  return (
    <div className="rounded-[1rem] border border-border bg-card/80 p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-bold text-foreground">Resumen de la operación</p>
        <p className="text-[10px] text-muted-foreground">
          <a
            href="https://docs.etherfuse.com/api-reference/orders/get-order-details"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Documentación
          </a>
        </p>
      </div>
      {pollAttempts != null ? (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Consultas realizadas: {pollAttempts}
        </p>
      ) : null}
      {hasSandboxFiat && !d.orderId ? (
        <p className="mt-2 text-xs text-amber-600">
          Simulación de pago lista; no pudimos cargar el detalle de la orden. Revisa conexión o vuelve a
          intentar.
        </p>
      ) : null}
      {hasOfframpTrack && !d.orderId ? (
        <p className="mt-2 text-xs text-amber-600">
          No pudimos cargar el detalle. Revisa la conexión o el folio de la operación.
        </p>
      ) : null}
      {d.statusPage ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Seguimiento:{' '}
          <a
            href={d.statusPage}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-500"
          >
            Abrir en Etherfuse
          </a>
        </p>
      ) : null}

      <div className="mt-3 space-y-0">
        <DetailRow label="Folio" value={d.orderId} />
        <DetailRow label="Estado" value={d.status} />
        <DetailRow label="Tipo" value={d.orderType} />
        <DetailRow label="Pesos (MXN)" value={d.amountInFiat} />
        <DetailRow label="Unidades" value={d.amountInTokens} />
        <DetailRow label="Cambio (incluye comisión)" value={d.exchangeRate} />
        <DetailRow label="Referencia de mercado" value={d.etherfuseMidMarketRate} />
        <DetailRow
          label="Comisión"
          value={
            d.feeBps != null
              ? `${(d.feeBps / 100).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
              : null
          }
        />
        <DetailRow label="Comisión en pesos" value={d.feeAmountInFiat} />
        <DetailRow label="Origen" value={d.sourceAsset} />
        <DetailRow label="Destino" value={d.targetAsset} />
        <DetailRow label="CLABE (depósito)" value={d.depositClabe} />
        <DetailRow label="Cuenta interna" value={d.walletId} />
        <DetailRow label="Cuenta bancaria" value={d.bankAccountId} />
        <DetailRow label="Cliente" value={d.customerId} />
        <DetailRow label="Creada" value={d.createdAt} />
        <DetailRow label="Actualizada" value={d.updatedAt} />
        <DetailRow label="Completada" value={d.completedAt} />
      </div>

      {tx ? (
        <p className="mt-3 break-all text-xs leading-relaxed">
          <span className="text-muted-foreground">Referencia: </span>
          <span className="font-mono text-foreground">{tx}</span>
          {stellarTxUrl ? (
            <>
              {' '}
              <a
                href={stellarTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 underline underline-offset-2 hover:text-emerald-500"
              >
                Ver comprobante público
              </a>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          El comprobante público aparece cuando la operación avanza (pago o autorización completados).
        </p>
      )}
      {orderFetchError ? (
        <p className="mt-2 text-xs text-amber-600">
          No se pudo actualizar el detalle: {orderFetchError}
        </p>
      ) : null}
    </div>
  )
}

/** Tras crear orden onramp: CLABE e importe esperado. */
export function OrderCreatedDepositCard({ orderApiJson }: { orderApiJson: string }) {
  let dep: ReturnType<typeof pickOnrampDepositSummary> | null = null
  try {
    const root = JSON.parse(orderApiJson) as { order?: unknown }
    if (!root.order) return null
    dep = pickOnrampDepositSummary(root.order)
  } catch {
    return null
  }
  if (!dep?.orderId && !dep?.depositClabe) return null
  return (
    <div className="rounded-[1rem] border border-border bg-card/80 p-4 text-sm">
      <p className="text-xs font-bold text-foreground">Listo para transferir</p>
      <div className="mt-3 space-y-0">
        <DetailRow label="Folio" value={dep.orderId} />
        <DetailRow label="CLABE" value={dep.depositClabe} />
        <DetailRow label="Importe exacto (MXN)" value={dep.depositAmount} />
      </div>
    </div>
  )
}

