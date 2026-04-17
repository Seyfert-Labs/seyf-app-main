'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSeyfWallet } from '@/lib/seyf/use-seyf-wallet'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { MovementDetailSheet } from '@/components/app/movement-detail-sheet'
import { iconForMovimientoTipo } from '@/components/app/movement-tipo-icons'
import { Button } from '@/components/ui/button'
import {
  HISTORIAL_POLL_EXTRA_DELAYS_MS,
  HISTORIAL_POLL_MS,
} from '@/lib/seyf/balance-poll-intervals'
import { POLL_FETCH_INIT, pollBustUrl } from '@/lib/seyf/poll-fetch'
import type { UserMovement } from '@/lib/seyf/user-movements-types'
import { formatMovementListSubtitle } from '@/lib/seyf/user-movements-types'
import { cn } from '@/lib/utils'

const filtros = ['Todas', 'Entradas', 'Salidas'] as const
type Filtro = (typeof filtros)[number]

/** Sin ledger MVP / “Ahorro invertido (prueba)”. */
function isRealMovement(m: UserMovement): boolean {
  return m.source !== 'ledger'
}

function mergeMovements(etherfuseYmas: UserMovement[], stellar: UserMovement[]): UserMovement[] {
  const map = new Map<string, UserMovement>()
  for (const m of etherfuseYmas) {
    if (!isRealMovement(m)) continue
    map.set(m.id, m)
  }
  for (const m of stellar) map.set(m.id, m)
  return [...map.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

function matchesFiltro(m: UserMovement, f: Filtro): boolean {
  if (f === 'Todas') return true
  if (f === 'Entradas') return m.monto >= 0
  if (f === 'Salidas') return m.monto < 0
  return true
}

function formatHistorialMonto(mov: UserMovement): string {
  const code = mov.chainAssetCode?.trim()
  const sign = mov.monto < 0 ? '− ' : mov.monto > 0 ? '+ ' : ''
  if (code) {
    const abs = Math.abs(mov.monto)
    const n = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 7 }).format(abs)
    return `${sign}${n} ${code}`
  }
  const abs = Math.abs(mov.monto)
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(abs)
  return mov.monto < 0 ? `− ${formatted}` : mov.monto > 0 ? `+ ${formatted}` : formatted
}

