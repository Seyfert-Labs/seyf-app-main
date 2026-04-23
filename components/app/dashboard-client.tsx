'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Eye, EyeOff, TrendingUp, Wallet, Zap } from 'lucide-react'
import { useSeyfWallet } from '@/lib/seyf/use-seyf-wallet'
import { AppPageBody } from '@/components/app/app-page-body'
import { DashboardHeroCarousel } from '@/components/app/dashboard-hero-carousel'
import { MovementDetailSheet } from '@/components/app/movement-detail-sheet'
import { iconForMovimientoTipo } from '@/components/app/movement-tipo-icons'
import { Button } from '@/components/ui/button'
import { balanceForAssetCode } from '@/lib/seyf/accesly-balances'
import { cetesBalanceEquivMxne } from '@/lib/seyf/cetes-mxne-equiv'
import { cetesStablebondDisplayFromRow } from '@/lib/seyf/stablebond-cetes-display'
import type { EtherfuseStablebondInfo } from '@/lib/etherfuse/stablebonds-lookup'
import {
  DASHBOARD_POLL_EXTRA_DELAYS_MS,
  DASHBOARD_POLL_MS,
} from '@/lib/seyf/balance-poll-intervals'
import { POLL_FETCH_INIT, pollBustUrl } from '@/lib/seyf/poll-fetch'
import {
  DASHBOARD_MOVEMENTS_PREVIEW_LIMIT,
  type DashboardViewModel,
} from '@/lib/seyf/dashboard-view-model-types'
import { formatMovementListSubtitle, type UserMovement } from '@/lib/seyf/user-movements-types'
import { cn } from '@/lib/utils'

function formatMXNFull(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Fila «Lo último»: MXN vs cantidad on-chain. */
function formatLoUltimoMonto(mov: UserMovement): string {
  const code = mov.chainAssetCode?.trim()
  const sign = mov.monto < 0 ? '− ' : mov.monto > 0 ? '+' : ''
  if (code) {
    const abs = Math.abs(mov.monto)
    const n = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 7 }).format(abs)
    return `${sign}${n} ${code}`
  }
  return `${sign}${formatMXNFull(Math.abs(mov.monto))}`
}

function formatMontoOculto() {
  return '••••'
}

function movementEstadoBadgeClass(estado: UserMovement['estado']): string {
  if (estado === 'completado') return 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300'
  if (estado === 'fallido') return 'bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-300'
  return 'bg-amber-500/15 text-amber-700 ring-amber-500/25 dark:text-amber-200'
}

function formatMovementMeta(mov: UserMovement): string {
  const d = new Date(mov.createdAt)
  const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const red =
    mov.source === 'stellar'
      ? mov.stellarNetwork === 'mainnet'
        ? 'Mainnet'
        : 'Testnet'
      : null
  return [hora, red].filter(Boolean).join(' · ')
}

