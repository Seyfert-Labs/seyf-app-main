'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type LedgerResponse = {
  userId: string
  balanceMxn: number
  entries: Array<{
    id: string
    ts: string
    type: 'credit' | 'debit'
    amountMxn: number
    memo: string
  }>
  note?: string
  model?: string
}

export default function PocOmnibusClient() {
  const [data, setData] = useState<LedgerResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState('500')
  const [memo, setMemo] = useState('')

  const load = useCallback(async () => {
    setErr(null)
    const res = await fetch('/api/seyf/poc/ledger')
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErr(typeof j.error === 'string' ? j.error : res.statusText)
      return
    }
    setData(j as LedgerResponse)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const post = async (action: 'credit' | 'debit') => {
    setBusy(true)
    setErr(null)
    try {
      const n = Number.parseFloat(amount.replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0) {
        setErr('Monto inválido')
        return
      }
      const res = await fetch('/api/seyf/poc/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          amountMxn: n,
          ...(memo.trim() ? { memo: memo.trim() } : {}),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(typeof j.error === 'string' ? j.error : res.statusText)
        return
      }
      setData({
        userId: j.userId,
        balanceMxn: j.balanceMxn,
        entries: j.entries,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppPageBody>
      <AppBackLink href="/dashboard" />

      <div className="mb-6 rounded-[1.25rem] border border-dashed border-sky-500/30 bg-sky-500/[0.06] p-4">
        <p className="text-xs font-bold text-sky-200/90">PoC — libro interno (omnibus)</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Etherfuse usa <span className="font-mono">una sola wallet</span> en sandbox (MVP / identidad).{' '}
          Aquí cada navegador tiene un <span className="font-mono">userId</span> anónimo (cookie) y un saldo
          lógico en MXN solo en memoria del servidor: demuestra UX “sin cripto”
          sin separar fondos on-chain por usuario. Reiniciar <span className="font-mono">next dev</span>{' '}
          borra los saldos.
        </p>
      </div>

      <h1 className="text-2xl font-black tracking-tight text-foreground">Ledger PoC (omnibus)</h1>

      {err && (
        <p className="mt-4 rounded-[1rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {err}
        </p>
      )}

      {data && (
        <div className="mt-6 space-y-4">
          <div className="rounded-[1.25rem] border border-border bg-card/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">Usuario PoC (cookie)</p>
            <p className="mt-1 break-all font-mono text-xs text-foreground">{data.userId}</p>
            <p className="mt-4 text-3xl font-black tabular-nums text-foreground">
              {data.balanceMxn.toLocaleString('es-MX', {
                style: 'currency',
                currency: 'MXN',
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Saldo mostrado al usuario (no on-chain)</p>
          </div>

          <div className="rounded-[1.25rem] border border-border bg-card/50 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Simular movimiento (solo dev)</p>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Monto MXN"
              className="h-10 rounded-full border-border bg-background/60 px-4 text-sm"
            />
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Nota (opcional)"
              className="h-10 rounded-full border-border bg-background/60 px-4 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy}
                onClick={() => void post('credit')}
                className="rounded-full bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
              >
                Abonar (simulado)
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void post('debit')}
                className="rounded-full border-border font-semibold"
              >
                Retirar (simulado)
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void load()} className="rounded-full">
                Refrescar
              </Button>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Movimientos</p>
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-xs">
              {data.entries.length === 0 ? (
                <li className="text-muted-foreground">Sin movimientos.</li>
              ) : (
                data.entries.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/50 pb-2 font-mono"
                  >
                    <span className={e.type === 'credit' ? 'text-emerald-600' : 'text-amber-700'}>
                      {e.type === 'credit' ? '+' : '−'}
                      {e.amountMxn.toFixed(2)} MXN
                    </span>
                    <span className="text-muted-foreground">{e.memo}</span>
                    <span className="w-full text-[10px] text-muted-foreground/80">{e.ts}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        Siguiente paso: enlazar webhooks Etherfuse o el flujo de depósito real para que un{' '}
        <span className="font-mono">credit</span> coincida con SPEI confirmado en la wallet compartida, y
        mantener la UI igual para el usuario.{' '}
        <Link href="/anadir" className="font-semibold text-foreground underline-offset-2 hover:underline">
          Panel rampa
        </Link>
      </p>
    </AppPageBody>
  )
}
