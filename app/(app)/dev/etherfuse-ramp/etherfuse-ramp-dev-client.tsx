'use client'

import { useCallback, useMemo, useState } from 'react'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { OrderTransactionDetailCard, pickQuoteId } from '@/components/app/dev/etherfuse-order-cards'
import { SpeiPaymentCard } from '@/components/app/dev/spei-payment-card'
import { extractOrderIdFromCreateOrderResponse } from '@/lib/etherfuse/order-create-response'
import {
  speiDetailsFromOnrampOrderApiJson,
  type SpeiTransferDetails,
} from '@/lib/etherfuse/spei-transfer-details'
import {
  extractConfirmedTxSignatureFromOnrampPanelJson,
  pickRampOrderTransactionDetails,
} from '@/lib/etherfuse/orders-api'

export default function EtherfuseRampDevClient() {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [targetOverride, setTargetOverride] = useState('')
  const [sourceAmount, setSourceAmount] = useState('500')
  const [orderJson, setOrderJson] = useState<string>('')
  const [fiatJson, setFiatJson] = useState<string>('')
  const [speiDetails, setSpeiDetails] = useState<SpeiTransferDetails | null>(null)
  const [pendingManualOrderJson, setPendingManualOrderJson] = useState<string | null>(null)

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setErr(null)
    setBusy(label)
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(null)
    }
  }, [])

  const performQuote = useCallback(async (): Promise<string> => {
    const body: { sourceAmount: string; targetAsset?: string } = {
      sourceAmount: sourceAmount.trim() || '500',
    }
    const t = targetOverride.trim()
    if (t) body.targetAsset = t
    const res = await fetch('/api/seyf/etherfuse/quote/onramp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg =
        typeof data.error === 'string'
          ? data.error
          : `${res.status} ${res.statusText}${Object.keys(data).length ? ` — ${JSON.stringify(data)}` : ''}`
      throw new Error(msg)
    }
    return JSON.stringify(data, null, 2)
  }, [sourceAmount, targetOverride])

  const performOrder = useCallback(async (qJson: string): Promise<string> => {
    let parsed: unknown
    try {
      parsed = JSON.parse(qJson || '{}')
    } catch {
      throw new Error('Cotización JSON inválida')
    }
    const inner =
      parsed && typeof parsed === 'object' && 'quote' in (parsed as object)
        ? (parsed as { quote: unknown }).quote
        : parsed
    const quoteId = pickQuoteId(inner)
    if (!quoteId) {
      throw new Error('No encuentro quoteId en la cotización (~2 min de validez)')
    }
    const res = await fetch('/api/seyf/etherfuse/order/onramp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : res.statusText)
    }
    return JSON.stringify(data, null, 2)
  }, [])

  const performFiatSimulation = useCallback(async (oJson: string): Promise<string> => {
    let parsed: unknown
    try {
      parsed = JSON.parse(oJson || '{}')
    } catch {
      throw new Error('Respuesta de orden JSON inválida')
    }
    const orderId = extractOrderIdFromCreateOrderResponse(parsed)
    if (!orderId) {
      throw new Error(
        'No encuentro orderId (revisa raíz o onramp/on_ramp en el JSON de la orden).',
      )
    }
    const res = await fetch('/api/seyf/etherfuse/sandbox/fiat-received', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : res.statusText)
    }

    let orderPolled: unknown = null
    let pollAttempts = 0
    for (let i = 0; i < 12; i++) {
      pollAttempts = i + 1
      if (i > 0) await new Promise((r) => setTimeout(r, 1500))
      const gr = await fetch(`/api/seyf/etherfuse/prueba/order/${encodeURIComponent(orderId)}`)
      if (!gr.ok) continue
      const gj = (await gr.json().catch(() => ({}))) as { order?: unknown }
      orderPolled = gj.order ?? null
      const det = pickRampOrderTransactionDetails(orderPolled)
      const st = (det.status ?? '').toLowerCase()
      if (
        (det.confirmedTxSignature && det.confirmedTxSignature.length > 0) ||
        st === 'completed' ||
        st === 'funded' ||
        st === 'failed' ||
        st === 'canceled'
      ) {
        break
      }
    }

    return JSON.stringify(
      {
        sandboxFiatReceived: data,
        orderPolled,
        orderDisplay: pickRampOrderTransactionDetails(orderPolled),
        pollAttempts,
      },
      null,
      2,
    )
  }, [])

  const openManualSpeiReview = () =>
    run('spei-manual-prepare', async () => {
      const q = await performQuote()
      const o = await performOrder(q)
      const assetLabel =
        targetOverride.trim()
          ? targetOverride.trim().split(':')[0]?.trim() || 'CETES'
          : 'CETES'
      const details = speiDetailsFromOnrampOrderApiJson(o, assetLabel, 'Etherfuse')
      if (!details) {
        throw new Error(
          'No aparecen datos de transferencia (CLABE e importe). Revisa la respuesta o inténtalo de nuevo.',
        )
      }
      setOrderJson(o)
      setFiatJson('')
      setPendingManualOrderJson(o)
      setSpeiDetails(details)
    })

  const confirmSpeiPayment = useCallback(async () => {
    if (!speiDetails || !pendingManualOrderJson) return
    await run('spei-manual-confirm', async () => {
      const f = await performFiatSimulation(pendingManualOrderJson)
      setOrderJson(pendingManualOrderJson)
      setFiatJson(f)
      setPendingManualOrderJson(null)
      setSpeiDetails(null)
    })
  }, [speiDetails, pendingManualOrderJson, performFiatSimulation, run])

  const speiConfirmBusy = busy === 'spei-manual-confirm'

  const onrampTxSignature = useMemo(
    () => extractConfirmedTxSignatureFromOnrampPanelJson(fiatJson),
    [fiatJson],
  )

  const stellarTxExplorerUrl = useMemo(() => {
    if (!onrampTxSignature) return null
    const isMain =
      typeof process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'string' &&
      ['public', 'mainnet'].includes(
        process.env.NEXT_PUBLIC_STELLAR_NETWORK.toLowerCase(),
      )
    const base = isMain
      ? 'https://stellar.expert/explorer/public/tx/'
      : 'https://stellar.expert/explorer/testnet/tx/'
    return `${base}${encodeURIComponent(onrampTxSignature)}`
  }, [onrampTxSignature])

  return (
    <AppPageBody className="space-y-6 pt-4">
      <AppBackLink href="/dashboard" />

      <h1 className="text-xl font-bold text-foreground">Añadir fondos</h1>

      <SpeiPaymentCard
        details={speiDetails}
        concept={speiDetails?.orderId ?? null}
      />
      {speiDetails && pendingManualOrderJson ? (
        <Button
          type="button"
          className="w-full"
          disabled={!!busy}
          onClick={() => void confirmSpeiPayment()}
        >
          {speiConfirmBusy ? (
            <>
              <Spinner className="size-4 text-background" />
              Procesando…
            </>
          ) : (
            'Ya hice la transferencia (prueba)'
          )}
        </Button>
      ) : null}

      <section className="space-y-4 rounded-[1.5rem] border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-foreground">Monto en pesos</h2>
        <Input
          id="manual-amount"
          inputMode="decimal"
          value={sourceAmount}
          onChange={(e) => setSourceAmount(e.target.value)}
          placeholder="Monto MXN"
          className="h-12 rounded-xl border-border bg-background px-4 tabular-nums"
          aria-label="Monto MXN"
        />
        <Input
          id="manual-asset"
          value={targetOverride}
          onChange={(e) => setTargetOverride(e.target.value)}
          placeholder="Opcional · solo uso avanzado"
          className="h-12 rounded-xl border-border bg-background px-4 font-mono text-xs"
          aria-label="Opcional avanzado"
        />
        <Button
          type="button"
          className="w-full"
          disabled={!!busy}
          onClick={() => void openManualSpeiReview()}
        >
          {busy === 'spei-manual-prepare' ? (
            <>
              <Spinner className="size-4 text-background" />
              Cargando…
            </>
          ) : (
            'Continuar'
          )}
        </Button>
      </section>

      {err && (
        <p className="mt-6 rounded-[1rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {err}
        </p>
      )}

      {onrampTxSignature && stellarTxExplorerUrl ? (
        <div className="rounded-[1.5rem] border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground">Comprobante</p>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{onrampTxSignature}</p>
          <a
            href={stellarTxExplorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-foreground underline-offset-2 hover:underline"
          >
            Ver comprobante
          </a>
        </div>
      ) : null}

      {fiatJson ? (
        <div className="space-y-4">
          <OrderTransactionDetailCard payloadJson={fiatJson} />
        </div>
      ) : null}
    </AppPageBody>
  )
}
