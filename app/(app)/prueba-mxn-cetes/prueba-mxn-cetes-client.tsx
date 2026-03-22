'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AppPageBody } from '@/components/app/app-page-body'
import { AppBackLink } from '@/components/app/app-back-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

type OrderPoll = Record<string, unknown>

function statusFromOrder(o: unknown): string {
  if (!o || typeof o !== 'object') return '—'
  const r = o as Record<string, unknown>
  const s = r.status ?? r.order_status
  return typeof s === 'string' ? s : '—'
}

function txFromOrder(o: unknown): string | null {
  if (!o || typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  const t = r.confirmedTxSignature ?? r.confirmed_tx_signature
  return typeof t === 'string' ? t : null
}

const TERMINAL = new Set(['completed', 'failed', 'canceled', 'cancelled', 'refunded'])

export default function PruebaMxnCetesClient() {
  const [amount, setAmount] = useState('500')
  const [simulateFiat, setSimulateFiat] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<unknown>(null)
  const [orderPoll, setOrderPoll] = useState<OrderPoll | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const orderIdRef = useRef<string | null>(null)
  const stopPoll = useRef(false)

  const pollOrder = useCallback(async (oid: string) => {
    const res = await fetch(`/api/seyf/etherfuse/prueba/order/${encodeURIComponent(oid)}`)
    const data = (await res.json()) as { order?: unknown; error?: string }
    if (!res.ok) {
      setPollError(typeof data.error === 'string' ? data.error : 'Error al leer orden')
      return null
    }
    const o = data.order
    if (o && typeof o === 'object') {
      setOrderPoll(o as OrderPoll)
      return statusFromOrder(o).toLowerCase()
    }
    return null
  }, [])

  useEffect(() => {
    const oid = orderIdRef.current
    if (!oid) return
    stopPoll.current = false
    let t: ReturnType<typeof setInterval> | undefined
    const tick = async () => {
      if (stopPoll.current) return
      const st = await pollOrder(oid)
      if (st && TERMINAL.has(st)) {
        stopPoll.current = true
        if (t) clearInterval(t)
      }
    }
    tick()
    t = setInterval(tick, 2000)
    return () => {
      stopPoll.current = true
      if (t) clearInterval(t)
    }
  }, [runResult, pollOrder])

  const ejecutar = async () => {
    setError(null)
    setRunResult(null)
    setOrderPoll(null)
    setPollError(null)
    orderIdRef.current = null
    stopPoll.current = true

    setLoading(true)
    try {
      const res = await fetch('/api/seyf/etherfuse/prueba/mxn-cetes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAmount: amount.trim(),
          simulateFiat,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Error')
        return
      }
      setRunResult(data)
      const ramp = data.ramp as { deposit?: { orderId?: string } } | undefined
      const oid = ramp?.deposit?.orderId
      if (typeof oid === 'string') {
        orderIdRef.current = oid
        const ord = data.order
        if (ord && typeof ord === 'object') setOrderPoll(ord as OrderPoll)
      }
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  const st = orderPoll ? statusFromOrder(orderPoll) : '—'
  const tx = orderPoll ? txFromOrder(orderPoll) : null

  return (
    <AppPageBody className="space-y-6">
      <AppBackLink href="/dashboard">Inicio</AppBackLink>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Devnet · Etherfuse sandbox
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
          Prueba MXN → CETES
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Onramp de pesos (fiat) a CETES en Stellar. Tras crear la orden, en sandbox puedes simular el
          SPEI entrante y ver el estado hasta <span className="font-semibold text-foreground">completed</span>.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-4">
        <div className="space-y-2">
          <Label htmlFor="amt">Monto (MXN)</Label>
          <Input
            id="amt"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Simular SPEI (sandbox)</p>
            <p className="text-xs text-muted-foreground">Llama a fiat_received en dev</p>
          </div>
          <Switch checked={simulateFiat} onCheckedChange={setSimulateFiat} />
        </div>
        <Button
          type="button"
          disabled={loading}
          onClick={ejecutar}
          className="w-full rounded-full font-bold"
        >
          {loading ? 'Ejecutando…' : 'Ejecutar MXN → CETES'}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {runResult != null ? (
        <div className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4 text-sm">
          <p className="font-bold text-foreground">Resultado inicial</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
            {JSON.stringify(runResult, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
        <p className="text-sm font-bold text-foreground">Estado de la orden (polling 2s)</p>
        {pollError && (
          <p className="mt-2 text-sm text-destructive">{pollError}</p>
        )}
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">status</dt>
            <dd className="font-mono font-semibold text-foreground">{st}</dd>
          </div>
          {tx && (
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">confirmedTxSignature</dt>
              <dd className="break-all font-mono text-xs text-foreground">{tx}</dd>
            </div>
          )}
        </dl>
        {!orderPoll && !pollError && runResult != null ? (
          <p className="mt-2 text-xs text-muted-foreground">Esperando primera lectura…</p>
        ) : null}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Docs:{' '}
        <a
          href="https://docs.etherfuse.com/guides/testing-onramps"
          className="underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Testing onramps
        </a>
        {' · '}
        <a
          href="https://docs.etherfuse.com/sandbox-api/fiat-received"
          className="underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Simulate fiat received
        </a>
      </p>

      <p className="text-center text-xs">
        <Link href="/depositar" className="text-foreground underline underline-offset-2">
          Ir a Depositar
        </Link>
      </p>
    </AppPageBody>
  )
}
