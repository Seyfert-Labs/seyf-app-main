'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const CLABE = '646180157000001234'
const BANCO = 'STP'
const BENEFICIARIO = 'Seyf SAPI de CV'
const REFERENCIA = 'SEYF-00142'

export default function DepositarPage() {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
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
          Depositar<br />via SPEI.
        </h2>
        <p className="mt-4 text-base text-muted-foreground font-normal">
          Haz una transferencia desde tu banco con estos datos. Tu saldo se acreditara en minutos.
        </p>
      </div>

      {/* Datos SPEI */}
      <div className="space-y-3 mb-8">
        <DataRow label="Banco receptor" value={BANCO} />
        <DataRow label="Beneficiario" value={BENEFICIARIO} />

        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">CLABE interbancaria</p>
          <p className="text-xl font-black tracking-widest text-foreground">{CLABE}</p>
          <button
            onClick={() => copy(CLABE, 'clabe')}
            className="mt-3 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition-all hover:bg-foreground/90"
          >
            {copiedField === 'clabe' ? 'Copiado' : 'Copiar CLABE'}
          </button>
        </div>

        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Referencia / Concepto</p>
          <p className="text-xl font-black tracking-widest text-foreground">{REFERENCIA}</p>
          <button
            onClick={() => copy(REFERENCIA, 'ref')}
            className="mt-3 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition-all hover:bg-foreground/90"
          >
            {copiedField === 'ref' ? 'Copiado' : 'Copiar referencia'}
          </button>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="rounded-2xl border border-border p-5 space-y-3 mb-8">
        <p className="text-sm font-bold text-foreground">Como hacer la transferencia</p>
        {[
          'Abre la app de tu banco.',
          'Ve a "Transferir" o "Pagar".',
          'Ingresa la CLABE y la referencia.',
          'El monto minimo es $500 MXN.',
          'Tu saldo aparecera en minutos.',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="h-5 w-5 shrink-0 rounded-full bg-secondary flex items-center justify-center text-xs font-black text-foreground">
              {i + 1}
            </span>
            <p className="text-sm text-muted-foreground">{step}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground leading-relaxed">
        Los depositos SPEI pueden tardar hasta el siguiente dia habil en fines de semana o dias festivos.
      </p>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-base font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}