export default function HistorialPageClient() {
  const { wallet, loading: walletLoading } = useSeyfWallet()
  const [items, setItems] = useState<UserMovement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('Todas')
  const [selected, setSelected] = useState<UserMovement | null>(null)

  const loadAll = useCallback(async () => {
    const addr = wallet?.stellarAddress?.trim()
    if (!addr) {
      setItems([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    let stellar: UserMovement[] = []
    let fromApi: UserMovement[] = []
    const errs: string[] = []

    try {
      const stellarR = await fetch(
        `/api/seyf/stellar-movements?account=${encodeURIComponent(addr)}`,
      )
      if (stellarR.ok) {
        const j = (await stellarR.json()) as unknown
        if (Array.isArray(j)) stellar = j as UserMovement[]
      } else {
        const err = (await stellarR.json().catch(() => ({}))) as { error?: string }
        errs.push(err.error ?? `Stellar (${stellarR.status})`)
      }
    } catch {
      errs.push('No se pudieron cargar pagos Stellar')
    }

    try {
      const umR = await fetch(pollBustUrl('/api/seyf/user-movements'), POLL_FETCH_INIT)
      if (umR.ok) {
        const j = (await umR.json()) as { movements?: UserMovement[] }
        if (Array.isArray(j.movements)) fromApi = j.movements
      } else {
        errs.push(`Órdenes (${umR.status})`)
      }
    } catch {
      errs.push('No se pudieron cargar órdenes Etherfuse')
    }

    const merged = mergeMovements(fromApi, stellar)
    setItems(merged)
    setError(merged.length === 0 && errs.length > 0 ? errs.join(' · ') : null)

    setLoading(false)
  }, [wallet?.stellarAddress])

  useEffect(() => {
    if (!wallet?.stellarAddress) {
      setItems([])
      setError(null)
      return
    }
    void loadAll()
  }, [wallet?.stellarAddress, loadAll])

  const refresh = useCallback(async () => {
    if (!wallet?.stellarAddress?.trim()) return
    try {
      const addr = wallet.stellarAddress.trim()
      const [stellarR, umR] = await Promise.all([
        fetch(`/api/seyf/stellar-movements?account=${encodeURIComponent(addr)}`),
        fetch(pollBustUrl('/api/seyf/user-movements'), POLL_FETCH_INIT),
      ])
      let stellar: UserMovement[] = []
      if (stellarR.ok) {
        const j = (await stellarR.json()) as unknown
        if (Array.isArray(j)) stellar = j as UserMovement[]
      }
      let fromApi: UserMovement[] = []
      if (umR.ok) {
        const j = (await umR.json()) as { movements?: UserMovement[] }
        if (Array.isArray(j.movements)) fromApi = j.movements
      }
      setItems(mergeMovements(fromApi, stellar))
    } catch {
      /* mantener lista */
    }
  }, [wallet?.stellarAddress])

  useEffect(() => {
    if (!wallet?.stellarAddress) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (document.visibilityState !== 'visible') return
      void refresh()
    }
    tick()
    const extraTimers = HISTORIAL_POLL_EXTRA_DELAYS_MS.map((ms) => setTimeout(tick, ms))
    const id = setInterval(tick, HISTORIAL_POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    const onFocus = () => tick()
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) tick()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      cancelled = true
      for (const t of extraTimers) clearTimeout(t)
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [refresh, wallet?.stellarAddress])

  useEffect(() => {
    if (!selected) return
    const next = items.find((m) => m.id === selected.id)
    if (next) setSelected(next)
    else setSelected(null)
  }, [items, selected])

  const filtered = useMemo(
    () => items.filter((m) => matchesFiltro(m, filtro)),
    [items, filtro],
  )

  if (walletLoading && !wallet) {
    return (
      <AppPageBody>
        <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-secondary" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[4.5rem] animate-pulse rounded-[1.25rem] border border-border bg-secondary/40"
            />
          ))}
        </div>
      </AppPageBody>
    )
  }

  if (!wallet) {
    return (
      <AppPageBody>
        <AppBackLink href="/dashboard" />
        <section className="relative mb-8 overflow-hidden rounded-[1.5rem] border border-sky-400/25 bg-gradient-to-br from-sky-700/25 via-indigo-700/20 to-violet-700/15 p-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-300/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-violet-300/15 blur-3xl" />
          <div className="relative">
            <p className="inline-flex rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-100/90">
              Estado de cuenta
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Historial</h1>
            <p className="mt-2 text-sm text-sky-100/80">
              Conecta tu wallet para ver Stellar (testnet + mainnet) y tus órdenes Etherfuse.
            </p>
          </div>
        </section>
        <Button asChild className="h-11 rounded-full font-bold">
          <Link href="/">Ir a conectar</Link>
        </Button>
      </AppPageBody>
    )
  }

  return (
    <AppPageBody>
      <AppBackLink href="/dashboard" />
      <section className="relative mb-8 overflow-hidden rounded-[1.5rem] border border-sky-400/25 bg-gradient-to-br from-sky-700/25 via-indigo-700/20 to-violet-700/15 p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-violet-300/15 blur-3xl" />
        <div className="relative">
          <p className="inline-flex rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-100/90">
            Estado de cuenta
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Historial</h1>
          <p className="mt-2 text-sm text-sky-100/80">
            Pagos en cadena (Stellar testnet y mainnet) y movimientos reales de ramp (Etherfuse).
          </p>
        </div>
      </section>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filtros.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              filtro === f
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground ring-1 ring-border hover:text-foreground',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-[1.25rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-semibold">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 rounded-full"
            onClick={() => void loadAll()}
          >
            Reintentar
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[4.5rem] animate-pulse rounded-[1.25rem] border border-border bg-secondary/40"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-border bg-card py-20 text-center">
          <p className="mb-2 text-lg font-black text-foreground">Sin movimientos</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            No hay operaciones que coincidan, o aún no hay actividad en Stellar / Etherfuse con esta cuenta.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((mov) => {
            const esPositivo = mov.monto >= 0
            return (
              <button
                key={mov.id}
                type="button"
                onClick={() => setSelected(mov)}
                className="flex w-full items-center justify-between rounded-[1.25rem] border border-border bg-card p-4 text-left transition hover:bg-secondary/80"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                    {iconForMovimientoTipo(mov.tipo)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{mov.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatMovementListSubtitle(mov.createdAt)}
                      {mov.source === 'stellar'
                        ? mov.stellarNetwork === 'mainnet'
                          ? ' · Mainnet'
                          : ' · Testnet'
                        : mov.source === 'etherfuse'
                          ? ' · Ramp'
                          : ''}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pl-2 text-right">
                  <p
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      esPositivo ? 'text-emerald-400/90' : 'text-foreground',
                    )}
                  >
                    {formatHistorialMonto(mov)}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-xs font-medium',
                      mov.estado === 'completado'
                        ? 'text-muted-foreground'
                        : mov.estado === 'pendiente'
                          ? 'text-amber-300/90'
                          : 'text-red-400/90',
                    )}
                  >
                    {mov.estado.charAt(0).toUpperCase() + mov.estado.slice(1)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selected ? (
        <MovementDetailSheet
          movement={selected}
          onClose={() => setSelected(null)}
          icon={iconForMovimientoTipo(selected.tipo)}
        />
      ) : null}
    </AppPageBody>
  )
}
