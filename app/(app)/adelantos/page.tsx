'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppPageBody } from '@/components/app/app-page-body'
import { AppBackLink } from '@/components/app/app-back-link'
import { Button } from '@/components/ui/button'

type AdvanceRow = {
  id: string
  status: 'pending' | 'completed' | 'failed' | 'liquidated'
  amount_mxn: number
  fee_mxn: number
  net_mxn: number
  years: number
  rate_percent: number
  due_at: string
  created_at: string
  liquidated_at: string | null
  liquidation_fee_mxn: number | null
  time_left_label: string
  can_liquidate: boolean
}

function formatMXN(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

function statusUi(status: AdvanceRow['status']) {
  if (status === 'completed') return { label: 'Activo', cls: 'bg-emerald-500/15 text-emerald-300' }
  if (status === 'liquidated') return { label: 'Liquidado', cls: 'bg-cyan-500/15 text-cyan-300' }
  if (status === 'pending') return { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-200' }
  return { label: 'Fallido', cls: 'bg-rose-500/15 text-rose-300' }
}

export default function AdelantosPage() {
  const [rows, setRows] = useState<AdvanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [liquidatingId, setLiquidatingId] = useState<string | null>(null)
  const [uiError, setUiError] = useState<string | null>(null)

  const loadRows = async () => {
    const res = await fetch('/api/seyf/advance/list')
    const data = await res.json()
    setRows(Array.isArray(data?.items) ? data.items : [])
  }

  useEffect(() => {
    loadRows()
      .catch(() => setUiError('No pudimos cargar tus adelantos.'))
      .finally(() => setLoading(false))
  }, [])

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.status === 'completed')
    return {
      activeCount: active.length,
      activeAmount: active.reduce((sum, r) => sum + r.amount_mxn, 0),
    }
  }, [rows])

  const handleLiquidar = async (advanceId: string) => {
    setLiquidatingId(advanceId)
    setUiError(null)
    try {
      const res = await fetch('/api/seyf/advance/liquidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advance_id: advanceId }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message_es?: string }
      if (!res.ok || !data.ok) {
        setUiError(data.message_es || data.error || `No pudimos liquidar (HTTP ${res.status}).`)
        return
      }
      await loadRows()
    } catch {
      setUiError('Error de conexión al liquidar adelanto.')
    } finally {
      setLiquidatingId(null)
    }
  }

  if (loading) {
    return (
      <AppPageBody className="flex items-center justify-center pt-20">
        <p className="animate-pulse font-medium text-muted-foreground">Cargando adelantos...</p>
      </AppPageBody>
    )
  }

  return (
    <AppPageBody className="space-y-5 pt-2">
      <AppBackLink href="/adelanto" />

      <section className="relative overflow-hidden rounded-[1.5rem] border border-[#bfd6ca] bg-gradient-to-br from-[#edf6f2] via-[#e6f0ea] to-[#dce9e3] p-5 dark:border-[#2b4a43] dark:bg-gradient-to-br dark:from-[#0d3531] dark:via-[#15534a] dark:to-[#1f6559]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#9ec7b3]/25 blur-3xl dark:bg-[#6ba690]/25" />
        <h1 className="relative text-2xl font-black tracking-tight text-[#41534b] dark:text-white">Tus adelantos</h1>
        <p className="relative mt-1 text-sm text-[#7b8f86] dark:text-[#d2e9df]">
          Visualiza montos, tasa aplicada y el tiempo que falta para liberar capital.
        </p>
        <div className="relative mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/75 px-3 py-2 dark:bg-white/10">
            <p className="text-[11px] text-muted-foreground">Activos</p>
            <p className="text-lg font-black text-foreground dark:text-white">{totals.activeCount}</p>
          </div>
          <div className="rounded-xl bg-white/75 px-3 py-2 dark:bg-white/10">
            <p className="text-[11px] text-muted-foreground">Total activo</p>
            <p className="text-lg font-black text-foreground dark:text-white">{formatMXN(totals.activeAmount)}</p>
          </div>
        </div>
      </section>

      {uiError ? (
        <div className="rounded-[1rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {uiError}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <section className="rounded-[1.5rem] bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">Aún no tienes adelantos registrados.</p>
        </section>
      ) : (
        <section className="space-y-3">
          {rows.map((item) => {
            const st = statusUi(item.status)
            return (
              <article key={item.id} className="rounded-[1.5rem] bg-card p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl font-black tabular-nums text-foreground">{formatMXN(item.amount_mxn)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Creado: {new Date(item.created_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-secondary/40 px-2 py-2">
                    <p className="text-[10px] text-muted-foreground">Tasa</p>
                    <p className="text-sm font-bold text-foreground">{item.rate_percent.toFixed(2)}%</p>
                  </div>
                  <div className="rounded-xl bg-secondary/40 px-2 py-2">
                    <p className="text-[10px] text-muted-foreground">Plazo</p>
                    <p className="text-sm font-bold text-foreground">{item.years} año(s)</p>
                  </div>
                  <div className="rounded-xl bg-secondary/40 px-2 py-2">
                    <p className="text-[10px] text-muted-foreground">Por liberar</p>
                    <p className="text-sm font-bold text-foreground">{item.time_left_label}</p>
                  </div>
                </div>

                {item.can_liquidate ? (
                  <Button
                    type="button"
                    className="mt-3 h-10 w-full rounded-full"
                    disabled={liquidatingId === item.id}
                    onClick={() => void handleLiquidar(item.id)}
                  >
                    {liquidatingId === item.id ? 'Liquidando...' : 'Liquidar y liberar capital'}
                  </Button>
                ) : null}
              </article>
            )
          })}
        </section>
      )}
    </AppPageBody>
  )
}