export default function DashboardClient({
  showEtherfuseRampDev = false,
  vm,
}: {
  showEtherfuseRampDev?: boolean
  vm: DashboardViewModel
}) {
  const { wallet, assetBalances, loading, refreshBalance } = useSeyfWallet()
  const [selected, setSelected] = useState<UserMovement | null>(null)
  const [liveVm, setLiveVm] = useState(vm)
  const [hideBalances, setHideBalances] = useState(false)
  const [lastUpdateAt, setLastUpdateAt] = useState<Date>(new Date())
  const [stablebondCetes, setStablebondCetes] = useState<{
    loading: boolean
    annualPercent: number | null
    priceMx: number | null
    calculatedAt?: string
  }>({ loading: false, annualPercent: null, priceMx: null })
  const [stellarMovements, setStellarMovements] = useState<UserMovement[]>([])

  useEffect(() => {
    setLiveVm(vm)
    setLastUpdateAt(new Date())
  }, [vm])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('seyf-hide-balances')
      setHideBalances(raw === '1')
    } catch {}
  }, [])

  useEffect(() => {
    if (wallet?.stellarAddress) void refreshBalance()
  }, [wallet?.stellarAddress, refreshBalance])

  useEffect(() => {
    if (!wallet) {
      setStablebondCetes({
        loading: false,
        annualPercent: null,
        priceMx: null,
      })
      return
    }
    let cancelled = false
    setStablebondCetes((s) => ({ ...s, loading: true }))
    void fetch('/api/seyf/etherfuse/lookup/stablebonds?cetesOnly=1')
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as {
          cetes?: EtherfuseStablebondInfo | null
          calculatedAt?: string
          error?: string
        }
        if (cancelled) return
        if (!r.ok) {
          setStablebondCetes({
            loading: false,
            annualPercent: null,
            priceMx: null,
          })
          return
        }
        const parsed = cetesStablebondDisplayFromRow(data.cetes ?? null)
        setStablebondCetes({
          loading: false,
          annualPercent: parsed.annualPercent,
          priceMx: parsed.priceMx,
          calculatedAt: data.calculatedAt,
        })
      })
      .catch(() => {
        if (cancelled) return
        setStablebondCetes({
          loading: false,
          annualPercent: null,
          priceMx: null,
        })
      })
    return () => {
      cancelled = true
    }
  }, [wallet?.stellarAddress])

  useEffect(() => {
    const addr = wallet?.stellarAddress?.trim()
    if (!addr) {
      setStellarMovements([])
      return
    }
    let cancelled = false
    void fetch(`/api/seyf/stellar-movements?account=${encodeURIComponent(addr)}`)
      .then(async (r) => {
        if (!r.ok) return [] as UserMovement[]
        const data = (await r.json()) as unknown
        if (!Array.isArray(data)) return []
        return data as UserMovement[]
      })
      .then((rows) => {
        if (!cancelled) setStellarMovements(rows)
      })
      .catch(() => {
        if (!cancelled) setStellarMovements([])
      })
    return () => {
      cancelled = true
    }
  }, [wallet?.stellarAddress])

  const loUltimoMovements = useMemo(() => {
    const byId = new Map<string, UserMovement>()
    for (const m of liveVm.movementsRecent) byId.set(m.id, m)
    for (const m of stellarMovements) byId.set(m.id, m)
    const merged = [...byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return merged.slice(0, DASHBOARD_MOVEMENTS_PREVIEW_LIMIT)
  }, [liveVm.movementsRecent, stellarMovements])

  const refreshDashboard = useCallback(async () => {
    try {
      const r = await fetch(pollBustUrl('/api/seyf/dashboard'), POLL_FETCH_INIT)
      if (!r.ok) return
      const next = (await r.json()) as DashboardViewModel
      setLiveVm(next)
      setLastUpdateAt(new Date())
    } catch {
      /* mantener último valor válido */
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (document.visibilityState !== 'visible') return
      void refreshDashboard()
    }
    tick()
    const extraTimers = DASHBOARD_POLL_EXTRA_DELAYS_MS.map((ms) => setTimeout(tick, ms))
    const id = setInterval(tick, DASHBOARD_POLL_MS)
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
  }, [refreshDashboard])

  useEffect(() => {
    if (!selected) return
    const next = liveVm.movementsRecent.find((m) => m.id === selected.id)
    if (next) setSelected(next)
  }, [liveVm.movementsRecent, selected])

  const mxne = useMemo(() => balanceForAssetCode(assetBalances, 'MXNE'), [assetBalances])
  const cetesBalance = useMemo(() => balanceForAssetCode(assetBalances, 'CETES'), [assetBalances])
  const cetesEquivMxne = useMemo(
    () => cetesBalanceEquivMxne(cetesBalance, stablebondCetes.priceMx),
    [cetesBalance, stablebondCetes.priceMx],
  )

  if (loading && !wallet) {
    return (
      <AppPageBody className="space-y-6 pt-4">
        <div className="h-[22rem] animate-pulse rounded-[1.75rem] border border-border bg-secondary/40" />
        <div className="h-48 animate-pulse rounded-[1.5rem] border border-border bg-secondary/30" />
      </AppPageBody>
    )
  }

  if (!wallet) {
    return (
      <AppPageBody className="space-y-4 pt-4">
        <div className="rounded-[1.5rem] border border-border bg-card px-5 py-8 text-center">
          <p className="text-sm font-bold text-foreground">Conecta tu wallet</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Para ver tu saldo MXNe en el tablero, inicia sesión con Pollar desde el inicio.
          </p>
          <Button asChild className="mt-6 h-11 w-full max-w-xs rounded-full font-bold">
            <Link href="/">Ir a conectar</Link>
          </Button>
        </div>
      </AppPageBody>
    )
  }

  return (
    <AppPageBody className="space-y-6 pt-4">
      <section className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">Cuenta principal</p>
          <p className="text-[11px] text-muted-foreground">
            Última actualización{' '}
            {lastUpdateAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-full border-border bg-transparent px-3 text-xs font-semibold"
          onClick={() => {
            setHideBalances((prev) => {
              const next = !prev
              try {
                window.localStorage.setItem('seyf-hide-balances', next ? '1' : '0')
              } catch {}
              return next
            })
          }}
        >
          {hideBalances ? <Eye className="mr-1.5 size-4" /> : <EyeOff className="mr-1.5 size-4" />}
          {hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}
        </Button>
      </section>

      <div className="relative">
        <DashboardHeroCarousel
          data={{
            principal: hideBalances ? 0 : mxne,
            adelantable: hideBalances ? 0 : liveVm.adelantableMxn,
            puntos: liveVm.puntos,
            tasaAnual: liveVm.tasaAnual,
            stablebondCetes,
            cetesWallet: {
              balance: hideBalances ? 0 : cetesBalance,
              equivMxne: hideBalances ? null : cetesEquivMxne,
              priceLoading: stablebondCetes.loading,
            },
          }}
        />
        {hideBalances ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-[1.75rem] bg-background/35 backdrop-blur-[2px]">
            <span className="rounded-full border border-border bg-card/90 px-3 py-1 text-xs font-bold text-foreground">
              Saldos ocultos
            </span>
          </div>
        ) : null}
      </div>
      {liveVm.saldoNote ? (
        <p className="-mt-2 px-1 text-center text-[11px] leading-snug text-muted-foreground">
          {liveVm.saldoNote}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[1.5rem] border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">Lo último</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Últimos {DASHBOARD_MOVEMENTS_PREVIEW_LIMIT} movimientos de tu cuenta · toca para ver
            detalle
          </p>
        </div>
        <ul className="divide-y divide-border">
          {loUltimoMovements.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aquí aparecerán depósitos, retiros, transferencias en Stellar y demás movimientos.
            </li>
          ) : (
            loUltimoMovements.map((mov) => {
              const esPositivo = mov.monto >= 0
              return (
                <li key={mov.id} className="px-2">
                  <button
                    type="button"
                    onClick={() => setSelected(mov)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-3.5 text-left transition hover:bg-secondary/80"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                      {iconForMovimientoTipo(mov.tipo)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{mov.titulo}</p>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ring-1',
                            movementEstadoBadgeClass(mov.estado),
                          )}
                        >
                          {mov.estado}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatMovementListSubtitle(mov.createdAt)} · {formatMovementMeta(mov)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'max-w-[42%] shrink-0 text-right text-sm font-bold tabular-nums',
                        esPositivo ? 'text-[#22C55E]' : 'text-foreground',
                      )}
                    >
                      {hideBalances ? formatMontoOculto() : formatLoUltimoMonto(mov)}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
        <div className="border-t border-border px-2 py-2">
          <Link
            href="/historial"
            className="flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            Ver historial
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.5rem] border border-border bg-card">
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative space-y-4 p-4">
          <Link
            href="/historial"
            className="flex items-center justify-between rounded-xl py-1 transition hover:opacity-90"
          >
            <div>
              <p className="text-sm font-bold text-foreground">Resumen visual</p>
              <p className="text-[11px] text-muted-foreground">Ver detalle en historial</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary ring-1 ring-border">
              <ChevronRight className="size-4 text-foreground" />
            </span>
          </Link>

          <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.14] via-indigo-500/[0.1] to-card p-4 shadow-inner ring-1 ring-violet-500/10 dark:border-white/10 dark:from-violet-600/25 dark:via-indigo-900/20">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/80 ring-1 ring-border backdrop-blur-sm dark:bg-white/10 dark:ring-white/10">
                <Wallet className="size-6 text-violet-600 dark:text-violet-100" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200/90">
                  Saldo MXNe
                </p>
                <p className="mt-0.5 text-2xl font-black tabular-nums tracking-tight text-foreground dark:text-white">
                  {hideBalances ? formatMontoOculto() : formatMXNFull(mxne)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground dark:text-violet-100/75">Tu posición principal</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-secondary/60 p-3.5 ring-1 ring-border/60">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/5">
                <TrendingUp className="size-4 text-foreground" strokeWidth={2.25} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Rendimiento
              </p>
              <p className="mt-1 text-base font-black tabular-nums text-foreground">
                {hideBalances ? formatMontoOculto() : formatMXNFull(liveVm.rendimientoMxn)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/60 p-3.5 ring-1 ring-border/60">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/5">
                <Zap className="size-4 text-amber-600 dark:text-amber-200/90" strokeWidth={2.25} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Adelanto
              </p>
              <p className="mt-1 text-base font-black tabular-nums text-foreground">
                {hideBalances ? formatMontoOculto() : formatMXNFull(liveVm.adelantableMxn)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.6rem] border border-violet-500/20 bg-gradient-to-br from-violet-100 via-indigo-100 to-sky-100 p-5 shadow-[0_16px_45px_rgba(76,29,149,0.16)] dark:border-violet-400/25 dark:from-violet-700/35 dark:via-indigo-700/25 dark:to-sky-700/20 dark:shadow-[0_16px_45px_rgba(76,29,149,0.35)]">
        <div className="pointer-events-none absolute -right-14 -top-20 h-44 w-44 rounded-full bg-violet-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center rounded-full border border-violet-500/20 bg-background/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700 dark:border-violet-200/25 dark:bg-black/20 dark:text-violet-100/90">
            Adelanto disponible
          </div>
          <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-foreground dark:text-white">
          {hideBalances ? formatMontoOculto() : formatMXNFull(liveVm.adelantableMxn)}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground dark:text-violet-100/80">
            Recibe parte de tu rendimiento hoy, sin retirar tu ahorro.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Sin papeleo', value: '100%' },
              { label: 'Respuesta', value: 'Inmediata' },
              { label: 'Plazo', value: '12 meses' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-violet-500/15 bg-background/55 px-2.5 py-2 text-center backdrop-blur-[2px] dark:border-white/15 dark:bg-black/20"
              >
                <p className="text-[10px] text-muted-foreground dark:text-violet-100/75">{item.label}</p>
                <p className="mt-0.5 text-[11px] font-bold text-foreground dark:text-white">{item.value}</p>
              </div>
            ))}
          </div>
          <Link href="/adelanto" className="mt-4 block">
            <Button className="h-12 w-full rounded-full text-base font-black">
              Pedir adelanto
            </Button>
          </Link>
          <p className="mt-2 text-center text-[11px] text-muted-foreground dark:text-violet-100/70">
            Simula monto, tasa y plazo en el siguiente paso.
          </p>
        </div>
      </section>

      {liveVm.saldoGastoMxn > 0 && (
        <section className="flex items-center justify-between rounded-[1.5rem] border border-border bg-card px-4 py-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Saldo para gastar</p>
            <p className="text-xl font-black tabular-nums text-foreground">
              {hideBalances ? formatMontoOculto() : formatMXNFull(liveVm.saldoGastoMxn)}
            </p>
          </div>
          <Link href="/gastar">
            <Button
              variant="outline"
              className="h-10 rounded-full border-border bg-transparent px-5 font-semibold text-foreground hover:bg-secondary"
            >
              Usar
            </Button>
          </Link>
        </section>
      )}

      {showEtherfuseRampDev && (
        <section className="rounded-[1.25rem] border border-dashed border-amber-500/25 bg-amber-500/[0.06] p-4 space-y-2">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-200/90">Solo desarrollo</p>
          <Link
            href="/anadir"
            className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Probar depósito (sandbox)
          </Link>
          <Link
            href="/retirar"
            className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Probar retiro (sandbox)
          </Link>
          <Link
            href="/dev/poc-omnibus"
            className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Wallet de prueba
          </Link>
        </section>
      )}

      <section className="flex gap-3 rounded-[1.25rem] border border-amber-500/20 bg-amber-500/[0.07] p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-200">
          <span className="text-sm font-bold">!</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Verifica tu identidad</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Así podrás depositar más y ver tu saldo completo.
          </p>
          <Link
            href="/identidad"
            className="mt-2 inline-block text-xs font-bold text-amber-700 underline-offset-4 hover:underline dark:text-amber-200/90"
          >
            Verificar ahora
          </Link>
        </div>
      </section>

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
