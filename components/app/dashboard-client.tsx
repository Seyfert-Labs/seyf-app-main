'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

const mockData = {
  nombre: 'Carlos',
  principal: 8500,
  rendimiento: 127.43,
  adelantable: 98.5,
  saldoGasto: 350,
  tasa: 9.8,
  diasRestantes: 18,
}

function formatMXN(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(amount)
}

export default function DashboardClient() {
  const data = mockData

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">Buenos dias,</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground">{data.nombre}</h1>
        </div>
        <Link href="/ajustes">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {/* Card A — Tu ahorro */}
        <div className="rounded-3xl bg-foreground p-6 text-background">
          <p className="text-sm font-medium opacity-60 mb-1">Tu ahorro</p>
          <p className="text-4xl font-black tracking-tight">{formatMXN(data.principal)}</p>
          <p className="mt-2 text-xs opacity-50 leading-relaxed">
            Capital depositado. Invertido en CETES. Seguro y trabajando por ti.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full bg-background/15 px-3 py-1 text-xs font-bold">
              {data.tasa}% anual
            </span>
            <span className="rounded-full bg-background/15 px-3 py-1 text-xs font-bold">
              {data.diasRestantes} dias restantes
            </span>
          </div>
        </div>

        {/* Card B — Lo que ya ganaste */}
        <div className="rounded-3xl bg-secondary p-6">
          <p className="text-sm font-medium text-muted-foreground mb-1">Lo que ya ganaste</p>
          <p className="text-4xl font-black tracking-tight text-foreground">{formatMXN(data.rendimiento)}</p>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Rendimiento acumulado desde tu deposito. Actualizado al dia de hoy.
          </p>
        </div>

        {/* Card C — Puedes pedir adelantado */}
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground mb-1">Puedes pedir adelantado</p>
          <p className="text-4xl font-black tracking-tight text-foreground">{formatMXN(data.adelantable)}</p>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Sin tocar tu ahorro. Sin deuda. Solo parte de lo que ya generaste.
          </p>
          <Link href="/adelanto" className="mt-4 block">
            <Button className="w-full h-12 rounded-full bg-foreground text-background font-bold text-sm hover:bg-foreground/90 transition-all">
              Pedir adelanto
            </Button>
          </Link>
        </div>
      </div>

      {/* Saldo para gastar */}
      {data.saldoGasto > 0 && (
        <div className="mt-4 rounded-3xl border border-border bg-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Saldo para gastar</p>
            <p className="text-2xl font-black tracking-tight text-foreground">{formatMXN(data.saldoGasto)}</p>
          </div>
          <Link href="/gastar">
            <Button variant="outline" className="rounded-full h-10 px-5 font-bold text-sm border-border hover:bg-secondary">
              Usar ahora
            </Button>
          </Link>
        </div>
      )}

      {/* Quick deposit CTA */}
      <div className="mt-6">
        <Link href="/depositar">
          <Button variant="outline" className="w-full h-12 rounded-full border-border font-bold text-sm hover:bg-secondary transition-all">
            + Depositar mas
          </Button>
        </Link>
      </div>

      {/* KYC Banner */}
      <div className="mt-4 rounded-2xl bg-secondary/80 border border-border p-4 flex items-start gap-3">
        <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Completa tu verificacion</p>
          <p className="text-xs text-muted-foreground mt-0.5">Para depositar hasta $20,000 MXN verifica tu identidad.</p>
          <button className="mt-2 text-xs font-bold text-foreground underline underline-offset-4">Verificar ahora</button>
        </div>
      </div>
    </div>
  )
}
