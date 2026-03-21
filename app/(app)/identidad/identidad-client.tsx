'use client'

import { useState, useTransition } from 'react'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EtherfuseOnboardingSession } from '@/lib/etherfuse/onboarding-session'
import { startHostedEtherfuseOnboarding } from './actions'

function maskPubkey(pk: string) {
  if (pk.length <= 12) return pk
  return `${pk.slice(0, 6)}…${pk.slice(-4)}`
}

export default function IdentidadClient({
  initialSession,
}: {
  initialSession: EtherfuseOnboardingSession | null
}) {
  const [pubkey, setPubkey] = useState(initialSession?.publicKey ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await startHostedEtherfuseOnboarding(pubkey)
      if (!res.ok) {
        setError(res.error)
        return
      }
      window.location.assign(res.url)
    })
  }

  return (
    <AppPageBody className="space-y-6 pt-2">
      <AppBackLink href="/dashboard">Inicio</AppBackLink>

      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Verificación de identidad</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Te llevamos al portal seguro de nuestro partner para completar tu identidad y datos bancarios.
          La sesión caduca en unos minutos; si se vence, vuelve aquí y genera un enlace nuevo.
        </p>
      </div>

      {initialSession && (
        <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">Sesión guardada en este dispositivo</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Wallet: {maskPubkey(initialSession.publicKey)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Puedes generar otro enlace con la misma cuenta sin cambiar de dispositivo.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stellar-pk" className="text-sm font-semibold">
            Clave pública Stellar (MXNe / Stablebonds)
          </Label>
          <Input
            id="stellar-pk"
            name="publicKey"
            value={pubkey}
            onChange={(e) => setPubkey(e.target.value)}
            placeholder="G…"
            autoComplete="off"
            spellCheck={false}
            className="h-12 rounded-xl bg-secondary font-mono text-sm"
            required
          />
          <p className="text-xs text-muted-foreground">
            En producción vendrá de la wallet que Seyf cree o vincule por ti; en sandbox puedes usar una
            cuenta de prueba de Stellar.
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending || !pubkey.trim()}
          className="h-12 w-full rounded-full bg-foreground text-base font-bold text-background hover:bg-foreground/90"
        >
          {pending ? 'Generando enlace…' : 'Continuar en portal seguro'}
        </Button>
      </form>
    </AppPageBody>
  )
}
