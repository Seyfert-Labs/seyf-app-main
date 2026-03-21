'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EtherfuseKycSnapshot } from '@/lib/etherfuse/kyc'
import type { EtherfuseOnboardingSession } from '@/lib/etherfuse/onboarding-session'
import { startHostedEtherfuseOnboarding } from './actions'

function maskPubkey(pk: string) {
  if (pk.length <= 12) return pk
  return `${pk.slice(0, 6)}…${pk.slice(-4)}`
}

function kycLabel(status: EtherfuseKycSnapshot['status']): string {
  switch (status) {
    case 'approved':
    case 'approved_chain_deploying':
      return 'Verificación aprobada'
    case 'proposed':
      return 'En revisión'
    case 'rejected':
      return 'Verificación rechazada'
    case 'not_started':
    default:
      return 'Pendiente: completa el portal de Etherfuse'
  }
}

export default function IdentidadClient({
  initialSession,
  initialKyc,
}: {
  initialSession: EtherfuseOnboardingSession | null
  initialKyc: EtherfuseKycSnapshot | null
}) {
  const router = useRouter()
  const [pubkey, setPubkey] = useState(initialSession?.publicKey ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [refreshing, setRefreshing] = useState(false)

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
            Cliente Etherfuse (UUID):{' '}
            <span className="font-mono">{initialSession.customerId.slice(0, 8)}…</span>
          </p>
          {initialKyc ? (
            <p
              className={`mt-2 text-xs font-semibold ${
                initialKyc.status === 'approved' ||
                initialKyc.status === 'approved_chain_deploying'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : initialKyc.status === 'rejected'
                    ? 'text-destructive'
                    : 'text-foreground'
              }`}
            >
              KYC: {kycLabel(initialKyc.status)}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Estado KYC: aún no disponible o la wallet no está registrada en Etherfuse. Tras volver
              del portal, pulsa «Actualizar estado KYC».
            </p>
          )}
          {initialKyc?.status === 'rejected' && initialKyc.currentRejectionReason && (
            <p className="mt-1 text-xs text-muted-foreground">
              Motivo: {initialKyc.currentRejectionReason}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            La CLABE y datos bancarios se registran dentro del portal seguro (Etherfuse), no en esta
            pantalla.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={refreshing}
              onClick={() => {
                setRefreshing(true)
                router.refresh()
                setTimeout(() => setRefreshing(false), 800)
              }}
            >
              {refreshing ? 'Actualizando…' : 'Actualizar estado KYC'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
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
