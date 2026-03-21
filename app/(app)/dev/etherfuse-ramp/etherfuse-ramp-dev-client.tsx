'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

export default function EtherfuseRampDevClient() {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [assetsJson, setAssetsJson] = useState<string>('')
  const [targetOverride, setTargetOverride] = useState('')
  const [sourceAmount, setSourceAmount] = useState('100')
  const [quoteJson, setQuoteJson] = useState<string>('')
  const [orderJson, setOrderJson] = useState<string>('')
  const [fiatJson, setFiatJson] = useState<string>('')

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
    })

  const quote = () =>
    run('quote', async () => {
      const body: { sourceAmount: string; targetAsset?: string } = {
        sourceAmount: sourceAmount.trim() || '100',
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
        throw new Error(typeof data.error === 'string' ? data.error : res.statusText)
      }
      setQuoteJson(JSON.stringify(data, null, 2))
      setOrderJson('')
      setFiatJson('')
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
    })

  return (
    <AppPageBody>
      <AppBackLink href="/dashboard" />

      <div className="mb-6 rounded-[1.25rem] border border-dashed border-amber-500/30 bg-amber-500/[0.06] p-4">
        <p className="text-xs font-bold text-amber-200/90">Solo desarrollo</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Requiere sesión Etherfuse (cookie tras completar el flujo en{' '}
          <Link href="/identidad" className="font-semibold text-foreground underline-offset-2 hover:underline">
            /identidad
          </Link>
          ). El quote expira en ~2 min. Simular fiat solo aplica en sandbox.
        </p>
      </div>

      <h1 className="text-2xl font-black tracking-tight text-foreground">Rampa Etherfuse (prueba)</h1>

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
