'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useAccesly } from 'accesly'
import { Button } from '@/components/ui/button'
import {
  ACCESLY_BALANCE_EXTRA_DELAYS_MS,
  ACCESLY_BALANCE_POLL_MS,
} from '@/lib/seyf/balance-poll-intervals'

function maskAddress(value?: string | null) {
  if (!value) return '—'
  if (value.length < 14) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function shortKey(value?: string | null, head = 8, tail = 4) {
  if (!value) return '—'
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

function formatNetwork() {
  const n = process.env.NEXT_PUBLIC_ACCESLY_NETWORK
  if (n === 'mainnet' || n === 'testnet') return n
  return 'testnet'
}

type AppUserAccountPanelProps = {
  /** Dentro del menú del avatar: bordes/ radio más compactos */
  embedded?: boolean
}

export default function AppUserAccountPanel({ embedded = false }: AppUserAccountPanelProps) {
  const router = useRouter()
  const { wallet, balance, loading, disconnect, refreshBalance } = useAccesly()
  const [addressCopied, setAddressCopied] = useState(false)
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
    }
  }, [])

  useEffect(() => {
    if (!wallet || loading) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (document.visibilityState !== 'visible') return
      void refreshBalance().catch(() => {})
    }
    tick()
    const extraTimers = ACCESLY_BALANCE_EXTRA_DELAYS_MS.map((ms) =>
      setTimeout(tick, ms),
    )
    const id = setInterval(tick, ACCESLY_BALANCE_POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    const onFocus = () => tick()
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) tick()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      cancelled = true
      for (const t of extraTimers) clearTimeout(t)
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [wallet, loading, refreshBalance])

  const copyStellarAddress = useCallback(async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
      setAddressCopied(true)
      copyResetRef.current = setTimeout(() => {
        setAddressCopied(false)
        copyResetRef.current = null
      }, 2000)
    } catch {
      setAddressCopied(false)
    }
  }, [])

  const shell = embedded
    ? 'rounded-xl border border-border bg-card shadow-sm'
    : 'rounded-[1.5rem] border border-border bg-card'

  function handleLogout() {
    disconnect()
    router.push('/')
  }

  if (loading) {
    return (
      <section
        className={`animate-pulse border border-border bg-card ${embedded ? 'rounded-xl' : 'rounded-[1.5rem]'}`}
        aria-hidden
      >
        <div className="h-12 border-b border-border bg-secondary/50" />
        <div className="space-y-3 p-4">
          <div className="h-4 w-2/3 rounded bg-secondary" />
          <div className="h-4 w-full rounded bg-secondary" />
          <div className="h-4 w-5/6 rounded bg-secondary" />
        </div>
        <div className="h-14 border-t border-border bg-secondary/30" />
      </section>
    )
  }

  if (!wallet) {
    return (
      <section
        className={`border border-border bg-card px-4 py-5 text-center ${embedded ? 'rounded-xl' : 'rounded-[1.5rem]'}`}
      >
        <UserRound className="mx-auto size-10 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-semibold text-foreground">Sin sesión Accesly</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Conecta tu wallet desde el inicio para ver tu cuenta aquí.
        </p>
        <Button asChild className="mt-4 h-11 w-full rounded-full font-bold">
          <Link href="/">Ir a conectar</Link>
        </Button>
      </section>
    )
  }

  const rows: {
    label: string
    value: string
    mono?: boolean
    /** Si existe, botón copiar pega este texto (dirección completa) */
    copyFullText?: string
    /** Correos largos sin espacios: partir en cualquier carácter sin desbordar */
    breakAnywhere?: boolean
  }[] = [
    { label: 'Correo', value: wallet.email?.trim() || '—', breakAnywhere: true },
    { label: 'Red', value: formatNetwork() },
    {
      label: 'Cuenta Stellar',
      value: maskAddress(wallet.stellarAddress),
      mono: true,
      copyFullText: wallet.stellarAddress,
    },
    { label: 'Clave pública', value: shortKey(wallet.publicKey), mono: true },
    { label: 'Contrato', value: shortKey(wallet.contractId), mono: true },
    {
      label: 'Balance XLM',
      value: balance != null && balance !== '' ? `${balance} XLM` : '—',
      mono: true,
    },
  ]

  let memberSince = '—'
  if (wallet.createdAt) {
    try {
      const d = new Date(wallet.createdAt)
      if (!Number.isNaN(d.getTime())) {
        memberSince = new Intl.DateTimeFormat('es-MX', {
          dateStyle: 'medium',
        }).format(d)
        rows.push({
          label: 'Cuenta desde',
          value: memberSince,
        })
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <section className={`overflow-hidden ${shell}`}>
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-violet-700/20 via-indigo-700/15 to-sky-700/10 px-4 py-4">
        <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-black text-foreground ring-1 ring-white/15">
            {(wallet.email?.split('@')[0]?.slice(0, 2) ?? wallet.stellarAddress.slice(0, 2)).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-foreground">Tu perfil</h2>
            <p className="truncate text-xs text-muted-foreground">Accesly · Stellar</p>
          </div>
          <p className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-100/90">
            <ShieldCheck className="size-3" />
            Activo
          </p>
        </div>
        <div className="relative mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-100/80">Red</p>
            <p className="mt-0.5 text-xs font-semibold text-white">{formatNetwork()}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-100/80">Cuenta desde</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-white">{memberSince}</p>
          </div>
        </div>
      </div>

      <dl className="space-y-2 px-3 py-3">
        {rows.map(({ label, value, mono, copyFullText, breakAnywhere }) => (
          <div
            key={label}
            className="grid min-w-0 gap-0.5 rounded-xl border border-border bg-secondary/35 px-3 py-2.5 sm:grid-cols-[7.5rem_1fr] sm:items-start sm:gap-3"
          >
            <dt className="pt-0.5 text-xs font-medium text-muted-foreground">{label}</dt>
            <dd
              className={`flex min-w-0 w-full max-w-full items-start gap-2 text-sm font-semibold text-foreground ${mono ? 'font-mono text-[13px] font-medium tracking-tight' : ''}`}
            >
              <span
                className={`min-w-0 flex-1 whitespace-normal ${
                  breakAnywhere
                    ? 'break-all [overflow-wrap:anywhere]'
                    : mono
                      ? 'break-all sm:break-normal'
                      : 'break-words sm:break-normal'
                }`}
              >
                {value}
              </span>
              {copyFullText ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label={addressCopied ? 'Copiado' : 'Copiar dirección Stellar'}
                  title={addressCopied ? 'Copiado' : 'Copiar dirección'}
                  onClick={() => void copyStellarAddress(copyFullText)}
                >
                  {addressCopied ? (
                    <Check className="size-4 text-emerald-500" strokeWidth={2.5} />
                  ) : (
                    <Copy className="size-4" strokeWidth={2} />
                  )}
                </Button>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-border p-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-2 rounded-full border-destructive/35 bg-destructive/5 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="size-4 shrink-0" strokeWidth={2} />
          Cerrar sesión
        </Button>
      </div>
    </section>
  )
}
