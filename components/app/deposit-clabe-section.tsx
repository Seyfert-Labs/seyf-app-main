'use client'

import { useEffect, useState } from 'react'
import { Copy, CheckCheck, RefreshCw, ShieldCheck, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSeyfWallet } from '@/lib/seyf/use-seyf-wallet'
import { cn } from '@/lib/utils'

type DepositInfo = {
  ok: boolean
  hasContext: boolean
  kycStatus: string | null
  kycReady: boolean
  etherfuseDepositClabe: string | null
  bankAccountStatus: string | null
}

export default function DepositClabeSection() {
  const { wallet } = useSeyfWallet()
  const [info, setInfo] = useState<DepositInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const walletAddr = wallet?.stellarAddress?.trim() ?? ''

  const fetchInfo = async () => {
    setLoading(true)
    try {
      const url = walletAddr
        ? `/api/seyf/etherfuse/deposit-info?wallet=${encodeURIComponent(walletAddr)}`
        : '/api/seyf/etherfuse/deposit-info'
      const res = await fetch(url)
      const data = (await res.json()) as DepositInfo
      setInfo(data)
    } catch {
      // silencioso — no bloquear el ramp
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddr])

  const handleActivar = async () => {
    setActivating(true)
    setError(null)
    try {
      // Re-fetch para ver si el KYC submit ya creó la cuenta bancaria
      await fetchInfo()
      // Si sigue sin CLABE esperar un momento y reintentar
      if (!info?.etherfuseDepositClabe) {
        await new Promise((r) => setTimeout(r, 1500))
        await fetchInfo()
      }
    } catch {
      setError('Error al activar la cuenta. Intenta de nuevo.')
    } finally {
      setActivating(false)
    }
  }

  const copyClabe = async () => {
    if (!info?.etherfuseDepositClabe) return
    await navigator.clipboard.writeText(info.etherfuseDepositClabe)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Sección colapsada: no mostrar si no hay contexto o aún cargando la primera vez
  if (loading) return null
  if (!info?.hasContext) return null

  const kycReady = info.kycReady
  const kycStatus = info.kycStatus

  return (
    <div className="px-4 pt-4 pb-0">
      <div className="rounded-[1.25rem] border border-border bg-card p-4 shadow-[0_4px_20px_rgba(0,0,0,0.12)] space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full',
              kycReady ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400',
            )}
          >
            {kycReady ? <ShieldCheck className="size-4" /> : kycStatus === 'rejected' ? <AlertCircle className="size-4 text-rose-400" /> : <Clock className="size-4" />}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Cuenta CLABE de depósito (SPEI)</p>
            <p className="text-[11px] text-muted-foreground">
              {kycReady
                ? 'Envía MXN a esta CLABE para agregar fondos'
                : kycStatus === 'rejected'
                  ? 'KYC rechazado — ve a /identidad'
                  : 'KYC en revisión — disponible al aprobarse'}
            </p>
          </div>
        </div>

        {/* CLABE o botón */}
        {kycReady && (
          <>
            {info.etherfuseDepositClabe ? (
              <button
                type="button"
                onClick={() => void copyClabe()}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/60 px-4 py-2.5 transition hover:bg-secondary active:scale-[0.98]"
              >
                <span className="font-mono text-sm font-bold tracking-widest text-foreground">
                  {info.etherfuseDepositClabe}
                </span>
                {copied ? (
                  <CheckCheck className="size-4 shrink-0 text-emerald-400" />
                ) : (
                  <Copy className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            ) : (
              <Button
                size="sm"
                onClick={() => void handleActivar()}
                disabled={activating}
                className="w-full rounded-full font-semibold"
              >
                {activating ? (
                  <><RefreshCw className="mr-1.5 size-3.5 animate-spin" />Activando…</>
                ) : (
                  'Activar cuenta CLABE'
                )}
              </Button>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            {info.bankAccountStatus === 'awaitingDepositVerification' && (
              <p className="text-[10px] text-amber-400">
                Cuenta en espera de verificación (sandbox: se activa con primer depósito de prueba)
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
