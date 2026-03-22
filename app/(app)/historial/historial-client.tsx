'use client'

import { useState } from 'react'
import { AppPageBody } from '@/components/app/app-page-body'
import { MovementDetailSheet } from '@/components/app/movement-detail-sheet'
import { iconForMovimientoTipo, labelForMovimientoTipo } from '@/components/app/movement-tipo-icons'
import { cn } from '@/lib/utils'
import type { MovimientoTipo, UserMovement } from '@/lib/seyf/user-movements-types'
import { formatMovementListSubtitle } from '@/lib/seyf/user-movements-types'

const filtros = ['Todos', 'Depósitos', 'Rendimiento', 'Adelantos', 'Retiros'] as const
type Filtro = (typeof filtros)[number]

const filtroMap: Record<Filtro, MovimientoTipo[] | null> = {
  Todos: null,
  Depósitos: ['deposito', 'inversion'],
  Rendimiento: ['rendimiento'],
  Adelantos: ['adelanto'],
  Retiros: ['retiro', 'pago'],
}

function formatMXN(amount: number) {
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(abs)
  return amount < 0 ? `− ${formatted}` : `+ ${formatted}`
}

export default function HistorialClient({ movements }: { movements: UserMovement[] }) {
  const [filtro, setFiltro] = useState<Filtro>('Todos')
  const [selected, setSelected] = useState<UserMovement | null>(null)

  const filtered = filtroMap[filtro]
    ? movements.filter((m) => filtroMap[filtro]!.includes(m.tipo))
    : movements

  return (
    <AppPageBody>
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-foreground leading-none">Historial</h1>
        <p className="mt-4 text-base text-muted-foreground font-normal">
          Movimientos de tu cuenta (ledger MVP y órdenes Etherfuse).
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-border bg-card py-20 text-center">
          <p className="mb-2 text-lg font-black text-foreground">Sin movimientos</p>
          <p className="text-sm text-muted-foreground">
            Completa un onramp o una inversión MVP para ver entradas aquí.
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
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                    {iconForMovimientoTipo(mov.tipo)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{mov.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {labelForMovimientoTipo(mov.tipo)} · {formatMovementListSubtitle(mov.createdAt)}
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
                    {formatMXN(mov.monto)}
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
