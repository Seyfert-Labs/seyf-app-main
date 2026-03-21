'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { AppPageBody } from '@/components/app/app-page-body'
import { DashboardHeroCarousel } from '@/components/app/dashboard-hero-carousel'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const mockData = {
  nombre: 'Carlos',
  principal: 8500,
  rendimiento: 127.43,
  adelantable: 98.5,
  saldoGasto: 350,
  tasa: 9.8,
  diasRestantes: 18,
  puntos: 1240,
}

const mockTransactions = [
  {
    id: '1',
    title: 'Oxxo Cel',
    subtitle: 'Hoy · 12:32',
    amount: -323,
    initial: 'OC',
  },
  {
    id: '2',
    title: 'SPEI recibido',
    subtitle: 'Ayer',
    amount: 1500,
    initial: 'S',
  },
  {
    id: '3',
    title: 'Netflix',
    subtitle: '3 feb',
    amount: -199,
    initial: 'N',
  },
]

function formatMXN(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatMXNFull(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function DashboardClient({
  showEtherfuseRampDev = false,
}: {
  showEtherfuseRampDev?: boolean
}) {
  const data = mockData

  return (
    <AppPageBody className="space-y-6 pt-4">
      <DashboardHeroCarousel
        data={{
          principal: data.principal,
          adelantable: data.adelantable,
          puntos: data.puntos,
          tasaAnual: data.tasa,
        }}
      />

      {/* Actividad reciente */}
      <section className="overflow-hidden rounded-[1.5rem] border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">Actividad reciente</h2>
        </div>
        <ul className="divide-y divide-border">
          {mockTransactions.map((tx) => (
            <li key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                {tx.initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{tx.title}</p>
                <p className="text-xs text-muted-foreground">{tx.subtitle}</p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-sm font-bold tabular-nums',
                  tx.amount < 0 ? 'text-foreground' : 'text-[#22C55E]',
                )}
              >
                {tx.amount < 0 ? '' : '+'}
                {formatMXN(tx.amount)}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-2 py-2">
          <Link
            href="/historial"
            className="flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            Ver todo
          </Link>
        </div>
      </section>

      {/* Tarjetas / productos */}
      <section className="rounded-[1.5rem] border border-border bg-card/50 p-4">
        <Link href="/dashboard" className="flex items-center justify-between text-sm font-bold text-foreground">
          <span>Tus productos</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { label: 'Ahorro', sub: formatMXNFull(data.principal), tone: 'from-violet-600/90 to-indigo-800/90' },
            { label: 'Rendimiento', sub: formatMXNFull(data.rendimiento), tone: 'from-zinc-600/90 to-zinc-800/90' },
            { label: 'Adelanto', sub: formatMXNFull(data.adelantable), tone: 'from-slate-600/90 to-slate-800/90' },
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

      {/* Adelanto destacado */}
      <section className="rounded-[1.5rem] border border-border bg-secondary/40 p-5">
        <p className="text-xs font-medium text-muted-foreground">Puedes pedir adelantado</p>
        <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-foreground">
          {formatMXNFull(data.adelantable)}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Sin tocar tu ahorro. Solo parte de lo que ya generaste.
        </p>
        <Link href="/adelanto" className="mt-4 block">
          <Button className="h-12 w-full rounded-full bg-foreground text-base font-bold text-background hover:bg-foreground/90">
            Pedir adelanto
          </Button>
        </Link>
      </section>

      {data.saldoGasto > 0 && (
        <section className="flex items-center justify-between rounded-[1.5rem] border border-border bg-card px-4 py-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Saldo para gastar</p>
            <p className="text-xl font-black tabular-nums text-foreground">{formatMXNFull(data.saldoGasto)}</p>
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
        <section className="rounded-[1.25rem] border border-dashed border-amber-500/25 bg-amber-500/[0.06] p-4">
          <p className="text-xs font-bold text-amber-200/90">Herramienta de desarrollo</p>
          <Link
            href="/dev/etherfuse-ramp"
            className="mt-2 inline-block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Panel rampa Etherfuse (sandbox)
          </Link>
        </section>
      )}

      {/* Verificación */}
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
    </AppPageBody>
  )
}
