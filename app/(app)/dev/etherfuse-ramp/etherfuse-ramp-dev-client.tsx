'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function pickQuoteId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const id = o.quoteId ?? o.quote_id
  return typeof id === 'string' && id.length > 0 ? id : null
}

function pickOrderId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const id = o.orderId ?? o.order_id
  return typeof id === 'string' && id.length > 0 ? id : null
}

type OrderDisplay = {
  orderId: string | null
  status: string | null
  confirmedTxSignature: string | null
  statusPage: string | null
  depositClabe: string | null
}

function OrderTxSummary({ payloadJson }: { payloadJson: string }) {
  let orderDisplay: OrderDisplay | null = null
  let orderFetchError: string | null = null
  try {
    const root = JSON.parse(payloadJson) as {
      orderDisplay?: OrderDisplay | null
      orderFetchError?: string | null
    }
    orderDisplay = root.orderDisplay ?? null
    orderFetchError =
      typeof root.orderFetchError === 'string' ? root.orderFetchError : null
  } catch {
    return null
  }
  const tx = orderDisplay?.confirmedTxSignature?.trim()
  const stellarTxUrl = tx
    ? `https://stellar.expert/explorer/testnet/tx/${encodeURIComponent(tx)}`
    : null

  return (
    <div className="rounded-[1rem] border border-border bg-card/80 p-4 text-sm">
      <p className="text-xs font-bold text-foreground">Orden y transacción</p>
      {orderDisplay?.statusPage ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Vista Etherfuse (como en devnet):{' '}
          <a
            href={orderDisplay.statusPage}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-500"
          >
            Abrir orden en Etherfuse
          </a>
        </p>
      ) : null}
      {orderDisplay?.status ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Estado API: <span className="font-mono text-foreground">{orderDisplay.status}</span>
        </p>
      ) : null}
      {tx ? (
        <p className="mt-2 break-all text-xs leading-relaxed">
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
                Ver en Stellar Expert (testnet)
              </a>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          El hash on-chain (`confirmedTxSignature`) puede aparecer cuando el estado pase a{' '}
          <span className="font-mono">funded</span>/<span className="font-mono">completed</span> (a veces
          unos segundos después de simular SPEI).
        </p>
      )}
      {orderFetchError ? (
        <p className="mt-2 text-xs text-amber-600">
          No se pudo refrescar GET /ramp/order (reintentos): {orderFetchError}
        </p>
      ) : null}
    </div>
  )
}

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
  const [cetesUseMvp, setCetesUseMvp] = useState(true)
  const [cetesJson, setCetesJson] = useState<string>('')

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

  /** Flujo recomendado en sandbox: quote + orden CETES + POST fiat_received (mock SPEI). Ver guía Etherfuse «Test Onramps». */
  const runMxCetes = () =>
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
      setQuoteJson(JSON.stringify(data, null, 2))
      setOrderJson('')
      setFiatJson('')
      setCetesJson('')
    })

  const createOrder = () =>
    run('order', async () => {
      let parsed: unknown
      try {
        parsed = JSON.parse(quoteJson || '{}')
      } catch {
        throw new Error('Primero cotiza y deja un quote JSON válido')
      }
      const inner =
        parsed && typeof parsed === 'object' && 'quote' in (parsed as object)
          ? (parsed as { quote: unknown }).quote
          : parsed
      const quoteId = pickQuoteId(inner)
      if (!quoteId) {
        throw new Error('No encuentro quoteId en la respuesta de cotización (~2 min de validez)')
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
      setOrderJson(JSON.stringify(data, null, 2))
      setFiatJson('')
      setCetesJson('')
    })

  const simulateFiat = () =>
    run('fiat', async () => {
      let parsed: unknown
      try {
        parsed = JSON.parse(orderJson || '{}')
      } catch {
        throw new Error('Primero crea una orden con JSON válido')
      }
      const inner =
        parsed && typeof parsed === 'object' && 'order' in (parsed as object)
          ? (parsed as { order: unknown }).order
          : parsed
      const orderId = pickOrderId(inner)
      if (!orderId) {
        throw new Error('No encuentro orderId en la respuesta de orden')
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
      setFiatJson(JSON.stringify(data, null, 2))
      setCetesJson('')
    })

  return (
    <AppPageBody>
      <AppBackLink href="/dashboard" />

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

      <div className="mt-6 rounded-[1.25rem] border border-emerald-500/25 bg-emerald-500/[0.06] p-4 space-y-3">
        <p className="text-xs font-bold text-emerald-200/90">Rápido: MXN → CETES (sandbox)</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Un solo paso: cotización + orden con destino CETES y simulación SPEI (<span className="font-mono">fiat_received</span>).
          Mínimo 500 MXN. Por defecto usa identidad <span className="font-mono">ETHERFUSE_MVP_*</span> (misma que Depositar), no la cookie de{' '}
          <span className="font-mono">/identidad</span>, para evitar errores de API si el KYC no coincide con la sesión web.
        </p>
        <div className="flex items-start gap-3 rounded-[1rem] border border-border/60 bg-background/40 px-3 py-2">
          <Checkbox
            id="cetes-mvp"
            checked={cetesUseMvp}
            onCheckedChange={(v) => setCetesUseMvp(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="cetes-mvp" className="cursor-pointer text-xs leading-relaxed font-normal text-muted-foreground">
            Usar solo <span className="font-mono">ETHERFUSE_MVP_*</span> en <span className="font-mono">.env.local</span> (recomendado).
            Desactiva para probar la cookie de <span className="font-mono">/identidad</span>.
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
          onClick={() => void runMxCetes()}
          className="h-12 w-full rounded-full bg-emerald-600 font-bold text-white hover:bg-emerald-700"
        >
          {busy === 'mxn-cetes' ? 'Ejecutando…' : 'MXN → CETES + mock SPEI'}
        </Button>
      </div>

      <div className="mt-6 space-y-4">
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
          <p className="text-xs font-medium text-muted-foreground">2. Cotización onramp (MXN)</p>
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
            onClick={() => void quote()}
            className="h-12 w-full rounded-full bg-foreground font-bold text-background"
          >
            {busy === 'quote' ? 'Cotizando…' : 'POST quote'}
          </Button>
        </div>

        <div className="rounded-[1.25rem] border border-border bg-card/50 p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">3. Orden</p>
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
          <p className="text-xs font-medium text-muted-foreground">4. Sandbox: simular SPEI</p>
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
      </div>

      {err && (
        <p className="mt-6 rounded-[1rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {err}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {cetesJson && (
          <div className="space-y-3">
            <OrderTxSummary payloadJson={cetesJson} />
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
          <pre className="max-h-64 overflow-auto rounded-[1rem] border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-foreground">
            {orderJson}
          </pre>
        )}
        {fiatJson && (
          <pre className="max-h-48 overflow-auto rounded-[1rem] border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-[11px] leading-relaxed text-foreground">
            {fiatJson}
          </pre>
        )}
      </div>
    </AppPageBody>
  )
}
