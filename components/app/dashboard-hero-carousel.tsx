'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { animate, motion, useMotionValue } from 'framer-motion'
import { ArrowDownToLine, Clock, Info, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type HeroData = {
  principal: number
  adelantable: number
  puntos: number
  tasaAnual: number
  /** CETES desde Etherfuse /lookup/stablebonds */
  stablebondCetes?: {
    loading: boolean
    annualPercent: number | null
    priceMx: number | null
    calculatedAt?: string
  }
  /** Saldo CETES on-chain + equivalente MXNe (ref. precio stablebond). */
  cetesWallet?: {
    balance: number
    equivMxne: number | null
    priceLoading: boolean
  }
}

const TABS = ['Saldos', 'Adelanto', 'Puntos'] as const
const SLIDE_COUNT = TABS.length

function formatMXNFull(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Separa cuerpo y centavos (locale-safe) para tipografía tipo referencia. */
function splitCurrencyForDisplay(amount: number) {
  const parts = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(amount)
  let main = ''
  let fraction = ''
  let decimalSep = '.'
  for (const p of parts) {
    if (p.type === 'fraction') {
      fraction = p.value
      continue
    }
    if (p.type === 'decimal') {
      decimalSep = p.value
      continue
    }
    main += p.value
  }
  const cents = fraction ? `${decimalSep}${fraction}` : ''
  return { main: main.trim(), cents }
}

const saldosQuickActions = [
  { href: '/anadir', label: 'Depositar', icon: Plus },
  { href: '/retirar', label: 'Transferir', icon: ArrowDownToLine },
  { href: '/historial', label: 'Movimientos', icon: Clock },
  { href: '/identidad', label: 'Verificar', icon: Info },
] as const

function formatPuntos(n: number) {
  return new Intl.NumberFormat('es-MX').format(n)
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.85 }

function formatStablebondUpdatedAt(iso?: string) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return null
  }
}

function formatCetesUnits(n: number) {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(n)
}

