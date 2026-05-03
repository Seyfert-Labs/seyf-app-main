'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { OrderTransactionDetailCard, pickQuoteId } from '@/components/app/dev/etherfuse-order-cards'
import { SpeiPaymentCard } from '@/components/app/dev/spei-payment-card'
import { extractOrderIdFromCreateOrderResponse } from '@/lib/etherfuse/order-create-response'
import {
  speiDetailsFromOnrampOrderApiJson,
  type SpeiTransferDetails,
} from '@/lib/etherfuse/spei-transfer-details'
import {
  extractConfirmedTxSignatureFromOnrampPanelJson,
  pickRampOrderTransactionDetails,
} from '@/lib/etherfuse/orders-api'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import {
  type EtherfuseReadinessClientPayload,
  etherfuseDepositBlockedCopy,
  parseEtherfuseReadinessJson,
} from '@/lib/seyf/etherfuse-readiness-cta'

type RampContextPayload = {
  kycApproved: boolean
  kycStatus: string | null
  kycReason: string | null
}

export default function EtherfuseRampDevClient() {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [targetOverride, setTargetOverride] = useState('')
  const [sourceAmount, setSourceAmount] = useState('500')
  const [orderJson, setOrderJson] = useState<string>('')
  const [fiatJson, setFiatJson] = useState<string>('')
  const [speiDetails, setSpeiDetails] = useState<SpeiTransferDetails | null>(null)
  const [pendingManualOrderJson, setPendingManualOrderJson] = useState<string | null>(null)
  const [kycGate, setKycGate] = useState<RampContextPayload | null>(null)
  const [kycLoading, setKycLoading] = useState(true)
  const [readiness, setReadiness] = useState<EtherfuseReadinessClientPayload | null>(null)

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setErr(null)
    setBusy(label)
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setKycLoading(true)
    fetch('/api/seyf/etherfuse/ramp-context')
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as Partial<RampContextPayload> & { error?: string }
        if (!r.ok) {
          throw new Error(typeof j.error === 'string' ? j.error : `HTTP ${r.status}`)
        }
        if (cancelled) return
        setKycGate({
          kycApproved: j.kycApproved === true,
          kycStatus: typeof j.kycStatus === 'string' ? j.kycStatus : null,
          kycReason: typeof j.kycReason === 'string' ? j.kycReason : null,
        })
      })
      .catch((e) => {
        if (cancelled) return
        setKycGate({
          kycApproved: false,
          kycStatus: null,
          kycReason: e instanceof Error ? e.message : 'No pudimos validar tu estado KYC.',
        })
      })
      .finally(() => {
        if (!cancelled) setKycLoading(false)
      })
    fetch('/api/seyf/etherfuse/readiness')
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { error?: string }
        if (!r.ok) {
          throw new Error(typeof j.error === 'string' ? j.error : `HTTP ${r.status}`)
        }
        if (cancelled) return
        const parsed = parseEtherfuseReadinessJson(j)
        if (parsed) {
          setReadiness(parsed)
        } else {
          setReadiness({
            onrampEnabled: false,
            reasons: ['Respuesta de readiness inesperada.'],
            kycApproved: false,
            agreementsAccepted: false,
            bankAccountReady: false,
            trustlineReady: false,
            documentsUploaded: false,
            webhookConfigured: false,
          })
        }
      })
      .catch((e) => {
        if (cancelled) return
        setReadiness({
          onrampEnabled: false,
          reasons: [e instanceof Error ? e.message : 'No pudimos calcular readiness.'],
          kycApproved: false,
          agreementsAccepted: false,
          bankAccountReady: false,
          trustlineReady: false,
          documentsUploaded: false,
          webhookConfigured: false,
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const performQuote = useCallback(async (): Promise<string> => {
    const body: { sourceAmount: string; targetAsset?: string } = {
      sourceAmount: sourceAmount.trim() || '500',
    }
    const t = targetOverride.trim()
    if (t) body.targetAsset = t
    const res = await fetch('/api/seyf/etherfuse/quote/onramp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg =
        typeof data.error === 'string'
          ? data.error
          : `${res.status} ${res.statusText}${Object.keys(data).length ? ` — ${JSON.stringify(data)}` : ''}`
      throw new Error(msg)
    }
    return JSON.stringify(data, null, 2)
  }, [sourceAmount, targetOverride])

  const performOrder = useCallback(async (qJson: string): Promise<string> => {
    let parsed: unknown
    try {
      parsed = JSON.parse(qJson || '{}')
    } catch {
      throw new Error('Cotización JSON inválida')
    }
    const inner =
      parsed && typeof parsed === 'object' && 'quote' in (parsed as object)
        ? (parsed as { quote: unknown }).quote
        : parsed
    const quoteId = pickQuoteId(inner)
    if (!quoteId) {
      throw new Error('No encuentro quoteId en la cotización (~2 min de validez)')
    }
    const res = await fetch('/api/seyf/etherfuse/order/onramp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : res.statusText)
    }
    return JSON.stringify(data, null, 2)
  }, [])

  const performFiatSimulation = useCallback(async (oJson: string): Promise<string> => {
    let parsed: unknown
    try {
      parsed = JSON.parse(oJson || '{}')
    } catch {
      throw new Error('Respuesta de orden JSON inválida')
    }
    const orderId = extractOrderIdFromCreateOrderResponse(parsed)
    if (!orderId) {
      throw new Error(
        'No encuentro orderId (revisa raíz o onramp/on_ramp en el JSON de la orden).',
      )
    }
    const res = await fetch('/api/seyf/etherfuse/sandbox/fiat-received', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : res.statusText)
    }

    let orderPolled: unknown = null
    let pollAttempts = 0
    for (let i = 0; i < 12; i++) {
      pollAttempts = i + 1
      if (i > 0) await new Promise((r) => setTimeout(r, 1500))
      const gr = await fetch(`/api/seyf/etherfuse/prueba/order/${encodeURIComponent(orderId)}`)
      if (!gr.ok) continue
      const gj = (await gr.json().catch(() => ({}))) as { order?: unknown }
      orderPolled = gj.order ?? null
      const det = pickRampOrderTransactionDetails(orderPolled)
      const st = (det.status ?? '').toLowerCase()
      if (
        (det.confirmedTxSignature && det.confirmedTxSignature.length > 0) ||
        st === 'completed' ||
        st === 'funded' ||
        st === 'failed' ||
        st === 'canceled'
      ) {
        break
      }
    }

    return JSON.stringify(
      {
        sandboxFiatReceived: data,
        orderPolled,
        orderDisplay: pickRampOrderTransactionDetails(orderPolled),
        pollAttempts,
      },
      null,
      2,
    )
  }, [])

  const openManualSpeiReview = () =>
    run('spei-manual-prepare', async () => {
      const q = await performQuote()
      const o = await performOrder(q)
      const assetLabel =
        targetOverride.trim()
          ? targetOverride.trim().split(':')[0]?.trim() || 'CETES'
          : 'CETES'
      const details = speiDetailsFromOnrampOrderApiJson(o, assetLabel, 'Etherfuse')
      if (!details) {
        throw new Error(
          'No aparecen datos de transferencia (CLABE e importe). Revisa la respuesta o inténtalo de nuevo.',
        )
      }
      setOrderJson(o)
      setFiatJson('')
      setPendingManualOrderJson(o)
      setSpeiDetails(details)
    })

  const confirmSpeiPayment = useCallback(async () => {
    if (!speiDetails || !pendingManualOrderJson) return
    await run('spei-manual-confirm', async () => {
      const f = await performFiatSimulation(pendingManualOrderJson)
      setOrderJson(pendingManualOrderJson)
      setFiatJson(f)
      setPendingManualOrderJson(null)
      setSpeiDetails(null)
    })
  }, [speiDetails, pendingManualOrderJson, performFiatSimulation, run])

  const speiConfirmBusy = busy === 'spei-manual-confirm'
  const canOperate = readiness?.onrampEnabled === true
  const readinessReasons = readiness?.reasons ?? []
  const depositBlocked = etherfuseDepositBlockedCopy({
    readiness,
    kycLoading,
    mode: 'deposit',
    fallbackReason: kycGate?.kycReason ?? null,
  })

  const onrampTxSignature = useMemo(
    () => extractConfirmedTxSignatureFromOnrampPanelJson(fiatJson),
    [fiatJson],
  )

  const stellarTxExplorerUrl = useMemo(() => {
    if (!onrampTxSignature) return null
    const isMain =
      typeof process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'string' &&
      ['public', 'mainnet'].includes(
        process.env.NEXT_PUBLIC_STELLAR_NETWORK.toLowerCase(),
      )
    const base = isMain
      ? 'https://stellar.expert/explorer/public/tx/'
      : 'https://stellar.expert/explorer/testnet/tx/'
    return `${base}${encodeURIComponent(onrampTxSignature)}`
  }, [onrampTxSignature])

  /** Solo pasos en lenguaje de banca; se muestra después de tener CLABE. */
  const depositProgress = useMemo(() => {
    const hasInstructions = Boolean(speiDetails)
    const bankSent = Boolean(fiatJson)
    const credited = Boolean(onrampTxSignature)
    return [
      {
        label: 'Listo: tienes CLABE e importe',
        description: 'Copia los datos en tu app del banco.',
        done: hasInstructions,
      },
      {
        label: 'Tu banco envió el dinero',
        description:
          'Esperamos tu transferencia. Si la app te lo pide, confirma abajo que ya enviaste.',
        done: bankSent,
      },
      {
        label: 'Saldo en tu cuenta Seyf',
        description: 'Cuando acredite verás el movimiento.',
        done: credited,
      },
    ]
  }, [speiDetails, fiatJson, onrampTxSignature])

  const showDepositProgress = Boolean(speiDetails || fiatJson || onrampTxSignature)

  return (
    <AppPageBody className="space-y-6 pt-4">
      <AppBackLink href="/dashboard" />

      <section className="relative overflow-hidden rounded-[1.5rem] border border-[#bfd6ca] bg-gradient-to-br from-[#edf6f2] via-[#e6f0ea] to-[#dce9e3] p-5 dark:border-[#2b4a43] dark:bg-gradient-to-br dark:from-[#0d3531] dark:via-[#15534a] dark:to-[#1f6559]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#9ec7b3]/25 blur-3xl dark:bg-[#6ba690]/25" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-[#b8b8b5]/20 blur-3xl dark:bg-[#22433c]/40" />
        <div className="relative">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="inline-flex rounded-full border border-[#b8b8b5]/60 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#5f7168] dark:border-white/20 dark:bg-white/15 dark:text-[#d2e9df]">
            Depósito SPEI
            </p>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#41534b] dark:text-white">Añadir fondos</h1>
          <p className="mt-1.5 text-sm text-[#7b8f86] dark:text-[#d2e9df]">
            Depósito por SPEI: mismo uso que transferir a una cuenta CLABE desde tu banco.
          </p>
        </div>
      </section>

      {!canOperate ? (
        <section className="rounded-[1.25rem] border border-amber-500/30 bg-amber-500/[0.08] p-4">
          <p className="text-sm font-bold text-foreground">{depositBlocked.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{depositBlocked.lead}</p>
          {readinessReasons.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {readinessReasons.slice(0, 5).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href={depositBlocked.primaryLink.href}
              className="inline-flex text-sm font-semibold text-foreground underline"
            >
              {depositBlocked.primaryLink.label}
            </Link>
            {depositBlocked.extraLinks.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className="inline-flex text-xs font-medium text-muted-foreground underline decoration-muted-foreground/60"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {canOperate ? (
        <section className="space-y-3 rounded-[1.5rem] border border-[#bfd6ca] bg-[#f4faf7] p-5 dark:border-border dark:bg-card/80">
          <div>
            <h2 className="text-base font-bold text-foreground">¿Cuánto vas a depositar?</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Escribe el monto en pesos. Generamos la cotización y te mostramos CLABE e importe exacto.
            </p>
          </div>
          <Input
            id="manual-amount"
            inputMode="decimal"
            value={sourceAmount}
            onChange={(e) => setSourceAmount(e.target.value)}
            placeholder="Ej. 500.00"
            className="h-14 rounded-2xl border-[#c6dccf] bg-background px-4 text-lg tabular-nums font-semibold"
            aria-label="Monto en pesos mexicanos"
          />
          <Input
            id="manual-asset"
            value={targetOverride}
            onChange={(e) => setTargetOverride(e.target.value)}
            placeholder="Activo (opcional, avanzado)"
            className="h-11 rounded-xl border-border bg-background px-3 font-mono text-xs"
            aria-label="Referencia de activo opcional"
          />
          <Button
            type="button"
            className="h-14 w-full rounded-2xl bg-foreground text-base font-bold text-background shadow-md"
            disabled={!!busy}
            onClick={() => void openManualSpeiReview()}
          >
            {busy === 'spei-manual-prepare' ? (
              <>
                <Spinner className="size-4 text-background" />
                Preparando datos…
              </>
            ) : (
              'Ver datos para transferir'
            )}
          </Button>
        </section>
      ) : null}

      <SpeiPaymentCard
        details={speiDetails}
        concept={speiDetails?.orderId ?? null}
      />

      {speiDetails && pendingManualOrderJson ? (
        <Button
          type="button"
          variant="secondary"
          className="h-12 w-full rounded-2xl border border-border font-semibold"
          disabled={!!busy || !canOperate}
          onClick={() => void confirmSpeiPayment()}
        >
          {speiConfirmBusy ? (
            <>
              <Spinner className="size-4" />
              Procesando…
            </>
          ) : (
            'Ya hice la transferencia desde mi banco'
          )}
        </Button>
      ) : null}

      {showDepositProgress ? (
        <section className="rounded-[1.25rem] border border-border bg-card/60 p-4">
          <p className="text-sm font-bold text-foreground">Seguimiento del depósito</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Así va tu transferencia; no hace falta entender términos técnicos.
          </p>
          <div className="mt-3 space-y-3">
            {depositProgress.map((step) => (
              <div
                key={step.label}
                className="rounded-xl border border-border/70 bg-background/50 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{step.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-xs font-bold',
                      step.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                    )}
                  >
                    {step.done ? 'Listo' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {err && (
        <p className="mt-6 rounded-[1rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {err}
        </p>
      )}

      {onrampTxSignature && stellarTxExplorerUrl ? (
        <div className="rounded-[1.5rem] border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground">Comprobante de acreditación</p>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{onrampTxSignature}</p>
          <a
            href={stellarTxExplorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-foreground underline-offset-2 hover:underline"
          >
            Ver comprobante
          </a>
        </div>
      ) : null}

      {fiatJson ? (
        <div className="space-y-4">
          <OrderTransactionDetailCard payloadJson={fiatJson} />
        </div>
      ) : null}
    </AppPageBody>
  )
}
