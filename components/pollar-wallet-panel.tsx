'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSeyfWallet } from '@/lib/seyf/use-seyf-wallet'
import { Button } from '@/components/ui/button'

function maskAddress(value?: string | null) {
  if (!value) return '-'
  if (value.length < 12) return value
  return `${value.slice(0, 6)}...${value.slice(-6)}`
}

export default function PollarWalletPanel() {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const didRedirectToDashboardRef = useRef(false)
  const {
    wallet,
    balance,
    assetBalances,
    loading,
    creating,
    error,
    disconnect,
    connect,
    refreshBalance,
    refreshWallet,
  } = useSeyfWallet()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!wallet?.stellarAddress) {
      didRedirectToDashboardRef.current = false
      return
    }
    if (!mounted || loading || creating) return
    if (pathname !== '/' || didRedirectToDashboardRef.current) return
    didRedirectToDashboardRef.current = true
    router.replace('/dashboard')
  }, [mounted, loading, creating, wallet?.stellarAddress, router, pathname])

  const mxneAssets = useMemo(() => {
    if (!assetBalances) return []
    return assetBalances.filter((asset: { code?: string; assetCode?: string }) => {
      const code = (asset.code ?? asset.assetCode ?? '').toUpperCase()
      return code === 'MXNE'
    })
  }, [assetBalances])

  return (
    <div className="min-h-screen w-full bg-background px-6 pb-24 pt-16 sm:pt-20">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-4 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Qué es Seyf
          </p>
          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl text-balance">
            Tu dinero que trabaja antes de que pagues.
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p className="text-balance">
              <strong className="text-foreground">Seyf</strong> es tu capa financiera: separa comprar de pagar,
              genera rendimiento sobre tu ahorro y te da adelantos cuando ya ganaste — sin sacrificar claridad ni
              seguridad.
            </p>
          </div>
        </header>

        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-bold text-foreground">Iniciar sesión</h3>

          {!wallet ? (
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-full text-base font-bold sm:w-auto sm:min-w-[14rem]"
              disabled={!mounted || loading || creating}
              onClick={() => void connect()}
            >
              {creating ? 'Preparando wallet…' : loading ? 'Cargando…' : 'Iniciar sesión'}
            </Button>
          ) : null}

          {!mounted || loading ? (
            <p className="text-sm text-muted-foreground">Cargando estado de wallet...</p>
          ) : null}

          {creating ? (
            <p className="text-sm text-muted-foreground">Creando wallet embedded...</p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {wallet ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-secondary p-4">
                <p className="text-xs text-muted-foreground">Stellar Address</p>
                <p className="mt-1 text-base font-bold text-foreground">{maskAddress(wallet.stellarAddress)}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">Balance XLM</p>
                  <p className="mt-1 text-2xl font-black text-foreground">{balance ?? '-'} XLM</p>
                </div>
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">Balance MXNe (detected)</p>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    {mxneAssets.length > 0 ? mxneAssets[0].balance : '-'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => refreshWallet()} className="rounded-full">
                  Refresh wallet
                </Button>
                <Button onClick={() => void refreshBalance()} variant="outline" className="rounded-full">
                  Refresh balances
                </Button>
                <Button onClick={() => disconnect()} variant="outline" className="rounded-full">
                  Disconnect
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <details className="rounded-3xl border border-border p-5 text-sm text-muted-foreground">
          <summary className="cursor-pointer font-bold text-foreground">
            Detalles técnicos (dev)
          </summary>
          <div className="mt-4 space-y-2">
            <p>1) XLM: balance nativo vía API Pollar (`/wallet/balance`).</p>
            <p>2) MXNe: detecta asset code `MXNE` en balances antes de flujo de inversión.</p>
            <p>3) Etherfuse/CETES: construye TX con Stellar SDK; firma con `buildTx` + `signAndSubmitTx` de Pollar.</p>
            <p>4) Cuenta fuente on-chain: `wallet.stellarAddress` (G…).</p>
          </div>
        </details>
      </div>
    </div>
  )
}
