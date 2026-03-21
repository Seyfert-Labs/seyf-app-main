'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

const MAX_ADELANTO = 98.5
const COMISION_RATE = 0.08

function formatMXN(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(amount)
}

export default function AdelantoPage() {
  const router = useRouter()
  const [monto, setMonto] = useState(MAX_ADELANTO)
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)

  const comision = parseFloat((monto * COMISION_RATE).toFixed(2))
  const neto = parseFloat((monto - comision).toFixed(2))

  const handleConfirmar = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setExito(true)
    }, 1800)
  }

  if (exito) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-foreground flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-background">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Listo.</h2>
          <p className="mt-3 text-base text-muted-foreground">Tu adelanto esta disponible para gastar.</p>
        </div>

        <div className="w-full max-w-sm rounded-3xl bg-secondary p-6 text-left space-y-3 mb-8">
          <SummaryRow label="Monto adelantado" value={formatMXN(monto)} />
          <SummaryRow label="Comision Seyf" value={formatMXN(comision)} dim />
          <div className="border-t border-border pt-3">
            <SummaryRow label="Recibiste" value={formatMXN(neto)} bold />
          </div>
        </div>

        <Link href="/gastar" className="w-full max-w-sm">
          <Button className="w-full h-14 rounded-full bg-foreground text-background font-bold text-base hover:bg-foreground/90">
            Usar mi adelanto
          </Button>
        </Link>
        <Link href="/dashboard" className="mt-4 block text-sm text-muted-foreground hover:text-foreground">
          Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      {/* Back */}
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span className="text-sm font-medium">Regresar</span>
      </Link>

      <div className="mb-8">
        <h2 className="text-4xl font-black tracking-tight text-foreground leading-none">
          Pedir adelanto<br />de rendimiento.
        </h2>
        <p className="mt-4 text-sm text-muted-foreground font-normal">
          No tocamos tu ahorro. Solo adelantamos parte de lo que ya generaste.
        </p>
      </div>

      {/* Monto selector */}
      <div className="rounded-3xl bg-secondary p-6 mb-6">
        <p className="text-xs text-muted-foreground font-medium mb-1">Monto a adelantar</p>
        <p className="text-5xl font-black tracking-tight text-foreground mb-6">{formatMXN(monto)}</p>
        <Slider
          min={10}
          max={MAX_ADELANTO}
          step={0.5}
          value={[monto]}
          onValueChange={([val]) => setMonto(val)}
          className="w-full"
        />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>$10.00</span>
          <span>Max {formatMXN(MAX_ADELANTO)}</span>
        </div>
      </div>

      {/* Desglose */}
      <div className="rounded-3xl border border-border bg-card p-5 space-y-3 mb-8">
        <SummaryRow label="Monto adelantado" value={formatMXN(monto)} />
        <SummaryRow label="Comision Seyf" value={`- ${formatMXN(comision)}`} dim />
        <div className="border-t border-border pt-3">
          <SummaryRow label="Monto neto a recibir" value={formatMXN(neto)} bold />
        </div>
      </div>

      <Button
        onClick={handleConfirmar}
        disabled={loading}
        className="w-full h-14 rounded-full bg-foreground text-background font-bold text-base hover:bg-foreground/90 transition-all disabled:opacity-60"
      >
        {loading ? 'Procesando...' : 'Confirmar adelanto'}
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground leading-relaxed">
        Solo puedes tener un adelanto activo por ciclo de inversion (28 dias).
      </p>
    </div>
  )
}

function SummaryRow({ label, value, dim, bold }: { label: string; value: string; dim?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <p className={`text-sm ${dim ? 'text-muted-foreground' : 'text-foreground'}`}>{label}</p>
      <p className={`text-sm ${bold ? 'font-black text-foreground' : dim ? 'text-muted-foreground' : 'font-bold text-foreground'}`}>{value}</p>
    </div>
  )
}
