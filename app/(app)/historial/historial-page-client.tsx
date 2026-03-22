'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAccesly } from 'accesly'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import {
  type ChainMovement,
  fetchChainMovements,
  horizonNetworkFromEnv,
  stellarExpertTxUrl,
} from '@/lib/seyf/horizon-payments'
import { cn } from '@/lib/utils'

type Filtro = (typeof filtros)[number]
const filtros = ['Todas', 'Entradas', 'Salidas'] as const

const tipoConfig = {
  entrada: {
    label: 'Entrada',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  salida: {
    label: 'Salida',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="5 12 19 12" />
        <polyline points="11 6 5 12 11 18" />
      </svg>
    ),
  },
} as const

function formatMovementAmount(mov: ChainMovement): string {
  const { amount, assetCode, tipoUi } = mov
  const sign = tipoUi === 'entrada' ? '+' : '−'
  if (assetCode === 'XLM') {
    const body = new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 7,
    }).format(amount)
    return `${sign} ${body} XLM`
  }
  if (assetCode.toUpperCase() === 'MXNE') {
    const cur = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount)
    return `${sign} ${cur}`
  }
  const body = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  }).format(amount)
  return `${sign} ${body} ${assetCode}`
}

function movementMatchesFiltro(m: ChainMovement, filtro: Filtro): boolean {
  if (filtro === 'Todas') return true
  if (filtro === 'Entradas') return m.tipoUi === 'entrada'
  if (filtro === 'Salidas') return m.tipoUi === 'salida'
  return true
}

function formatFechaHora(iso: string): { fecha: string; hora: string } {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return { fecha: iso, hora: '' }
    return {
      fecha: new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(d),
      hora: new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' }).format(d),
    }
  } catch {
    return { fecha: iso, hora: '' }
  }
}

export default function HistorialPageClient() {
  const { wallet, loading: walletLoading } = useAccesly()
  const network = useMemo(() => horizonNetworkFromEnv(), [])

  const [items, setItems] = useState<ChainMovement[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('Todas')
  const [selected, setSelected] = useState<ChainMovement | null>(null)

  const load = useCallback(
    async (cursor?: string | null) => {
      if (!wallet?.stellarAddress) return
      const isMore = Boolean(cursor)
      if (isMore) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const { movements, nextCursor: next } = await fetchChainMovements(
          wallet.stellarAddress,
          network,
          { cursor: cursor ?? undefined, limit: 30 },
        )
        setItems((prev) => (isMore ? [...prev, ...movements] : movements))
        setNextCursor(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar Horizon')
        if (!isMore) setItems([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [wallet?.stellarAddress, network],
  )

  useEffect(() => {
    if (!wallet?.stellarAddress) {
      setItems([])
      setNextCursor(null)
      setError(null)
      return
    }
    void load(null)
  }, [wallet?.stellarAddress, load])

  const filtered = useMemo(
    () => items.filter((m) => movementMatchesFiltro(m, filtro)),
    [items, filtro],
  )

  if (walletLoading && !wallet) {
    return (
      <AppPageBody>
        <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-secondary" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[4.5rem] animate-pulse rounded-[1.25rem] border border-border bg-secondary/40" />
          ))}
        </div>
      </AppPageBody>
    )
  }

  if (!wallet) {
    return (
      <AppPageBody>
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-foreground leading-none">Historial</h1>
          <p className="mt-4 text-base text-muted-foreground font-normal">
            Conecta tu wallet para ver pagos en Stellar (Horizon).
          </p>
        </div>
        <Button asChild className="h-11 rounded-full font-bold">
          <Link href="/">Ir a conectar</Link>
        </Button>
      </AppPageBody>
    )
  }

  return (
    <AppPageBody>
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-foreground leading-none">Historial</h1>
        <p className="mt-4 text-base text-muted-foreground font-normal">
          Pagos y fondeos on-chain vía Horizon ({network}). No incluye SPEI/Etherfuse hasta integrar API.
        </p>
      </div>

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
          <Button type="button" variant="outline" size="sm" className="mt-2 rounded-full" onClick={() => void load(null)}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[4.5rem] animate-pulse rounded-[1.25rem] border border-border bg-secondary/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-border bg-card py-20 text-center">
          <p className="mb-2 text-lg font-black text-foreground">Sin movimientos</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            No hay pagos que coincidan con el filtro, o la cuenta aún no tiene operaciones en esta red.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((mov) => {
            const config = tipoConfig[mov.tipoUi]
            const esPositivo = mov.tipoUi === 'entrada'
            const { fecha, hora } = formatFechaHora(mov.at)
            return (
              <button
                key={mov.id}
                type="button"
                onClick={() => setSelected(mov)}
                className="flex w-full items-center justify-between rounded-[1.25rem] border border-border bg-card p-4 text-left transition hover:bg-secondary/80"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                    {config.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {config.label} · {mov.assetCode}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fecha}
                      {hora ? ` · ${hora}` : ''}
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
                    {formatMovementAmount(mov)}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">Completado</p>
                </div>
              </button>
            )
          })}
          {nextCursor ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-4 h-11 w-full rounded-full font-bold ring-1 ring-border"
              disabled={loadingMore}
              onClick={() => void load(nextCursor)}
            >
              {loadingMore ? 'Cargando…' : 'Cargar más'}
            </Button>
          ) : null}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelected(null)}
          onKeyDown={(e) => e.key === 'Escape' && setSelected(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-t-[1.75rem] border border-border border-b-0 bg-popover p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground">
                {tipoConfig[selected.tipoUi].icon}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-foreground">
                  {tipoConfig[selected.tipoUi].label} · {selected.assetCode}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const { fecha, hora } = formatFechaHora(selected.at)
                    return hora ? `${fecha} · ${hora}` : fecha
                  })()}
                </p>
              </div>
            </div>
            <div className="mb-6 space-y-3">
              <DetailRow label="Monto" value={formatMovementAmount(selected)} />
              <DetailRow label="Operación" value={selected.opType} />
              <DetailRow label="Contraparte" value={selected.counterparty} />
              <DetailRow label="Detalle" value={selected.detail} />
              <DetailRow label="Red" value={network} />
              {selected.txHash ? (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">Transacción</p>
                  <a
                    href={stellarExpertTxUrl(network, selected.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    Ver en StellarExpert ↗
                  </a>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="h-12 w-full rounded-full bg-foreground text-sm font-bold text-background hover:bg-foreground/90"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </AppPageBody>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="shrink-0 text-sm text-muted-foreground">{label}</p>
      <p className="text-right text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
