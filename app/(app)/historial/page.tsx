'use client'

import { useState } from 'react'

type Tipo = 'deposito' | 'rendimiento' | 'adelanto' | 'retiro' | 'pago'

interface Movimiento {
  id: string
  tipo: Tipo
  monto: number
  fecha: string
  hora: string
  estado: 'completado' | 'pendiente' | 'fallido'
  detalle?: string
}

const movimientos: Movimiento[] = [
  { id: '1', tipo: 'deposito', monto: 8500, fecha: '18 Mar 2026', hora: '10:32', estado: 'completado', detalle: 'Deposito via SPEI desde BBVA' },
  { id: '2', tipo: 'rendimiento', monto: 52.10, fecha: '18 Mar 2026', hora: '10:33', estado: 'completado', detalle: 'Rendimiento CETES acumulado dia 1' },
  { id: '3', tipo: 'rendimiento', monto: 75.33, fecha: '19 Mar 2026', hora: '00:01', estado: 'completado', detalle: 'Rendimiento CETES acumulado dia 2' },
  { id: '4', tipo: 'adelanto', monto: -90.5, fecha: '20 Mar 2026', hora: '09:15', estado: 'completado', detalle: 'Adelanto de rendimiento solicitado' },
  { id: '5', tipo: 'pago', monto: -45, fecha: '20 Mar 2026', hora: '14:22', estado: 'completado', detalle: 'Pago QR en comercio' },
  { id: '6', tipo: 'retiro', monto: -305, fecha: '20 Mar 2026', hora: '17:50', estado: 'pendiente', detalle: 'Retiro a CLABE ...1234 via SPEI' },
]

const tipoConfig: Record<Tipo, { label: string; color: string; icon: React.ReactNode }> = {
  deposito: {
    label: 'Deposito',
    color: 'text-foreground',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  },
  rendimiento: {
    label: 'Rendimiento',
    color: 'text-foreground',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  },
  adelanto: {
    label: 'Adelanto',
    color: 'text-foreground',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 8 12 12 15 14"/></svg>,
  },
  retiro: {
    label: 'Retiro',
    color: 'text-muted-foreground',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 12 19 12"/><polyline points="13 6 19 12 13 18"/></svg>,
  },
  pago: {
    label: 'Pago QR',
    color: 'text-muted-foreground',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  },
}

const filtros = ['Todos', 'Depositos', 'Rendimiento', 'Adelantos', 'Retiros'] as const
type Filtro = typeof filtros[number]

const filtroMap: Record<Filtro, Tipo[] | null> = {
  Todos: null,
  Depositos: ['deposito'],
  Rendimiento: ['rendimiento'],
  Adelantos: ['adelanto'],
  Retiros: ['retiro', 'pago'],
}

function formatMXN(amount: number) {
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(abs)
  return amount < 0 ? `- ${formatted}` : `+ ${formatted}`
}

export default function HistorialPage() {
  const [filtro, setFiltro] = useState<Filtro>('Todos')
  const [selected, setSelected] = useState<Movimiento | null>(null)

  const filtered = filtroMap[filtro]
    ? movimientos.filter((m) => filtroMap[filtro]!.includes(m.tipo))
    : movimientos

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mb-8">
        <h2 className="text-4xl font-black tracking-tight text-foreground">Historial.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Todos tus movimientos en un solo lugar.</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {filtros.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              filtro === f
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-black text-foreground mb-2">Sin movimientos</p>
          <p className="text-sm text-muted-foreground">Aqui apareceran tus transacciones.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mov) => {
            const config = tipoConfig[mov.tipo]
            const esPositivo = mov.monto > 0
            return (
              <button
                key={mov.id}
                onClick={() => setSelected(mov)}
                className="w-full rounded-2xl bg-secondary p-4 flex items-center justify-between hover:bg-secondary/70 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground">
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{mov.fecha} · {mov.hora}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${esPositivo ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {formatMXN(mov.monto)}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${
                    mov.estado === 'completado' ? 'text-muted-foreground' :
                    mov.estado === 'pendiente' ? 'text-foreground' : 'text-destructive'
                  }`}>
                    {mov.estado.charAt(0).toUpperCase() + mov.estado.slice(1)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal detalle */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-card border-t border-border p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
                {tipoConfig[selected.tipo].icon}
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{tipoConfig[selected.tipo].label}</p>
                <p className="text-sm text-muted-foreground">{selected.fecha} a las {selected.hora}</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              <DetailRow label="Monto" value={formatMXN(selected.monto)} />
              <DetailRow label="Estado" value={selected.estado.charAt(0).toUpperCase() + selected.estado.slice(1)} />
              {selected.detalle && <DetailRow label="Detalle" value={selected.detalle} />}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full h-12 rounded-full bg-foreground text-background font-bold text-sm hover:bg-foreground/90"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-sm text-muted-foreground shrink-0">{label}</p>
      <p className="text-sm font-bold text-foreground text-right">{value}</p>
    </div>
  )
}
