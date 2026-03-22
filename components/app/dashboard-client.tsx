'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAccesly } from 'accesly'
import { AppPageBody } from '@/components/app/app-page-body'
import { DashboardHeroCarousel } from '@/components/app/dashboard-hero-carousel'
import { MovementDetailSheet } from '@/components/app/movement-detail-sheet'
import { iconForMovimientoTipo } from '@/components/app/movement-tipo-icons'
import { Button } from '@/components/ui/button'
import { balanceForAssetCode } from '@/lib/seyf/accesly-balances'
import { cetesStablebondDisplayFromRow } from '@/lib/seyf/stablebond-cetes-display'
import type { EtherfuseStablebondInfo } from '@/lib/etherfuse/stablebonds-lookup'
import type { DashboardViewModel } from '@/lib/seyf/dashboard-view-model'
import { formatMovementListSubtitle, type UserMovement } from '@/lib/seyf/user-movements-types'
import { cn } from '@/lib/utils'

function formatMXNFull(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function DashboardClient({
  showEtherfuseRampDev = false,
  vm,
}: {
  showEtherfuseRampDev?: boolean
  vm: DashboardViewModel
}) {
  const { wallet, assetBalances, loading, refreshBalance } = useAccesly()
  const [selected, setSelected] = useState<UserMovement | null>(null)
  const [stablebondCetes, setStablebondCetes] = useState<{
    loading: boolean
    annualPercent: number | null
    priceMx: number | null
    calculatedAt?: string
  }>({ loading: false, annualPercent: null, priceMx: null })

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

  const mxne = useMemo(() => balanceForAssetCode(assetBalances, 'MXNE'), [assetBalances])

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
            Para ver tu saldo MXNe en el tablero, inicia sesión con Accesly desde el inicio.
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
      <DashboardHeroCarousel
        data={{
          principal: mxne,
          adelantable: vm.adelantableMxn,
          puntos: vm.puntos,
          tasaAnual: vm.tasaAnual,
          stablebondCetes,
        }}
      />
      {vm.saldoNote ? (
        <p className="-mt-2 px-1 text-center text-[11px] leading-snug text-muted-foreground">{vm.saldoNote}</p>
      ) : null}

      <section className="overflow-hidden rounded-[1.5rem] border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">Actividad reciente</h2>
        </div>
        <ul className="divide-y divide-border">
          {vm.movementsRecent.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin movimientos. Órdenes Etherfuse e inversiones MVP aparecerán aquí.
            </li>
          ) : (
            vm.movementsRecent.map((mov) => {
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
                      <p className="truncate text-sm font-semibold text-foreground">{mov.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMovementListSubtitle(mov.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-sm font-bold tabular-nums',
                        esPositivo ? 'text-[#22C55E]' : 'text-foreground',
                      )}
                    >
                      {esPositivo ? '+' : ''}
                      {formatMXNFull(Math.abs(mov.monto))}
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

      <section className="rounded-[1.5rem] border border-border bg-card/50 p-4">
        <Link href="/dashboard" className="flex items-center justify-between text-sm font-bold text-foreground">
          <span>Tus productos</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { label: 'Ahorro (MXNe)', sub: formatMXNFull(mxne), tone: 'from-violet-600/90 to-indigo-800/90' },
            { label: 'Rendimiento', sub: formatMXNFull(vm.rendimientoMxn), tone: 'from-zinc-600/90 to-zinc-800/90' },
            { label: 'Adelanto', sub: formatMXNFull(vm.adelantableMxn), tone: 'from-slate-600/90 to-slate-800/90' },
          ].map((card) => (
            <div
              key={card.label}
              className={cn(
                'min-w-[8.5rem] shrink-0 rounded-2xl bg-gradient-to-br p-4 ring-1 ring-border',
                card.tone,
              )}
            >
              <p className="text-[11px] font-medium text-white/80">{card.label}</p>
              <p className="mt-1 text-sm font-black tabular-nums text-white">{card.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-border bg-secondary/40 p-5">
        <p className="text-xs font-medium text-muted-foreground">Puedes pedir adelantado</p>
        <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-foreground">
          {formatMXNFull(vm.adelantableMxn)}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {vm.adelantableMxn > 0
            ? 'Sin tocar tu ahorro. Solo parte de lo que ya generaste.'
            : 'El monto disponible vendrá de tu actividad y rendimientos (API); no está en la wallet on-chain.'}
        </p>
        <Link href="/adelanto" className="mt-4 block">
          <Button className="h-12 w-full rounded-full bg-foreground text-base font-bold text-background hover:bg-foreground/90">
            Pedir adelanto
          </Button>
        </Link>
      </section>

      {vm.saldoGastoMxn > 0 && (
        <section className="flex items-center justify-between rounded-[1.5rem] border border-border bg-card px-4 py-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Saldo para gastar</p>
            <p className="text-xl font-black tabular-nums text-foreground">{formatMXNFull(vm.saldoGastoMxn)}</p>
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
          <p className="text-xs font-bold text-amber-200/90">Herramientas de desarrollo</p>
          <Link
            href="/anadir"
            className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Panel onramp Etherfuse (sandbox)
          </Link>
          <Link
            href="/retirar"
            className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Panel offramp Etherfuse (sandbox)
          </Link>
          <Link
            href="/dev/poc-omnibus"
            className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            PoC ledger omnibus (una wallet, saldos en memoria)
          </Link>
        </section>
      )}

      <section className="flex gap-3 rounded-[1.25rem] border border-amber-500/20 bg-amber-500/[0.07] p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-200">
          <span className="text-sm font-bold">!</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Completa tu verificación</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Para depositar más, verifica tu identidad.
          </p>
          <Link
            href="/identidad"
            className="mt-2 inline-block text-xs font-bold text-amber-200/90 underline-offset-4 hover:underline"
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
