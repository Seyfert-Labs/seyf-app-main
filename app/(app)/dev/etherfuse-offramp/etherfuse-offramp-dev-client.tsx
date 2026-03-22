'use client'

import { useCallback, useMemo, useState } from 'react'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { OfframpActionCard } from '@/components/app/dev/offramp-action-card'
import { OrderTransactionDetailCard, pickQuoteId } from '@/components/app/dev/etherfuse-order-cards'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  extractOrderIdFromCreateOrderResponse,
  pickOfframpOrderSummary,
} from '@/lib/etherfuse/order-create-response'
import {
  extractConfirmedTxSignatureFromOnrampPanelJson,
  pickRampOrderTransactionDetails,
} from '@/lib/etherfuse/orders-api'

export default function EtherfuseOfframpDevClient() {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [sourceAmountTokens, setSourceAmountTokens] = useState('10')
  const [sourceAssetOverride, setSourceAssetOverride] = useState('')
  const [orderJson, setOrderJson] = useState<string>('')
  const [useAnchor, setUseAnchor] = useState(false)
  const [trackJson, setTrackJson] = useState<string>('')

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
    const body: { sourceAmount: string; sourceAsset?: string } = {
      sourceAmount: sourceAmountTokens.trim().replace(',', '.') || '1',
    }
    const t = sourceAssetOverride.trim()
    if (t) body.sourceAsset = t
    const res = await fetch('/api/seyf/etherfuse/quote/offramp', {
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
  }, [sourceAmountTokens, sourceAssetOverride])

  const performOrder = useCallback(
    async (qJson: string): Promise<string> => {
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
      const res = await fetch('/api/seyf/etherfuse/order/offramp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, useAnchor }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : res.statusText)
      }
      return JSON.stringify(data, null, 2)
    },
    [useAnchor],
  )

  const continueOfframp = useCallback(() => {
    void run('offramp-flow', async () => {
      const q = await performQuote()
      const o = await performOrder(q)
      setOrderJson(o)
      setTrackJson('')
    })
  }, [performOrder, performQuote, run])

  const trackOrder = useCallback(() => {
    void run('track', async () => {
      let parsed: unknown
      try {
        parsed = JSON.parse(orderJson || '{}')
      } catch {
        throw new Error('Primero crea una orden offramp válida')
      }
      const orderId = extractOrderIdFromCreateOrderResponse(parsed)
      if (!orderId) {
        throw new Error('No encuentro orderId en la respuesta de orden')
      }

      let orderPolled: unknown = null
      let pollAttempts = 0
      for (let i = 0; i < 12; i++) {
        pollAttempts = i + 1
        if (i > 0) await new Promise((r) => setTimeout(r, 1500))
        const gr = await fetch(
          `/api/seyf/etherfuse/prueba/order/${encodeURIComponent(orderId)}`,
        )
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

      setTrackJson(
        JSON.stringify(
          {
            orderPolled,
            orderDisplay: pickRampOrderTransactionDetails(orderPolled),
            pollAttempts,
            offrampTrack: true,
          },
          null,
          2,
        ),
      )
    })
  }, [orderJson, run])

  const offrampSummary = useMemo(() => {
    if (!orderJson.trim()) return null
    try {
      const root = JSON.parse(orderJson) as { order?: unknown }
      if (!root.order) return null
      return pickOfframpOrderSummary(root.order)
    } catch {
      return null
    }
  }, [orderJson])

  const offrampTxSignature = useMemo(
    () => extractConfirmedTxSignatureFromOnrampPanelJson(trackJson),
    [trackJson],
  )

  const stellarTxExplorerUrl = useMemo(() => {
    if (!offrampTxSignature) return null
    const isMain =
      typeof process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'string' &&
      ['public', 'mainnet'].includes(
        process.env.NEXT_PUBLIC_STELLAR_NETWORK.toLowerCase(),
      )
    const base = isMain
      ? 'https://stellar.expert/explorer/public/tx/'
      : 'https://stellar.expert/explorer/testnet/tx/'
    return `${base}${encodeURIComponent(offrampTxSignature)}`
  }, [offrampTxSignature])

  const continueBusy = busy === 'offramp-flow'
  const trackBusy = busy === 'track'

  return (
    <AppPageBody className="space-y-6 pt-4">
      <AppBackLink href="/dashboard" />

      <h1 className="text-xl font-bold text-foreground">Retirar fondos</h1>

      <OfframpActionCard summary={offrampSummary} />

      {orderJson ? (
        <Button
          type="button"
          className="w-full"
          variant="outline"
          disabled={!!busy}
          onClick={() => void trackOrder()}
        >
          {trackBusy ? (
            <>
              <Spinner className="size-4" />
              Actualizando…
            </>
          ) : (
            'Actualizar estado'
          )}
        </Button>
      ) : null}

      <section className="space-y-4 rounded-[1.5rem] border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-foreground">Cuánto retiras</h2>
        <Input
          inputMode="decimal"
          value={sourceAmountTokens}
          onChange={(e) => setSourceAmountTokens(e.target.value)}
          placeholder="Monto o unidades"
          className="h-12 rounded-xl border-border bg-background px-4 tabular-nums"
          aria-label="Monto a retirar"
        />
        <Input
          value={sourceAssetOverride}
          onChange={(e) => setSourceAssetOverride(e.target.value)}
          placeholder="Opcional · solo uso avanzado"
          className="h-12 rounded-xl border-border bg-background px-4 font-mono text-xs"
          aria-label="Opcional avanzado"
        />
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
          <Checkbox
            id="use-anchor"
            checked={useAnchor}
            onCheckedChange={(v) => setUseAnchor(v === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="use-anchor"
            className="cursor-pointer text-xs leading-relaxed font-normal text-muted-foreground"
          >
            Modo alternativo de retiro (solo si te lo indican).{' '}
            <a
              href="https://docs.etherfuse.com/guides/testing-offramps#anchor-mode-stellar-only"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 underline underline-offset-2 hover:text-violet-500"
            >
              Más info
            </a>
          </Label>
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={!!busy}
          onClick={() => void continueOfframp()}
        >
          {continueBusy ? (
            <>
              <Spinner className="size-4 text-background" />
              Procesando…
            </>
          ) : (
            'Continuar'
          )}
        </Button>
      </section>

      {err ? (
        <p className="rounded-[1rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {err}
        </p>
      ) : null}

      {offrampTxSignature && stellarTxExplorerUrl ? (
        <div className="rounded-[1.5rem] border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground">Comprobante</p>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{offrampTxSignature}</p>
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

      {trackJson ? (
        <div className="space-y-4">
          <OrderTransactionDetailCard payloadJson={trackJson} />
        </div>
      ) : null}
    </AppPageBody>
  )
}
