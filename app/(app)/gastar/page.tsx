'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SALDO_GASTO = 350

function formatMXN(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(amount)
}

export default function GastarPage() {
  const [modo, setModo] = useState<'menu' | 'qr' | 'retiro' | 'exito'>('menu')
  const [clabe, setClabe] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRetiro = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); setModo('exito') }, 1600)
  }

  if (modo === 'exito') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-foreground flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-background">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-3xl font-black tracking-tight text-foreground mb-3">Retiro en proceso.</h2>
        <p className="text-base text-muted-foreground max-w-xs">
          Tu transferencia SPEI esta en camino. Puede tardar unos minutos en acreditarse.
        </p>
        <Link href="/dashboard" className="mt-8 w-full max-w-sm">
          <Button className="w-full h-14 rounded-full bg-foreground text-background font-bold text-base">
            Volver al inicio
          </Button>
        </Link>
      </div>
    )
  }

  if (modo === 'qr') {
    return (
      <div className="min-h-screen bg-background px-5 py-10 flex flex-col">
        <button onClick={() => setModo('menu')} className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Regresar</span>
        </button>
        <div className="mb-8">
          <h2 className="text-4xl font-black tracking-tight text-foreground leading-none">Pagar<br />con QR.</h2>
          <p className="mt-4 text-sm text-muted-foreground">Escanea el codigo QR del comercio para pagar con tu saldo.</p>
        </div>
        {/* QR Scanner mockup */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative h-64 w-64 rounded-3xl border-2 border-foreground flex items-center justify-center bg-secondary">
            <div className="absolute top-3 left-3 h-6 w-6 border-t-4 border-l-4 border-foreground rounded-tl-lg" />
            <div className="absolute top-3 right-3 h-6 w-6 border-t-4 border-r-4 border-foreground rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 h-6 w-6 border-b-4 border-l-4 border-foreground rounded-bl-lg" />
            <div className="absolute bottom-3 right-3 h-6 w-6 border-b-4 border-r-4 border-foreground rounded-br-lg" />
            <p className="text-xs text-muted-foreground text-center px-8">Apunta la camara al QR del comercio</p>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Saldo disponible: <span className="font-bold text-foreground">{formatMXN(SALDO_GASTO)}</span></p>
        </div>
      </div>
    )
  }

  if (modo === 'retiro') {
    return (
      <div className="min-h-screen bg-background px-5 py-10">
        <button onClick={() => setModo('menu')} className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Regresar</span>
        </button>
        <div className="mb-8">
          <h2 className="text-4xl font-black tracking-tight text-foreground leading-none">Retirar<br />a banco.</h2>
          <p className="mt-4 text-sm text-muted-foreground">Recibe tu saldo en cualquier cuenta bancaria via SPEI.</p>
        </div>

        <div className="rounded-3xl bg-secondary p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Disponible para retirar</p>
            <p className="text-3xl font-black tracking-tight text-foreground">{formatMXN(SALDO_GASTO)}</p>
          </div>
        </div>

        <form onSubmit={handleRetiro} className="space-y-4">
          <Input
            type="text"
            placeholder="CLABE interbancaria (18 digitos)"
            value={clabe}
            onChange={(e) => setClabe(e.target.value)}
            maxLength={18}
            required
            className="h-14 rounded-full bg-secondary px-6 text-base font-medium placeholder:text-muted-foreground border-0 focus-visible:ring-1 focus-visible:ring-foreground"
          />
          <div className="rounded-2xl border border-border p-4 space-y-2">
            <SummaryRow label="Monto a retirar" value={formatMXN(SALDO_GASTO)} />
            <SummaryRow label="Comision SPEI" value="$0.00" dim />
            <div className="border-t border-border pt-2">
              <SummaryRow label="Recibes en tu banco" value={formatMXN(SALDO_GASTO)} bold />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading || clabe.length < 18}
            className="w-full h-14 rounded-full bg-foreground text-background font-bold text-base hover:bg-foreground/90 disabled:opacity-40"
          >
            {loading ? 'Enviando...' : 'Confirmar retiro'}
          </Button>
        </form>
      </div>
    )
  }

  // Menu principal
  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span className="text-sm font-medium">Regresar</span>
      </Link>

      <div className="mb-8">
        <h2 className="text-4xl font-black tracking-tight text-foreground leading-none">
          Usar<br />mi adelanto.
        </h2>
        <p className="mt-4 text-base text-muted-foreground">Elige como quieres usar tu saldo disponible.</p>
      </div>

      {/* Saldo */}
      <div className="rounded-3xl bg-foreground p-6 mb-8 text-background">
        <p className="text-sm font-medium opacity-60 mb-1">Saldo para gastar</p>
        <p className="text-5xl font-black tracking-tight">{formatMXN(SALDO_GASTO)}</p>
      </div>

      {/* Opciones */}
      <div className="space-y-4">
        <button
          onClick={() => setModo('qr')}
          className="w-full rounded-3xl bg-secondary p-6 text-left flex items-center justify-between hover:bg-secondary/80 transition-colors"
        >
          <div>
            <p className="text-lg font-black text-foreground">Pagar con QR</p>
            <p className="text-sm text-muted-foreground mt-1">En comercios que aceptan pagos digitales.</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-foreground flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-background">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3M17 21h3M21 17v3" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => setModo('retiro')}
          className="w-full rounded-3xl bg-secondary p-6 text-left flex items-center justify-between hover:bg-secondary/80 transition-colors"
        >
          <div>
            <p className="text-lg font-black text-foreground">Retirar a banco</p>
            <p className="text-sm text-muted-foreground mt-1">Recibe en tu cuenta bancaria via SPEI.</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-foreground flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-background">
              <polyline points="5 12 19 12" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </div>
        </button>
      </div>
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
