'use client'

import { useCallback, useEffect, useState } from 'react'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type DevInfo = {
  stellarTestnet: boolean
  bankAutofillActive: boolean
  etherfuseBaseUrl?: string
  organization?: { id: string; displayName: string; approvedAt: string | null } | null
  organizationError?: string | null
  session:
    | { hasSession: true; customerId: string; bankAccountId: string; publicKey: string }
    | { hasSession: false }
}

type BankAccountPayload = {
  bankAccountId?: string
  status?: string
  compliant?: boolean
  label?: string | null
}

export default function EtherfuseTestnetBankDevClient() {
  const [info, setInfo] = useState<DevInfo | null>(null)
  const [infoErr, setInfoErr] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [paternalLastName, setPaternalLastName] = useState('')
  const [maternalLastName, setMaternalLastName] = useState('')
  const [birthDateIso, setBirthDateIso] = useState('')
  const [curp, setCurp] = useState('')
  const [rfc, setRfc] = useState('')
  const [busy, setBusy] = useState(false)
  const [agreementsBusy, setAgreementsBusy] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [resultOpen, setResultOpen] = useState(false)
  const [resultOk, setResultOk] = useState(false)
  const [resultDetail, setResultDetail] = useState<string>('')

  const loadInfo = useCallback(() => {
    setInfoErr(null)
    void fetch('/api/seyf/etherfuse/testnet-bank-dev-info', { cache: 'no-store' })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as DevInfo & { error?: string }
        if (!r.ok) {
          throw new Error(j.error ?? `HTTP ${r.status}`)
        }
        setInfo(j as DevInfo)
      })
      .catch((e) => {
        setInfoErr(e instanceof Error ? e.message : 'No se pudo cargar el contexto.')
      })
  }, [])

  useEffect(() => {
    loadInfo()
  }, [loadInfo])

  const submit = async () => {
    setFormErr(null)
    const compact = birthDateIso.trim().replace(/\D/g, '')
    if (compact.length !== 8) {
      setFormErr('Fecha de nacimiento: usa el selector o YYYYMMDD (8 dígitos).')
      return
    }
    if (!firstName.trim() || !paternalLastName.trim() || !maternalLastName.trim()) {
      setFormErr('Nombre y ambos apellidos son obligatorios.')
      return
    }
    const curpNorm = curp.trim().toUpperCase()
    const rfcNorm = rfc.trim().toUpperCase()
    if (!/^[A-Z0-9]{18}$/.test(curpNorm)) {
      setFormErr('La CURP debe tener 18 caracteres.')
      return
    }
    if (!/^[A-Z0-9]{13}$/.test(rfcNorm)) {
      setFormErr('El RFC de persona física debe tener 13 caracteres.')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/seyf/etherfuse/bank-account-testnet-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          paternalLastName: paternalLastName.trim(),
          maternalLastName: maternalLastName.trim(),
          birthDate: compact,
          curp: curpNorm,
          rfc: rfcNorm,
        }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        bankAccount?: BankAccountPayload
        customerId?: string
        error?: { message_es?: string }
        debug_message?: string
      }
      if (!res.ok || !j.ok) {
        const msg =
          j.error?.message_es ??
          (typeof j.debug_message === 'string' ? j.debug_message : null) ??
          `HTTP ${res.status}`
        setResultOk(false)
        setResultDetail(msg)
        setResultOpen(true)
        return
      }
      setResultOk(true)
      setResultDetail(
        JSON.stringify(
          {
            customerId: j.customerId,
            bankAccount: j.bankAccount,
          },
          null,
          2,
        ),
      )
      setResultOpen(true)
      loadInfo()
    } catch (e) {
      setResultOk(false)
      setResultDetail(e instanceof Error ? e.message : 'Error de red')
      setResultOpen(true)
    } finally {
      setBusy(false)
    }
  }

  const acceptAgreements = async () => {
    setFormErr(null)
    setAgreementsBusy(true)
    try {
      const res = await fetch('/api/seyf/kyc/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        accepted?: boolean
        error?: { message_es?: string }
        debug_message?: string
      }
      if (!res.ok || !j.ok) {
        const msg =
          j.error?.message_es ??
          (typeof j.debug_message === 'string' ? j.debug_message : null) ??
          `HTTP ${res.status}`
        setResultOk(false)
        setResultDetail(msg)
        setResultOpen(true)
        return
      }
      setResultOk(true)
      setResultDetail('Acuerdos marcados como aceptados para la sesión actual.')
      setResultOpen(true)
    } catch (e) {
      setResultOk(false)
      setResultDetail(e instanceof Error ? e.message : 'Error de red')
      setResultOpen(true)
    } finally {
      setAgreementsBusy(false)
    }
  }

  const canSubmit =
    info?.stellarTestnet === true &&
    info.bankAutofillActive === true &&
    info.session.hasSession === true

  return (
    <AppPageBody className="space-y-5 pt-3">
      <AppBackLink href="/dev" />

      <section className="rounded-[1.25rem] border border-border bg-card p-4">
        <h1 className="text-lg font-black text-foreground">Testnet · CLABE sintética (dev)</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Usa la misma cookie de onboarding que en el navegador (Identidad). Llama a{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            POST /api/seyf/etherfuse/bank-account-testnet-auto
          </code>{' '}
          con CLABE desde <code className="font-mono text-[10px]">SEYF_TESTNET_SYNTHETIC_CLABE</code>. No
          modifica la UI de producción para usuarios finales.
        </p>
      </section>

      <section className="space-y-3 rounded-[1.25rem] border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground">Contexto</p>
        {infoErr ? (
          <p className="text-xs text-destructive">{infoErr}</p>
        ) : !info ? (
          <p className="text-xs text-muted-foreground">Cargando…</p>
        ) : (
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              Red pública Stellar:{' '}
              <span className="font-semibold text-foreground">
                {info.stellarTestnet ? 'testnet' : 'mainnet / public'}
              </span>
            </li>
            <li>
              Autofill testnet activo:{' '}
              <span className="font-semibold text-foreground">
                {info.bankAutofillActive ? 'sí' : 'no'}
              </span>{' '}
              {!info.bankAutofillActive ? (
                <span className="text-amber-600 dark:text-amber-400">
                  (define SEYF_TESTNET_SYNTHETIC_CLABE con 18 dígitos; no pongas SEYF_TESTNET_AUTOFILL_BANK_ACCOUNT=false)
                </span>
              ) : null}
            </li>
            <li>
              Etherfuse base URL:{' '}
              <span className="font-mono text-[10px] text-foreground">
                {info.etherfuseBaseUrl ?? 'desconocido'}
              </span>
            </li>
            <li>
              Organización API key:{' '}
              {info.organization ? (
                <span className="font-mono text-[10px] text-foreground">
                  {info.organization.displayName} ({info.organization.id})
                </span>
              ) : info.organizationError ? (
                <span className="text-destructive">{info.organizationError}</span>
              ) : (
                <span className="text-muted-foreground">sin dato</span>
              )}
            </li>
            <li>
              Cookie onboarding:{' '}
              {info.session.hasSession ? (
                <span className="font-mono text-[10px] text-foreground">
                  customer {info.session.customerId.slice(0, 8)}… · wallet{' '}
                  {info.session.publicKey.slice(0, 6)}…{info.session.publicKey.slice(-6)}
                </span>
              ) : (
                <span className="text-destructive">
                  no hay sesión — abre Identidad con la wallet y envía KYC al menos una vez, o usa el mismo
                  navegador donde ya probaste.
                </span>
              )}
            </li>
          </ul>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => loadInfo()}>
          Actualizar contexto
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!info?.session.hasSession || agreementsBusy}
          onClick={() => void acceptAgreements()}
        >
          {agreementsBusy ? 'Registrando acuerdos…' : 'Marcar acuerdos aceptados (sesión)'}
        </Button>
      </section>

      <section className="space-y-3 rounded-[1.25rem] border border-dashed border-amber-500/30 bg-amber-500/[0.06] p-4">
        <p className="text-sm font-bold text-foreground">Datos para alta Etherfuse</p>
        <p className="text-xs text-muted-foreground">
          Deben coincidir razonablemente con lo que ya mandaste en KYC si Etherfuse valida consistencia.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nombre(s)"
            className="h-11"
          />
          <Input
            value={paternalLastName}
            onChange={(e) => setPaternalLastName(e.target.value)}
            placeholder="Apellido paterno"
            className="h-11"
          />
          <Input
            value={maternalLastName}
            onChange={(e) => setMaternalLastName(e.target.value)}
            placeholder="Apellido materno"
            className="h-11"
          />
        </div>
        <Input
          type="date"
          value={birthDateIso}
          onChange={(e) => setBirthDateIso(e.target.value)}
          className="h-11"
          aria-label="Fecha de nacimiento"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={curp}
            onChange={(e) => setCurp(e.target.value.toUpperCase())}
            placeholder="CURP"
            className="h-11 font-mono uppercase"
          />
          <Input
            value={rfc}
            onChange={(e) => setRfc(e.target.value.toUpperCase())}
            placeholder="RFC"
            className="h-11 font-mono uppercase"
          />
        </div>
        {formErr ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {formErr}
          </p>
        ) : null}
        <Button
          type="button"
          className="w-full"
          disabled={!canSubmit || busy}
          onClick={() => void submit()}
        >
          {busy ? 'Creando cuenta…' : 'Crear cuenta bancaria (CLABE sintética)'}
        </Button>
        {!canSubmit && info ? (
          <p className="text-xs text-muted-foreground">
            El botón se habilita cuando: Stellar testnet + env CLABE sintética + cookie de onboarding presente.
          </p>
        ) : null}
      </section>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{resultOk ? 'Cuenta creada' : 'Error'}</DialogTitle>
            <DialogDescription>
              {resultOk
                ? 'Respuesta de Etherfuse (referencia). La cookie de onboarding se actualiza con el bankAccountId.'
                : 'Revisa mensaje y logs del servidor.'}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[45vh] overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-[11px] leading-relaxed">
            {resultDetail}
          </pre>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setResultOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPageBody>
  )
}
