'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { AppPageBody } from '@/components/app/app-page-body'
import { AppBackLink } from '@/components/app/app-back-link'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

const MIN_AHORRO = 1_000
const MAX_AHORRO = 250_000
const ADELANTO_FACTOR = 0.75

function formatMXN(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function AdelantoPage() {
  const router = useRouter()
  const [ahorro, setAhorro] = useState(10_000)
  const [tasaAnual, setTasaAnual] = useState(8)
  const [periodoMeses, setPeriodoMeses] = useState(12)
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)

  const { rendimientoEstimado, adelantoInstantaneo, totalEstimadoAlVencimiento, fechaLiberacion } =
    useMemo(() => {
      const rendimiento = ahorro * (tasaAnual / 100) * (periodoMeses / 12)
      const adelanto = rendimiento * ADELANTO_FACTOR
      const totalAlVencimiento = ahorro + rendimiento
      const d = new Date()
      d.setMonth(d.getMonth() + periodoMeses)
      return {
        rendimientoEstimado: rendimiento,
        adelantoInstantaneo: adelanto,
        totalEstimadoAlVencimiento: totalAlVencimiento,
        fechaLiberacion: d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
      }
    }, [ahorro, tasaAnual, periodoMeses])

  const handleConfirmar = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setExito(true)
    }, 1800)
  }

  if (exito) {
    return (
      <AppPageBody className="space-y-6 pt-2">
        <AppBackLink href="/dashboard" />

        <section className="relative overflow-hidden rounded-[1.5rem] border border-emerald-400/30 bg-gradient-to-br from-emerald-800/35 via-teal-900/25 to-card p-5">
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/25 ring-1 ring-emerald-400/40">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-300"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="inline-flex rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-100/90">
              Adelanto activado
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Listo</h2>
            <p className="mt-2 text-sm text-emerald-100/85">Tu adelanto está disponible para gastar.</p>
          </div>
        </section>

        <div className="space-y-3 rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_8px_28px_rgba(0,0,0,0.14)]">
          <SummaryRow label="Capital bloqueado" value={formatMXN(ahorro)} />
          <SummaryRow label="Adelanto recibido hoy" value={formatMXN(adelantoInstantaneo)} bold />
          <div className="border-t border-border pt-3">
            <SummaryRow label="Liberación estimada del capital" value={fechaLiberacion} dim />
          </div>
        </div>

        <Link href="/gastar" className="block">
          <Button className="h-12 w-full rounded-full bg-foreground text-base font-bold text-background shadow-[0_10px_28px_rgba(255,255,255,0.12)] hover:bg-foreground/90">
            Usar mi adelanto
          </Button>
        </Link>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="w-full py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          Volver al inicio
        </button>
      </AppPageBody>
    )
  }

  return (
    <AppPageBody className="space-y-6 pt-2">
      <AppBackLink href="/dashboard" />

      <section className="relative overflow-hidden rounded-[1.5rem] border border-violet-400/25 bg-gradient-to-br from-violet-700/35 via-indigo-700/25 to-sky-700/15 p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-100/90">
            <Sparkles className="size-3 text-violet-200" />
            Adelanto de rendimiento
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Simular y pedir</h1>
          <p className="mt-2 text-sm text-violet-100/80">
            El capital queda bloqueado durante el periodo. Te adelantamos hasta{' '}
            <span className="font-bold text-white">75%</span> del rendimiento estimado.
          </p>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_8px_28px_rgba(0,0,0,0.14)]">
        <p className="text-xs font-medium text-muted-foreground">Capital a bloquear</p>
        <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-foreground">{formatMXN(ahorro)}</p>
        <Slider
          min={MIN_AHORRO}
          max={MAX_AHORRO}
          step={500}
          value={[ahorro]}
          onValueChange={([val]) => setAhorro(val)}
          className="mt-4 w-full [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-foreground"
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{formatMXN(MIN_AHORRO)}</span>
          <span>Máx. {formatMXN(MAX_AHORRO)}</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-[1.25rem] border border-border bg-card/90 p-4 shadow-[0_6px_20px_rgba(0,0,0,0.1)]">
          <p className="text-xs font-medium text-muted-foreground">Tasa anual</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-foreground">{tasaAnual.toFixed(1)}%</p>
          <Slider
            min={4}
            max={15}
            step={0.5}
            value={[tasaAnual]}
            onValueChange={([val]) => setTasaAnual(val)}
            className="mt-3 w-full [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-foreground"
          />
        </section>
        <section className="rounded-[1.25rem] border border-border bg-card/90 p-4 shadow-[0_6px_20px_rgba(0,0,0,0.1)]">
          <p className="text-xs font-medium text-muted-foreground">Plazo</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-foreground">{periodoMeses} meses</p>
          <Slider
            min={3}
            max={24}
            step={1}
            value={[periodoMeses]}
            onValueChange={([val]) => setPeriodoMeses(val)}
            className="mt-3 w-full [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-foreground"
          />
        </section>
      </div>

      <section className="space-y-3 rounded-[1.5rem] border border-border bg-secondary/40 p-5 ring-1 ring-border/80">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Resultado estimado</p>
        <SummaryRow label="Rendimiento del periodo" value={formatMXN(rendimientoEstimado)} />
        <SummaryRow label="Adelanto inmediato (75%)" value={formatMXN(adelantoInstantaneo)} bold />
        <SummaryRow label="Total estimado al vencimiento" value={formatMXN(totalEstimadoAlVencimiento)} dim />
        <div className="border-t border-border pt-3">
          <SummaryRow label="Capital + fecha estimada" value={`${formatMXN(ahorro)} · ${fechaLiberacion}`} bold />
        </div>
      </section>

      <Button
        onClick={handleConfirmar}
        disabled={loading}
        className="h-12 w-full rounded-full bg-foreground text-base font-bold text-background shadow-[0_10px_28px_rgba(255,255,255,0.12)] hover:bg-foreground/90 disabled:opacity-60"
      >
        {loading ? 'Procesando…' : 'Confirmar adelanto'}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Si liquidas el adelanto antes, puedes liberar capital anticipadamente. Montos referenciales según
        simulación.
      </p>
    </AppPageBody>
  )
}

function SummaryRow({
  label,
  value,
  dim,
  bold,
}: {
  label: string
  value: string
  dim?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className={cn('text-sm', dim ? 'text-muted-foreground' : 'text-muted-foreground/90')}>{label}</p>
      <p
        className={cn(
          'max-w-[58%] text-right text-sm tabular-nums',
          bold ? 'font-bold text-foreground' : dim ? 'text-muted-foreground' : 'font-semibold text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  )
}
