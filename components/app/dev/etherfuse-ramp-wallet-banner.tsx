'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSeyfErrorDisplayMessage } from '@/lib/seyf/read-client-api-error'

type RampContextPayload = {
  publicKey: string
  customerId: string
  bankAccountId: string
  source: 'cookie' | 'mvp_env'
  cryptoWalletId: string | null
  cryptoWalletResolved: boolean
  cryptoWalletResolveFailed?: boolean
}

/**
 * Muestra la cuenta que usa la API para depósitos/retiros y el id resuelto en Etherfuse.
 */
export function EtherfuseRampWalletBanner({
  variant = 'amber',
}: {
  variant?: 'amber' | 'violet'
}) {
  const [data, setData] = useState<RampContextPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/seyf/etherfuse/ramp-context')
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as Partial<RampContextPayload> & Record<string, unknown>
        if (!r.ok) {
          throw new Error(getSeyfErrorDisplayMessage(j, 'No se pudo cargar el contexto de rampa.'))
        }
        if (!cancelled) setData(j as RampContextPayload)
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const border =
    variant === 'violet'
      ? 'border-violet-500/30 bg-violet-500/[0.06]'
      : 'border-amber-500/30 bg-amber-500/[0.06]'
  const title =
    variant === 'violet' ? 'text-violet-200/90' : 'text-amber-200/90'

  if (loading) {
    return (
      <div className={`mb-6 rounded-[1.25rem] border border-dashed ${border} p-4`}>
        <p className={`text-xs font-bold ${title}`}>Cuenta de operaciones</p>
        <p className="mt-2 text-xs text-muted-foreground">Cargando…</p>
      </div>
    )
  }

  if (err) {
    return (
      <div className={`mb-6 rounded-[1.25rem] border border-dashed ${border} p-4`}>
        <p className={`text-xs font-bold ${title}`}>Cuenta de operaciones</p>
        <p className="mt-2 text-xs text-destructive">{err}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Configura la sesión en{' '}
          <Link href="/identidad" className="font-semibold text-foreground underline-offset-2 hover:underline">
            /identidad
          </Link>{' '}
          o variables <span className="font-mono">ETHERFUSE_MVP_*</span> en desarrollo.
        </p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className={`mb-6 rounded-[1.25rem] border border-dashed ${border} p-4 space-y-2`}>
      <p className={`text-xs font-bold ${title}`}>Cuenta vinculada a esta sesión</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Los depósitos y retiros usan la clave que guardaste en{' '}
        <Link href="/identidad" className="font-semibold text-foreground underline-offset-2 hover:underline">
          /identidad
        </Link>{' '}
        o, si no hay cookie, la del entorno de prueba (<span className="font-mono">.env</span>). En{' '}
        <a
          href="https://devnet.etherfuse.com/ramp"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-foreground underline-offset-2 hover:underline"
        >
          el portal de Etherfuse (prueba)
        </a>{' '}
        conecta la misma cuenta al autorizar; si usas otra, la operación no cuadrará.
      </p>
      <div className="rounded-[0.75rem] border border-border/60 bg-background/50 px-3 py-2 text-[11px] leading-relaxed">
        <p>
          <span className="text-muted-foreground">Origen:</span>{' '}
          <span className="font-mono text-foreground">
            {data.source === 'cookie' ? 'cookie /identidad' : 'ETHERFUSE_MVP_* (dev)'}
          </span>
        </p>
        <p className="mt-1 break-all">
          <span className="text-muted-foreground">Clave pública:</span>{' '}
          <span className="font-mono text-foreground">{data.publicKey}</span>
        </p>
        <p className="mt-1">
          <span className="text-muted-foreground">ID en Etherfuse:</span>{' '}
          {data.cryptoWalletResolved && data.cryptoWalletId ? (
            <span className="font-mono text-emerald-600">{data.cryptoWalletId}</span>
          ) : (
            <span className="text-amber-600">
              pendiente — puede fallar el paso de autorización.{' '}
              {data.cryptoWalletResolveFailed ? (
                <span className="block mt-1 text-[10px] opacity-90">
                  No pudimos obtener el ID de wallet en Etherfuse. Comprueba que la clave esté registrada en el
                  portal de prueba.
                </span>
              ) : null}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
