'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type OpsUserRow = {
  customerId: string
  walletPublicKey: string
  status: string
  approvedAt: string | null
  currentRejectionReason: string | null
  updatedAt: string
}

type Readiness = {
  onrampEnabled: boolean
  kycStatus: string | null
  walletRegistered: boolean
  bankAccountReady: boolean
  trustlineReady: boolean
  agreementsAccepted: boolean
  webhookConfigured: boolean
  reasons: string[]
}

export default function EtherfuseOpsPage() {
  const [rows, setRows] = useState<OpsUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [diagBusy, setDiagBusy] = useState(false)
  const [diagError, setDiagError] = useState<string | null>(null)
  const [diag, setDiag] = useState<Readiness | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/seyf/etherfuse/ops/users', { cache: 'no-store' })
      .then(async (r) => {
        const json = (await r.json().catch(() => ({}))) as {
          users?: OpsUserRow[]
          error?: { message_es?: string }
        }
        if (!r.ok) {
          throw new Error(json.error?.message_es ?? `HTTP ${r.status}`)
        }
        if (!cancelled) {
          setRows(Array.isArray(json.users) ? json.users : [])
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No pudimos cargar usuarios.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const canDiagnose = useMemo(
    () => Boolean(customerId.trim() && publicKey.trim() && bankAccountId.trim()),
    [customerId, publicKey, bankAccountId],
  )

  const runDiagnose = async () => {
    if (!canDiagnose) return
    setDiagBusy(true)
    setDiagError(null)
    setDiag(null)
    try {
      const r = await fetch('/api/seyf/etherfuse/ops/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId.trim(),
          publicKey: publicKey.trim(),
          bankAccountId: bankAccountId.trim(),
        }),
      })
      const json = (await r.json().catch(() => ({}))) as {
        readiness?: Readiness
        error?: { message_es?: string }
      }
      if (!r.ok || !json.readiness) {
        throw new Error(json.error?.message_es ?? `HTTP ${r.status}`)
      }
      setDiag(json.readiness)
    } catch (e) {
      setDiagError(e instanceof Error ? e.message : 'No pudimos correr el diagnóstico.')
    } finally {
      setDiagBusy(false)
    }
  }

  return (
    <AppPageBody className="space-y-5 pt-3">
      <AppBackLink href="/dashboard" />

      <section className="rounded-[1.25rem] border border-border bg-card p-4">
        <h1 className="text-lg font-black text-foreground">Backoffice Etherfuse</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Diagnóstico operativo por usuario (KYC, wallet, CLABE/bank account, trustline y webhook).
        </p>
      </section>

      <section className="space-y-3 rounded-[1.25rem] border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground">Diagnosticar usuario</p>
        <Input
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="customerId (UUID)"
          className="h-11"
        />
        <Input
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="publicKey (Stellar)"
          className="h-11"
        />
        <Input
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
          placeholder="bankAccountId (UUID)"
          className="h-11"
        />
        <Button onClick={() => void runDiagnose()} disabled={!canDiagnose || diagBusy} className="w-full">
          {diagBusy ? 'Diagnosticando...' : 'Ejecutar diagnóstico'}
        </Button>
        {diagError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {diagError}
          </p>
        ) : null}
        {diag ? (
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">
              {diag.onrampEnabled ? 'Onramp habilitado' : 'Onramp bloqueado'}
            </p>
            <p className="mt-1">KYC: {diag.kycStatus ?? 'desconocido'}</p>
            <p>Webhook firmado: {diag.webhookConfigured ? 'sí' : 'no'}</p>
            <p>Wallet registrada: {diag.walletRegistered ? 'sí' : 'no'}</p>
            <p>Bank account lista: {diag.bankAccountReady ? 'sí' : 'no'}</p>
            <p>Trustline lista: {diag.trustlineReady ? 'sí' : 'no'}</p>
            <p>Acuerdos: {diag.agreementsAccepted ? 'sí' : 'no'}</p>
            {diag.reasons.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {diag.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.25rem] border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground">Usuarios KYC conocidos</p>
        {loading ? (
          <p className="mt-2 text-xs text-muted-foreground">Cargando...</p>
        ) : error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Sin registros locales aún.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {rows.map((row) => (
              <button
                key={`${row.customerId}-${row.walletPublicKey}`}
                type="button"
                onClick={() => {
                  setCustomerId(row.customerId)
                  setPublicKey(row.walletPublicKey)
                }}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-left"
              >
                <p className="text-xs font-semibold text-foreground">{row.status}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {row.customerId}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {row.walletPublicKey.slice(0, 10)}...{row.walletPublicKey.slice(-8)}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </AppPageBody>
  )
}