export function DashboardHeroCarousel({ data }: { data: HeroData }) {
  const { main: balanceMain, cents: balanceCents } = splitCurrencyForDisplay(data.principal)
  const sb = data.stablebondCetes
  const cw = data.cetesWallet
  const stablebondUpdatedLabel =
    sb && !sb.loading ? formatStablebondUpdatedAt(sb.calculatedAt) : null
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewportW, setViewportW] = useState(0)
  const [index, setIndex] = useState(0)
  const x = useMotionValue(0)
  const indexRef = useRef(0)
  indexRef.current = index

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setViewportW(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (viewportW <= 0) return
    x.set(-indexRef.current * viewportW)
  }, [viewportW, x])

  const snapTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(SLIDE_COUNT - 1, i))
      setIndex(clamped)
      if (viewportW <= 0) return
      animate(x, -clamped * viewportW, spring)
    },
    [viewportW, x],
  )

  const onDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (viewportW <= 0) return
    const current = x.get()
    const projected = current + info.velocity.x * 0.2
    let next = Math.round(-projected / viewportW)
    if (info.offset.x < -56 && info.velocity.x < 80) next = Math.max(next, indexRef.current + 1)
    if (info.offset.x > 56 && info.velocity.x > -80) next = Math.min(next, indexRef.current - 1)
    next = Math.max(0, Math.min(SLIDE_COUNT - 1, next))
    snapTo(next)
  }

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-border">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950/80 via-card to-blue-950/60" />
      <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '48px 48px',
        }}
      />

      <div ref={containerRef} className="relative overflow-hidden">
        <motion.div
          className="flex w-[300%] cursor-grab touch-pan-x active:cursor-grabbing"
          style={{ x }}
          drag="x"
          dragConstraints={
            viewportW > 0
              ? { left: -viewportW * (SLIDE_COUNT - 1), right: 0 }
              : { left: 0, right: 0 }
          }
          dragElastic={{ left: 0.1, right: 0.1 }}
          onDragEnd={onDragEnd}
        >
          <div className="w-1/3 shrink-0 px-4 pb-4 pt-10 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">Saldo disponible</p>
            <div className="mt-1 flex justify-center">
              <p className="inline-flex flex-wrap items-baseline justify-center gap-0.5 leading-none tracking-tight text-foreground">
                <span className="text-[2.35rem] font-black tabular-nums sm:text-[2.65rem]">{balanceMain}</span>
                {balanceCents ? (
                  <span className="text-[1.25rem] font-black tabular-nums text-muted-foreground sm:text-[1.4rem]">
                    {balanceCents}
                  </span>
                ) : null}
              </p>
            </div>

            {sb?.loading ? (
              <div className="mx-auto mt-3 h-5 max-w-[13rem] animate-pulse rounded-md bg-secondary/60 ring-1 ring-border/50" />
            ) : sb && (sb.annualPercent != null || sb.priceMx != null) ? (
              <div className="mx-auto mt-3 flex w-fit max-w-[19rem] items-center gap-1.5 rounded-full border border-border bg-secondary/55 px-3 py-1.5 text-[11px] text-muted-foreground">
                <Info className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2.25} aria-hidden />
                <span className="truncate">
                  Referencia CETES:
                  {sb.annualPercent != null ? ` ${sb.annualPercent.toFixed(2)}% anual` : ''}
                  {sb.priceMx != null
                    ? ` · ${new Intl.NumberFormat('es-MX', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      }).format(sb.priceMx)} MXN/CETES`
                    : ''}
                </span>
                {stablebondUpdatedLabel ? (
                  <span className="hidden shrink-0 text-[10px] text-muted-foreground/80 sm:inline">
                    ({stablebondUpdatedLabel})
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <span>{data.tasaAnual.toFixed(2)}% anual</span>
                <Info className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2.25} aria-hidden />
              </p>
            )}

            {cw && cw.balance > 0 ? (
              <div className="mx-auto mt-4 max-w-[19rem] rounded-xl border border-violet-500/25 bg-violet-500/[0.08] px-3 py-2.5 text-center ring-1 ring-border/50">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  CETES en tu wallet
                </p>
                <p className="mt-1 text-xl font-black tabular-nums leading-tight text-foreground">
                  {formatCetesUnits(cw.balance)}{' '}
                  <span className="text-sm font-bold text-muted-foreground">CETES</span>
                </p>
                {cw.priceLoading ? (
                  <div
                    className="mx-auto mt-2 h-5 max-w-[12rem] animate-pulse rounded-md bg-secondary/70"
                    aria-hidden
                  />
                ) : cw.equivMxne != null ? (
                  <p className="mt-2 text-sm font-bold leading-tight text-emerald-700 dark:text-emerald-200/95">
                    ≈ {formatMXNFull(cw.equivMxne)}{' '}
                    <span className="text-xs font-semibold text-muted-foreground">MXNe</span>
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                    Sin cotización CETES→MXN ahora. Reintenta en un momento.
                  </p>
                )}
                <p className="mt-1.5 text-[9px] leading-tight text-muted-foreground/80">
                  Referencia tipo de cambio Etherfuse (stablebond), no precio de swap on-chain.
                </p>
              </div>
            ) : null}

            <div
              className="mt-6 grid grid-cols-4 gap-x-1 gap-y-2"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {saldosQuickActions.map(({ href, label, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="group flex flex-col items-center gap-2 rounded-xl py-1 transition active:scale-[0.97]"
                  draggable={false}
                >
                  <span className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-secondary/90 ring-1 ring-border transition group-hover:bg-secondary">
                    <Icon className="size-[1.35rem] text-foreground" strokeWidth={2} />
                  </span>
                  <span className="max-w-[4.25rem] text-center text-[10px] font-medium leading-tight text-muted-foreground">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="w-1/3 shrink-0 px-6 pb-2 pt-10 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">Adelanto</p>
            <p className="mt-1 text-[2.75rem] font-black leading-none tracking-tight tabular-nums text-foreground">
              {formatMXNFull(data.adelantable)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Sin usar tu ahorro principal</p>
            <Link
              href="/adelanto"
              className="mt-4 inline-block text-xs font-bold text-foreground underline-offset-4 hover:underline"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              Más información →
            </Link>
          </div>

          <div className="w-1/3 shrink-0 px-6 pb-2 pt-10 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">Seyf Puntos</p>
            <p className="mt-1 text-[2.75rem] font-black leading-none tracking-tight tabular-nums text-foreground">
              {formatPuntos(data.puntos)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Por usar Seyf y referir amigos</p>
            <p className="mt-4 text-xs font-medium text-muted-foreground">Canjes próximamente</p>
          </div>
        </motion.div>
      </div>

      <div className="relative px-4 pb-6">
        <div className="mx-auto flex max-w-[280px] rounded-full bg-secondary/80 p-1 ring-1 ring-border">
          {TABS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => snapTo(i)}
              className={cn(
                'relative flex-1 rounded-full py-2 text-center text-xs font-bold transition-colors duration-200',
                index === i ? 'text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {index === i && (
                <motion.span
                  layoutId="hero-tab-pill"
                  className="absolute inset-0 rounded-full bg-foreground shadow-sm"
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>

        {index === 1 && (
          <div className="mt-4 flex justify-center px-2">
            <Link href="/adelanto" className="w-full max-w-xs">
              <Button className="h-11 w-full rounded-full bg-foreground text-sm font-bold text-background hover:bg-foreground/90">
                Pedir adelanto
              </Button>
            </Link>
          </div>
        )}
        {index === 2 && (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              disabled
              className="rounded-full px-5 py-2 text-sm font-semibold opacity-60 ring-1 ring-border"
            >
              Ver catálogo
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
