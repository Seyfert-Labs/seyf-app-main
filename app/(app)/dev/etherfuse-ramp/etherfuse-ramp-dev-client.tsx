'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  OrderCreatedDepositCard,
  OrderTransactionDetailCard,
  pickQuoteId,
} from '@/components/app/dev/etherfuse-order-cards'
import { SpeiTransferReviewDialog } from '@/components/app/dev/spei-transfer-review-dialog'
import { EtherfuseRampWalletBanner } from '@/components/app/dev/etherfuse-ramp-wallet-banner'
import { extractOrderIdFromCreateOrderResponse } from '@/lib/etherfuse/order-create-response'
import {
  speiDetailsFromMxnCetesApiResponse,
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
  const [assetsJson, setAssetsJson] = useState<string>('')
  const [targetOverride, setTargetOverride] = useState('')
  const [sourceAmount, setSourceAmount] = useState('500')
  const [quoteJson, setQuoteJson] = useState<string>('')
  const [orderJson, setOrderJson] = useState<string>('')
  const [fiatJson, setFiatJson] = useState<string>('')
  const [cetesAmount, setCetesAmount] = useState('500')
  /** false = misma prioridad que GET contexto (cookie /identidad primero); true = solo ETHERFUSE_MVP_* */
  const [cetesUseMvp, setCetesUseMvp] = useState(false)
  const [cetesJson, setCetesJson] = useState<string>('')
  const [speiDialogOpen, setSpeiDialogOpen] = useState(false)
  const [speiDetails, setSpeiDetails] = useState<SpeiTransferDetails | null>(null)
  const [speiFlow, setSpeiFlow] = useState<'cetes' | 'manual' | null>(null)
  const [pendingCetesPrepareJson, setPendingCetesPrepareJson] = useState<string | null>(null)
  const [pendingManualOrderJson, setPendingManualOrderJson] = useState<string | null>(null)
  const [pendingManualQuoteJson, setPendingManualQuoteJson] = useState<string | null>(null)

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
        targetOverride.trim() ? targetOverride.trim().split(':')[0]?.trim() || 'activo' : 'activo'
      const details = speiDetailsFromOnrampOrderApiJson(o, assetLabel, 'Etherfuse')
      if (!details) {
        throw new Error(
          'La orden no incluye CLABE / monto SPEI (revisa la respuesta POST order onramp).',
        )
      }
      setQuoteJson(q)
      setOrderJson(o)
      setFiatJson('')
      setPendingManualQuoteJson(q)
      setPendingManualOrderJson(o)
      setSpeiFlow('manual')
      setSpeiDetails(details)
      setSpeiDialogOpen(true)
      setAssetsJson('')
      setCetesJson('')
    })

  const confirmSpeiDialog = useCallback(async () => {
    if (!speiDetails) return
    if (speiFlow === 'cetes' && pendingCetesPrepareJson) {
      await run('spei-cetes-confirm', async () => {
        const res = await fetch('/api/seyf/etherfuse/prueba/mxn-cetes/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: speiDetails.orderId }),
        })
        const conf = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            typeof conf.error === 'string' ? conf.error : res.statusText,
          )
        }
        let prepared: Record<string, unknown>
        try {
          prepared = JSON.parse(pendingCetesPrepareJson) as Record<string, unknown>
        } catch {
          throw new Error('Estado de preparación inválido')
        }
        const merged = {
          ...prepared,
          ...conf,
          prepareOnly: false,
        }
        setCetesJson(JSON.stringify(merged, null, 2))
        setAssetsJson('')
        setQuoteJson('')
        setOrderJson('')
        setFiatJson('')
        setPendingCetesPrepareJson(null)
        setSpeiFlow(null)
        setSpeiDetails(null)
        setSpeiDialogOpen(false)
      })
      return
    }
    if (speiFlow === 'manual' && pendingManualOrderJson) {
      await run('spei-manual-confirm', async () => {
        const f = await performFiatSimulation(pendingManualOrderJson)
        if (pendingManualQuoteJson) setQuoteJson(pendingManualQuoteJson)
        setOrderJson(pendingManualOrderJson)
        setFiatJson(f)
        setPendingManualOrderJson(null)
        setPendingManualQuoteJson(null)
        setSpeiFlow(null)
        setSpeiDetails(null)
        setSpeiDialogOpen(false)
        setAssetsJson('')
        setCetesJson('')
      })
    }
  }, [
    speiDetails,
    speiFlow,
    pendingCetesPrepareJson,
    pendingManualOrderJson,
    pendingManualQuoteJson,
    performFiatSimulation,
    run,
  ])

  const speiConfirmBusy = busy === 'spei-cetes-confirm' || busy === 'spei-manual-confirm'

  const onSpeiDialogOpenChange = useCallback(
    (open: boolean) => {
      setSpeiDialogOpen(open)
      if (!open && !speiConfirmBusy) {
        setSpeiFlow(null)
        setSpeiDetails(null)
        setPendingCetesPrepareJson(null)
        setPendingManualOrderJson(null)
        setPendingManualQuoteJson(null)
      }
    },
    [speiConfirmBusy],
  )

  /** Depuración: mismo POST que antes, sin modal. */
  const runMxCetesDirect = () =>
    run('mxn-cetes', async () => {
      const raw = cetesAmount.trim().replace(',', '.')
      const res = await fetch('/api/seyf/etherfuse/prueba/mxn-cetes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAmount: raw || '500',
          simulateFiat: true,
          useMvpIdentity: cetesUseMvp,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const step =
          data && typeof data === 'object' && typeof (data as { step?: unknown }).step === 'string'
            ? (data as { step: string }).step
            : ''
        const base =
          typeof data.error === 'string'
            ? data.error
            : `${res.status} ${res.statusText}${Object.keys(data).length ? ` — ${JSON.stringify(data)}` : ''}`
        throw new Error(step ? `${base} [paso: ${step}]` : base)
      }
      setCetesJson(JSON.stringify(data, null, 2))
      setAssetsJson('')
      setQuoteJson('')
      setOrderJson('')
      setFiatJson('')
    })

  const openCetesSpeiReview = () =>
    run('spei-cetes-prepare', async () => {
      const raw = cetesAmount.trim().replace(',', '.')
      const res = await fetch('/api/seyf/etherfuse/prueba/mxn-cetes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAmount: raw || '500',
          prepareOnly: true,
          simulateFiat: false,
          useMvpIdentity: cetesUseMvp,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const step =
          data && typeof data === 'object' && typeof (data as { step?: unknown }).step === 'string'
            ? (data as { step: string }).step
            : ''
        const base =
          typeof data.error === 'string'
            ? data.error
            : `${res.status} ${res.statusText}${Object.keys(data).length ? ` — ${JSON.stringify(data)}` : ''}`
        throw new Error(step ? `${base} [paso: ${step}]` : base)
      }
      const details = speiDetailsFromMxnCetesApiResponse(data)
      if (!details) {
        throw new Error('No se pudieron leer CLABE y monto del recuento SPEI.')
      }
      setPendingCetesPrepareJson(JSON.stringify(data))
      setSpeiFlow('cetes')
      setSpeiDetails(details)
      setSpeiDialogOpen(true)
      setAssetsJson('')
      setQuoteJson('')
      setOrderJson('')
      setFiatJson('')
      setCetesJson('')
    })

  const loadAssets = () =>
    run('assets', async () => {
      const res = await fetch('/api/seyf/etherfuse/assets')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : res.statusText)
      }
      setAssetsJson(JSON.stringify(data, null, 2))
      setQuoteJson('')
      setOrderJson('')
      setFiatJson('')
      setCetesJson('')
    })

  const quote = () =>
    run('quote', async () => {
      const q = await performQuote()
      setQuoteJson(q)
      setOrderJson('')
      setFiatJson('')
      setCetesJson('')
    })

  const createOrder = () =>
    run('order', async () => {
      const o = await performOrder(quoteJson)
      setOrderJson(o)
      setFiatJson('')
      setCetesJson('')
    })

  const simulateFiat = () =>
    run('fiat', async () => {
      const f = await performFiatSimulation(orderJson)
      setFiatJson(f)
      setCetesJson('')
    })

  const onrampTxSignature = useMemo(() => {
    const fromCetes = extractConfirmedTxSignatureFromOnrampPanelJson(cetesJson)
    if (fromCetes) return fromCetes
    return extractConfirmedTxSignatureFromOnrampPanelJson(fiatJson)
  }, [cetesJson, fiatJson])

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
    <AppPageBody>
      <AppBackLink href="/dashboard" />

      <EtherfuseRampWalletBanner variant="amber" />

      <div className="mb-6 rounded-[1.25rem] border border-dashed border-amber-500/30 bg-amber-500/[0.06] p-4">
        <p className="text-xs font-bold text-amber-200/90">Solo desarrollo</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Usa la cookie de{' '}
          <Link href="/identidad" className="font-semibold text-foreground underline-offset-2 hover:underline">
            /identidad
          </Link>{' '}
          o, en desarrollo, las variables <span className="font-mono">ETHERFUSE_MVP_*</span> en{' '}
          <span className="font-mono">.env.local</span> (misma cuenta que Depositar). El quote expira en
          ~2 min. Simular fiat solo en sandbox. En Stellar testnet hace falta trust line al{' '}
          <span className="font-mono">issuer</span> del activo (ver docs Etherfuse / testnet).
        </p>
      </div>

      <h1 className="text-2xl font-black tracking-tight text-foreground">Rampa Etherfuse (prueba)</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Onramp en sandbox: usa un solo botón abajo. Los pasos sueltos quedan en «Avanzado» para depurar.
      </p>

      <div className="mt-6 rounded-[1.25rem] border border-emerald-500/25 bg-emerald-500/[0.06] p-4 space-y-3">
        <p className="text-xs font-bold text-emerald-200/90">Onramp en un botón — MXN → CETES</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Primero verás un recuento con CLABE, nombre y monto (como en Etherfuse). Tras{' '}
          <span className="font-semibold text-foreground">Aceptar y ejecutar</span> se simula el SPEI en sandbox. Mínimo
          500 MXN. Identidad: cookie <span className="font-mono">/identidad</span> o{' '}
          <span className="font-mono">ETHERFUSE_MVP_*</span>.
        </p>
        <div className="flex items-start gap-3 rounded-[1rem] border border-border/60 bg-background/40 px-3 py-2">
          <Checkbox
            id="cetes-mvp"
            checked={cetesUseMvp}
            onCheckedChange={(v) => setCetesUseMvp(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="cetes-mvp" className="cursor-pointer text-xs leading-relaxed font-normal text-muted-foreground">
            Forzar solo <span className="font-mono">ETHERFUSE_MVP_*</span> (ignorar cookie).
          </Label>
        </div>
        <Input
          value={cetesAmount}
          onChange={(e) => setCetesAmount(e.target.value)}
          placeholder="Monto MXN (mín. 500)"
          className="h-12 rounded-full border-border bg-background/60 px-4 text-sm"
        />
        <Button
          type="button"
          disabled={!!busy}
          onClick={() => void openCetesSpeiReview()}
          className="h-12 w-full rounded-full bg-emerald-600 font-bold text-white hover:bg-emerald-700"
        >
          {busy === 'spei-cetes-prepare'
            ? 'Preparando recuento SPEI…'
            : 'Continuar — revisar transferencia SPEI'}
        </Button>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-border bg-card/50 p-4 space-y-3">
        <p className="text-xs font-bold text-foreground">Otro activo destino — un botón</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Cotización y orden; luego modal SPEI y, al confirmar, <span className="font-mono">fiat_received</span> + polling.
          Opcional <span className="font-mono">targetAsset</span>.
        </p>
        <Input
          value={sourceAmount}
          onChange={(e) => setSourceAmount(e.target.value)}
          placeholder="Monto MXN"
          className="h-12 rounded-full border-border bg-background/60 px-4 text-sm"
        />
        <Input
          value={targetOverride}
          onChange={(e) => setTargetOverride(e.target.value)}
          placeholder="targetAsset opcional (CODE:ISSUER)"
          className="h-12 rounded-full border-border bg-background/60 px-4 font-mono text-xs"
        />
        <Button
          type="button"
          disabled={!!busy}
          onClick={() => void openManualSpeiReview()}
          className="h-12 w-full rounded-full bg-foreground font-bold text-background hover:bg-foreground/90"
        >
          {busy === 'spei-manual-prepare'
            ? 'Preparando orden…'
            : 'Continuar — revisar SPEI y ejecutar'}
        </Button>
      </div>

      <details className="mt-6 rounded-[1.25rem] border border-border/80 bg-card/30 p-4 [&_summary]:cursor-pointer [&_summary]:font-semibold [&_summary]:text-sm">
        <summary className="text-foreground outline-none">Avanzado — pasos sueltos</summary>
        <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
          <div className="rounded-[1.25rem] border border-border bg-card/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">1. Activos rampables</p>
            <Button
              type="button"
              variant="outline"
              disabled={!!busy}
              onClick={() => void loadAssets()}
              className="mt-3 w-full rounded-full border-border font-semibold"
            >
              {busy === 'assets' ? 'Cargando…' : 'GET assets'}
            </Button>
          </div>

          <div className="rounded-[1.25rem] border border-border bg-card/50 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">2. Solo cotización</p>
            <Button
              type="button"
              variant="outline"
              disabled={!!busy}
              onClick={() => void quote()}
              className="h-12 w-full rounded-full border-border font-semibold"
            >
              {busy === 'quote' ? 'Cotizando…' : 'POST quote'}
            </Button>
          </div>

          <div className="rounded-[1.25rem] border border-border bg-card/50 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">3. Solo orden (necesita quote previo)</p>
            <Button
              type="button"
              variant="outline"
              disabled={!!busy}
              onClick={() => void createOrder()}
              className="h-12 w-full rounded-full border-border font-semibold"
            >
              {busy === 'order' ? 'Creando…' : 'POST order'}
            </Button>
          </div>

          <div className="rounded-[1.25rem] border border-border bg-card/50 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">4. Solo mock SPEI (necesita orden previa)</p>
            <Button
              type="button"
              variant="outline"
              disabled={!!busy}
              onClick={() => void simulateFiat()}
              className="h-12 w-full rounded-full border-border font-semibold"
            >
              {busy === 'fiat' ? 'Simulando…' : 'POST fiat_received'}
            </Button>
          </div>

          <div className="rounded-[1.25rem] border border-border bg-card/50 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">MXN → CETES sin modal (depuración)</p>
            <Button
              type="button"
              variant="outline"
              disabled={!!busy}
              onClick={() => void runMxCetesDirect()}
              className="h-12 w-full rounded-full border-border font-semibold"
            >
              {busy === 'mxn-cetes' ? 'Ejecutando…' : 'POST mxn-cetes directo'}
            </Button>
          </div>
        </div>
      </details>

      {err && (
        <p className="mt-6 rounded-[1rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {err}
        </p>
      )}

      {onrampTxSignature && stellarTxExplorerUrl ? (
        <div className="mt-6 rounded-[1.25rem] border border-emerald-500/45 bg-emerald-500/[0.14] p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-200/95">
            Onramp completado — hash de transacción
          </p>
          <p className="mt-2 break-all font-mono text-[13px] leading-relaxed text-foreground">
            {onrampTxSignature}
          </p>
          <p className="mt-3">
            <a
              href={stellarTxExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-500"
            >
              Abrir en Stellar Expert
            </a>
          </p>
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        {cetesJson && (
          <div className="space-y-3">
            <OrderTransactionDetailCard payloadJson={cetesJson} />
            <pre className="max-h-96 overflow-auto rounded-[1rem] border border-emerald-500/25 bg-emerald-500/[0.06] p-3 text-[11px] leading-relaxed text-foreground">
              {cetesJson}
            </pre>
          </div>
        )}
        {assetsJson && (
          <pre className="max-h-48 overflow-auto rounded-[1rem] border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-foreground">
            {assetsJson}
          </pre>
        )}
        {quoteJson && (
          <pre className="max-h-64 overflow-auto rounded-[1rem] border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-foreground">
            {quoteJson}
          </pre>
        )}
        {orderJson && (
          <div className="space-y-3">
            <OrderCreatedDepositCard orderApiJson={orderJson} />
            <pre className="max-h-64 overflow-auto rounded-[1rem] border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-foreground">
              {orderJson}
            </pre>
          </div>
        )}
        {fiatJson && (
          <div className="space-y-3">
            <OrderTransactionDetailCard payloadJson={fiatJson} />
            <pre className="max-h-48 overflow-auto rounded-[1rem] border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-[11px] leading-relaxed text-foreground">
              {fiatJson}
            </pre>
          </div>
        )}
      </div>
      <SpeiTransferReviewDialog
        open={speiDialogOpen}
        onOpenChange={(open) => {
          if (!open && speiConfirmBusy) return
          onSpeiDialogOpenChange(open)
        }}
        details={speiDetails}
        onConfirm={() => void confirmSpeiDialog()}
        confirmBusy={speiConfirmBusy}
      />
    </AppPageBody>
  )
}
