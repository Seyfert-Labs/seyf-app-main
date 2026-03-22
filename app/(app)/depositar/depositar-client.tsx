'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AppPageBody } from '@/components/app/app-page-body'
import { AppBackLink } from '@/components/app/app-back-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MIN_MXN = 500

function expiresAtFromPayload(q: unknown): string | undefined {
  if (!q || typeof q !== 'object') return undefined
  const o = q as Record<string, unknown>
  if (typeof o.expiresAt === 'string') return o.expiresAt
  if (typeof o.expires_at === 'string') return o.expires_at
  return undefined
}

type MvpOnrampResponse = {
  mode?: string
  walletPublicKey?: string
  targetAsset?: string
  quote?: unknown
  reusedFromPending?: boolean
  deposit?: {
    orderId?: string
    clabe?: string
    depositAmount?: number
  }
  error?: string
}

export default function DepositarClient() {
  const [amount, setAmount] = useState('500')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountPreview, setAccountPreview] = useState<{
    walletMasked: string
    bankAccountId: string
  } | null>(null)
  const [deposit, setDeposit] = useState<{
    clabe: string
    monto: number
    orderId: string
    targetAsset: string
    walletMasked: string
    reusedFromPending: boolean
    expiresAt?: string
  } | null>(null)

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const parseAmount = () => {
    const n = Number.parseFloat(amount.replace(',', '.'))
    return Number.isFinite(n) ? n : NaN
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/seyf/etherfuse/mvp/account')
      const data = (await res.json()) as { error?: string; walletMasked?: string; bankAccountId?: string }
      if (cancelled) return
      if (!res.ok) {
        setAccountError(typeof data.error === 'string' ? data.error : 'No se pudo cargar la cuenta Etherfuse.')
        setAccountPreview(null)
        return
      }
      setAccountError(null)
      if (data.walletMasked && data.bankAccountId) {
        setAccountPreview({
          walletMasked: data.walletMasked,
          bankAccountId: data.bankAccountId.slice(0, 8) + '…',
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const runOnramp = useCallback(
    async (forceNew: boolean) => {
      setError(null)
      const mxn = parseAmount()
      if (!Number.isFinite(mxn) || mxn < MIN_MXN) {
        setError(`El monto mínimo es $${MIN_MXN.toLocaleString('es-MX')} MXN.`)
        return
      }

      setLoading(true)
      setDeposit(null)
      try {
        const res = await fetch('/api/seyf/etherfuse/mvp/onramp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceAmount: String(mxn),
            forceNew,
          }),
        })
        const data = (await res.json()) as MvpOnrampResponse

        if (res.status === 403) {
          setError(
            'La rampa no está habilitada en producción (SEYF_ALLOW_ETHERFUSE_RAMP).',
          )
          return
        }
        if (!res.ok) {
          setError(typeof data.error === 'string' ? data.error : 'Error al generar depósito.')
          return
        }

        const d = data.deposit
        const clabe = d?.clabe
        const monto = d?.depositAmount
        const orderId = d?.orderId ?? ''
        if (!clabe || monto == null) {
          setError('Respuesta sin CLABE de depósito.')
          return
        }

        const pk = data.walletPublicKey ?? ''
        const walletMasked =
          pk.length > 12 ? `${pk.slice(0, 6)}…${pk.slice(-4)}` : pk

        setDeposit({
          clabe,
          monto,
          orderId,
          targetAsset: data.targetAsset ?? '',
          walletMasked,
          reusedFromPending: data.reusedFromPending === true,
          expiresAt: expiresAtFromPayload(data.quote),
        })
      } catch {
        setError('Error de red. Intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    },
    [amount],
  )

  return (
    <AppPageBody>
      <AppBackLink href="/dashboard" />

      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-foreground leading-none">
          Depositar
          <br />
          vía SPEI
        </h1>
        <p className="mt-4 text-base text-muted-foreground font-normal">
          Usamos la <strong className="text-foreground">wallet Stellar</strong> y la{' '}
          <strong className="text-foreground">cuenta bancaria (CLABE)</strong> registradas en tu
          organización de Etherfuse (API), no la sesión de verificación de esta app.
        </p>
      </div>

      {accountPreview && (
        <div className="mb-6 rounded-[1.25rem] border border-border bg-card/60 px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">Cuenta Etherfuse (MVP)</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Wallet: {accountPreview.walletMasked}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cuenta bancaria (id): {accountPreview.bankAccountId}
          </p>
        </div>
      )}

      {accountError && (
        <div className="mb-6 rounded-[1.25rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-semibold text-destructive">No se pudo resolver la cuenta</p>
          <p className="mt-1 text-muted-foreground">{accountError}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Asegúrate de tener wallet Stellar y CLABE en Etherfuse o define{' '}
            <span className="font-mono">ETHERFUSE_MVP_*</span> en <span className="font-mono">.env.local</span>.
          </p>
          <Link
            href="/identidad"
            className="mt-2 inline-block text-sm font-bold text-foreground underline underline-offset-4"
          >
            Onboarding Etherfuse (opcional)
          </Link>
        </div>
      )}

      {!deposit && (
        <div className="mb-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monto" className="text-sm font-semibold">
              Monto a depositar (MXN)
            </Label>
            <Input
              id="monto"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 rounded-xl bg-secondary text-lg font-semibold tabular-nums"
              placeholder="500"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo {MIN_MXN.toLocaleString('es-MX')} MXN (MVP Seyf).
            </p>
          </div>
          <Button
            type="button"
            disabled={loading}
            onClick={() => runOnramp(false)}
            className="h-12 w-full rounded-full bg-foreground text-base font-bold text-background hover:bg-foreground/90"
          >
            {loading ? 'Generando datos…' : 'Generar CLABE de depósito'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Si Etherfuse indica que ya hay una orden pendiente con el mismo monto, reutilizamos esa
            CLABE automáticamente.
          </p>
        </div>
      )}

      {error && (
        <p className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {deposit && (
        <div className="mb-8 space-y-3">
          {deposit.reusedFromPending && (
            <div className="rounded-[1.25rem] border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm">
              <p className="font-semibold text-foreground">Orden pendiente existente</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ya había un onramp activo para esta cuenta y monto; mostramos la misma CLABE.
              </p>
            </div>
          )}

          <div className="rounded-[1.25rem] border border-border bg-secondary p-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Wallet destino (Stellar)</p>
            <p className="font-mono text-sm text-foreground">{deposit.walletMasked}</p>
          </div>

          <div className="rounded-[1.25rem] border border-border bg-secondary p-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Monto exacto (SPEI)</p>
            <p className="text-2xl font-black tabular-nums text-foreground">
              {deposit.monto.toLocaleString('es-MX', {
                style: 'currency',
                currency: 'MXN',
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Transfiere exactamente este monto para que coincida con la orden.
            </p>
          </div>

          <div className="rounded-[1.25rem] border border-border bg-secondary p-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">CLABE interbancaria</p>
            <p className="break-all text-xl font-bold tracking-widest text-foreground">
              {deposit.clabe}
            </p>
            <button
              type="button"
              onClick={() => copy(deposit.clabe, 'clabe')}
              className="mt-3 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition-all hover:bg-foreground/90"
            >
              {copiedField === 'clabe' ? 'Copiado' : 'Copiar CLABE'}
            </button>
          </div>

          {deposit.orderId && (
            <div className="rounded-[1.25rem] border border-border bg-card p-4">
              <p className="mb-1 text-xs font-medium text-muted-foreground">ID de orden</p>
              <p className="break-all font-mono text-sm text-foreground">{deposit.orderId}</p>
              <button
                type="button"
                onClick={() => copy(deposit.orderId, 'order')}
                className="mt-3 rounded-full border border-border bg-transparent px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary"
              >
                {copiedField === 'order' ? 'Copiado' : 'Copiar ID'}
              </button>
            </div>
          )}

          {deposit.targetAsset && (
            <p className="text-xs text-muted-foreground">
              Activo destino (red Stellar):{' '}
              <span className="font-mono text-foreground">{deposit.targetAsset}</span>
            </p>
          )}

          {deposit.expiresAt && (
            <p className="text-xs text-muted-foreground">
              Caducidad de cotización: {new Date(deposit.expiresAt).toLocaleString('es-MX')}.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full border-border font-semibold"
              onClick={() => {
                setDeposit(null)
                setError(null)
              }}
            >
              Otro monto
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full rounded-full font-semibold"
              disabled={loading}
              onClick={() => runOnramp(true)}
            >
              {loading ? 'Procesando…' : 'Nueva orden (cancela pendiente de este monto)'}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-8 space-y-3 rounded-[1.5rem] border border-border bg-card/50 p-5">
        <p className="text-sm font-bold text-foreground">Cómo hacer la transferencia</p>
        {[
          'Indica el monto y genera la CLABE.',
          'Transfiere por SPEI desde tu banco usando la CLABE y el monto exacto.',
          'Los fondos se vinculan a tu wallet en Etherfuse según la orden.',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground ring-1 ring-border">
              {i + 1}
            </span>
            <p className="text-sm text-muted-foreground">{step}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Los depósitos SPEI pueden tardar más en fin de semana o festivos. En sandbox:{' '}
        <a
          href="https://docs.etherfuse.com/sandbox-api/fiat-received"
          className="font-semibold text-foreground underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          simular acreditación
        </a>
        .
      </p>
    </AppPageBody>
  )
}
