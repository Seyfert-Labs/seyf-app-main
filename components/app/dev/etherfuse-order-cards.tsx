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

/** Resumen GET /ramp/order/{id} (OpenAPI Order) + enlace Stellar testnet si hay hash. */
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
        <p className="text-xs font-bold text-foreground">Detalle de orden / transacción</p>
        <p className="text-[10px] text-muted-foreground">
          Fuente:{' '}
          <a
            href="https://docs.etherfuse.com/api-reference/orders/get-order-details"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            GET /ramp/order
          </a>
        </p>
      </div>
      {pollAttempts != null ? (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Lecturas de orden: {pollAttempts}
        </p>
      ) : null}
      {hasSandboxFiat && !d.orderId ? (
        <p className="mt-2 text-xs text-amber-600">
          SPEI simulado en sandbox; no se obtuvo cuerpo de orden por GET /ramp/order (revisa red, API key o
          reintenta el paso 4).
        </p>
      ) : null}
      {hasOfframpTrack && !d.orderId ? (
        <p className="mt-2 text-xs text-amber-600">
          No se obtuvo detalle de orden por GET /ramp/order; revisa la red o el orderId.
        </p>
      ) : null}
      {d.statusPage ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Vista Etherfuse:{' '}
          <a
            href={d.statusPage}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-500"
          >
            Abrir en devnet
          </a>
        </p>
      ) : null}

      <div className="mt-3 space-y-0">
        <DetailRow label="orderId" value={d.orderId} />
        <DetailRow label="Estado" value={d.status} />
        <DetailRow label="Tipo" value={d.orderType} />
        <DetailRow label="Monto MXN" value={d.amountInFiat} />
        <DetailRow label="Tokens" value={d.amountInTokens} />
        <DetailRow label="Tipo de cambio (con fee)" value={d.exchangeRate} />
        <DetailRow label="Mid-market (Etherfuse)" value={d.etherfuseMidMarketRate} />
        <DetailRow
          label="Fee"
          value={d.feeBps != null ? `${d.feeBps} bps` : null}
        />
        <DetailRow label="Fee (MXN)" value={d.feeAmountInFiat} />
        <DetailRow label="Activo origen" value={d.sourceAsset} />
        <DetailRow label="Activo destino" value={d.targetAsset} />
        <DetailRow label="CLABE depósito" value={d.depositClabe} />
        <DetailRow label="walletId" value={d.walletId} />
        <DetailRow label="bankAccountId" value={d.bankAccountId} />
        <DetailRow label="customerId" value={d.customerId} />
        <DetailRow label="Creada" value={d.createdAt} />
        <DetailRow label="Actualizada" value={d.updatedAt} />
        <DetailRow label="Completada" value={d.completedAt} />
      </div>

      {tx ? (
        <p className="mt-3 break-all text-xs leading-relaxed">
          <span className="text-muted-foreground">confirmedTxSignature: </span>
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
                Stellar Expert (testnet)
              </a>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          El hash on-chain aparece cuando el estado avanza (p. ej. tras firmar el burn en offramp o SPEI en
          onramp).
        </p>
      )}
      {orderFetchError ? (
        <p className="mt-2 text-xs text-amber-600">
          No se pudo refrescar GET /ramp/order (reintentos servidor): {orderFetchError}
        </p>
      ) : null}
    </div>
  )
}

/** Tras POST order onramp: CLABE y monto esperado. */
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
      <p className="text-xs font-bold text-foreground">Orden creada (SPEI)</p>
      <div className="mt-3 space-y-0">
        <DetailRow label="orderId" value={dep.orderId} />
        <DetailRow label="CLABE" value={dep.depositClabe} />
        <DetailRow label="Monto MXN a depositar" value={dep.depositAmount} />
      </div>
    </div>
  )
}

