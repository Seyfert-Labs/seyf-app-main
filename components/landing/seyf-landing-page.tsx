'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSeyfWallet } from '@/lib/seyf/use-seyf-wallet'
import {
  SEYF_LANDING_BONDS_LINE,
  SEYF_LANDING_CARDS_SHOWCASE_BODY,
  SEYF_LANDING_CARDS_SHOWCASE_DISCLAIMER,
  SEYF_LANDING_CARDS_SHOWCASE_TITLE,
  SEYF_LANDING_FOOTER_CTA_TITLE,
  SEYF_LANDING_LEAD,
  SEYF_LANDING_MARKETS,
  SEYF_LANDING_MARKETS_SECTION_TITLE,
  SEYF_LANDING_SECURITY_BODY,
  SEYF_LANDING_SECURITY_TITLE,
  SEYF_LANDING_TAGLINE,
} from '@/lib/seyf/landing-copy'
import { cn } from '@/lib/utils'

function useLandingWalletRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const didRedirectRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const { wallet, loading, creating, error, connect } = useSeyfWallet()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!wallet?.stellarAddress) {
      didRedirectRef.current = false
      return
    }
    if (!mounted || loading || creating) return
    if (pathname !== '/' || didRedirectRef.current) return
    didRedirectRef.current = true
    router.replace('/dashboard')
  }, [mounted, loading, creating, wallet?.stellarAddress, router, pathname])

  return { mounted, loading, creating, error, connect }
}

function PrimaryCta({
  disabled,
  onClick,
  label,
  className,
}: {
  disabled?: boolean
  onClick: () => void
  label: string
  className?: string
}) {
  return (
    <Button
      type="button"
      size="lg"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-12 rounded-full px-8 text-base font-bold shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]',
        className,
      )}
    >
      {label}
    </Button>
  )
}

export default function SeyfLandingPage() {
  const { mounted, loading, creating, error, connect } = useLandingWalletRedirect()

  const busy = !mounted || loading || creating
  const label = creating ? 'Preparando tu cuenta…' : loading ? 'Cargando…' : 'Iniciar'

  const start = () => void connect()

  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      {/* Nav estilo Revolut: logo + anclas + CTA */}
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/SEYF.png"
              alt="Seyf"
              width={120}
              height={42}
              className="h-8 w-auto object-contain sm:h-9"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex dark:text-zinc-400">
            <a href="#tarjetas" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              Tarjetas
            </a>
            <a href="#mercados" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              Mercados
            </a>
            <a href="#seguridad" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              Seguridad
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden font-semibold sm:inline-flex"
              disabled={busy}
              onClick={start}
            >
              Iniciar sesión
            </Button>
            <PrimaryCta
              disabled={busy}
              onClick={start}
              label={label}
              className="h-10 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 sm:h-11"
            />
          </div>
        </div>
      </header>

      {/* Hero: blanco, tipografía grande centrada */}
      <section className="relative px-4 pt-24 pb-16 sm:px-6 sm:pt-32 sm:pb-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Image
            src="/SEYF.png"
            alt=""
            width={560}
            height={200}
            className="h-auto w-[min(92vw,20rem)] object-contain sm:w-[min(28rem,85vw)]"
            aria-hidden
          />
          <h1 className="mt-10 text-4xl font-black tracking-tight text-balance text-zinc-950 sm:text-5xl md:text-[3.25rem] md:leading-[1.08] dark:text-white">
            {SEYF_LANDING_TAGLINE}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
            {SEYF_LANDING_LEAD}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base dark:text-zinc-500">
            {SEYF_LANDING_BONDS_LINE}
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <PrimaryCta
              disabled={busy}
              onClick={start}
              label={label}
              className="min-w-[12rem] bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            />
            {error ? <p className="max-w-md text-center text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          </div>
        </div>
      </section>

      {/* Bloque estilo Revolut: fondo negro, copy centrado, CTA píldora clara, imagen de tarjetas debajo */}
      <section
        id="tarjetas"
        className="scroll-mt-20 border-y border-white/5 bg-black px-4 pt-14 pb-8 text-white sm:px-6 sm:pt-20 sm:pb-12"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-balance sm:text-4xl md:text-[2.75rem] md:leading-tight">
            {SEYF_LANDING_CARDS_SHOWCASE_TITLE}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            {SEYF_LANDING_CARDS_SHOWCASE_BODY}
          </p>
          <p className="mx-auto mt-3 max-w-lg text-[11px] leading-snug text-zinc-500 sm:text-xs">
            {SEYF_LANDING_CARDS_SHOWCASE_DISCLAIMER}
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryCta
              disabled={busy}
              onClick={start}
              label={label}
              className="min-w-[12rem] bg-white text-black hover:bg-zinc-200"
            />
          </div>
        </div>
        <div className="relative mx-auto mt-12 max-w-5xl sm:mt-16">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_64px_-12px_rgba(0,0,0,0.6)]">
            <Image
              src="/landing/seyf-cards-showcase.png"
              alt="Tarjetas físicas Seyf en distintos niveles"
              width={1024}
              height={575}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="h-auto w-full object-cover object-center"
            />
          </div>
          {/* Reflejo suave tipo vitrina Revolut */}
          <div
            className="pointer-events-none absolute inset-x-8 -bottom-6 h-24 bg-gradient-to-t from-black via-black/80 to-transparent sm:inset-x-12"
            aria-hidden
          />
        </div>
      </section>

      {/* Banda oscura + rejilla tipo planes Revolut */}
      <section id="mercados" className="scroll-mt-20 bg-zinc-950 px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-black tracking-tight sm:text-4xl">
            {SEYF_LANDING_MARKETS_SECTION_TITLE}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-zinc-400 sm:text-base">
            Un solo lugar para ver tu refugio diversificado y adelantar rendimientos según tu ritmo.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SEYF_LANDING_MARKETS.map((m) => (
              <div
                key={m.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.06]"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">{m.name}</p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Split claro: copy + marca */}
      <section id="seguridad" className="scroll-mt-20 bg-zinc-100 px-4 py-16 sm:px-6 sm:py-24 dark:bg-zinc-900">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
              {SEYF_LANDING_SECURITY_TITLE}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
              {SEYF_LANDING_SECURITY_BODY}
            </p>
            <PrimaryCta
              disabled={busy}
              onClick={start}
              label={label}
              className="mt-8 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            />
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-emerald-500/15 via-white to-zinc-100 p-10 shadow-xl dark:border-white/10 dark:from-emerald-500/10 dark:via-zinc-900 dark:to-zinc-950">
              <div className="flex justify-center">
                <Image
                  src="/SEYF.png"
                  alt="Seyf"
                  width={280}
                  height={100}
                  className="h-auto w-full max-w-[220px] object-contain opacity-95 dark:opacity-100"
                />
              </div>
              <p className="mt-6 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Custodia y operaciones con claridad. Tu futuro, pagado por adelantado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final oscuro */}
      <section className="bg-black px-4 py-16 text-center text-white sm:py-20">
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{SEYF_LANDING_FOOTER_CTA_TITLE}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-400">{SEYF_LANDING_TAGLINE}</p>
        <div className="mt-8">
          <PrimaryCta
            disabled={busy}
            onClick={start}
            label={label}
            className="bg-white text-black hover:bg-zinc-200"
          />
        </div>
      </section>

      <footer className="border-t border-zinc-200 px-4 py-8 text-center text-xs text-zinc-500 dark:border-zinc-800">
        <p>© {new Date().getFullYear()} Seyf. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
