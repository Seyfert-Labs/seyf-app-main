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

function parseSeyfErrorPayload(data: unknown): string {
  if (!data || typeof data !== 'object') return 'No se pudo activar la cuenta.'
  const o = data as Record<string, unknown>
  const err = o.error
  if (err && typeof err === 'object' && err !== null) {
    const msg = (err as Record<string, unknown>).message_es
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
  }
  if (typeof err === 'string' && err.trim()) return err.trim()
  return 'No se pudo activar la cuenta.'
}

export default function DepositClabeSection() {
  const { wallet, etherfusePublicKeyHint } = useSeyfWallet()
  const [info, setInfo] = useState<DepositInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const walletAddr = etherfusePublicKeyHint?.trim() ?? ''

  const fetchInfo = async (opts?: { silent?: boolean }) => {
    const quiet = opts?.silent === true
    if (!quiet) setLoading(true)
    try {
      const url = walletAddr
        ? `/api/seyf/etherfuse/deposit-info?wallet=${encodeURIComponent(walletAddr)}`
        : '/api/seyf/etherfuse/deposit-info'
      const res = await fetch(url)
      const data = (await res.json()) as DepositInfo
      setInfo(data)
    } catch {
      if (!quiet) setInfo(null)
    } finally {
      if (!quiet) setLoading(false)
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
      const res = await fetch('/api/seyf/etherfuse/activate-deposit-clabe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddr }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        etherfuseDepositClabe?: string | null
        error?: unknown
      }
      if (!res.ok || data.ok !== true) {
        setError(parseSeyfErrorPayload(data))
        return
      }
      const clabe = typeof data.etherfuseDepositClabe === 'string' ? data.etherfuseDepositClabe : null
      if (clabe) {
        setInfo((prev) =>
          prev ? { ...prev, etherfuseDepositClabe: clabe } : prev,
        )
      }
      await fetchInfo({ silent: true })
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
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

  if (loading && !info) return null
  if (!info?.hasContext) return null

  const kycReady = info.kycReady
  const kycStatus = info.kycStatus

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-1 pt-3 sm:px-6 sm:pt-4">
      <div
        className={cn(
          'rounded-[1.25rem] border border-border bg-card p-3 shadow-[0_4px_20px_rgba(0,0,0,0.12)] sm:p-4',
          'space-y-3',
        )}
      >
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full sm:size-7',
              kycReady ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400',
            )}
          >
            {kycReady ? (
              <ShieldCheck className="size-4" />
            ) : kycStatus === 'rejected' ? (
              <AlertCircle className="size-4 text-rose-400" />
            ) : (
              <Clock className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-snug text-foreground">
              Cuenta CLABE de depósito (SPEI)
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {kycReady
                ? 'Envía MXN a esta CLABE para agregar fondos'
                : kycStatus === 'rejected'
                  ? 'KYC rechazado — ve a /identidad'
                  : 'KYC en revisión — disponible al aprobarse'}
            </p>
          </div>
        </div>

        {kycReady && (
          <>
            {info.etherfuseDepositClabe ? (
              <button
                type="button"
                onClick={() => void copyClabe()}
                className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-left transition hover:bg-secondary active:scale-[0.98] sm:px-4"
              >
                <span className="min-w-0 break-all font-mono text-xs font-bold tracking-wide text-foreground sm:text-sm sm:tracking-widest">
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
                className="h-12 w-full min-h-[48px] rounded-full px-4 text-sm font-semibold sm:h-10"
              >
                {activating ? (
                  <>
                    <RefreshCw className="mr-2 size-4 shrink-0 animate-spin" />
                    Activando…
                  </>
                ) : (
                  'Activar cuenta CLABE'
                )}
              </Button>
            )}
            {error ? (
              <p className="text-xs leading-relaxed text-destructive">{error}</p>
            ) : null}
            {info.bankAccountStatus === 'awaitingDepositVerification' ? (
              <p className="text-[10px] leading-snug text-amber-600 dark:text-amber-400">
                Cuenta en espera de verificación (sandbox: se activa con primer depósito de prueba)
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
