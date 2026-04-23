'use client'

import Link from 'next/link'
import { Search, BarChart3, CreditCard } from 'lucide-react'
import { useSeyfWallet } from '@/lib/seyf/use-seyf-wallet'
import AppUserAccountPanel from '@/components/app/app-user-account-panel'
import { ThemeToggle } from '@/components/app/theme-toggle'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

function avatarLabel(wallet: { email?: string; stellarAddress: string } | null, loading: boolean) {
  if (loading) return '…'
  if (!wallet) return '?'
  const local = wallet.email?.split('@')[0]?.trim()
  if (local && local.length >= 1) return local.slice(0, 2).toUpperCase()
  return wallet.stellarAddress.slice(0, 2).toUpperCase()
}

export default function AppTopBar() {
  const { wallet, loading } = useSeyfWallet()

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center gap-2 px-6 py-3">
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-secondary text-sm font-bold tracking-tight text-foreground ring-1 ring-border outline-none transition hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cuenta de usuario"
            >
              {avatarLabel(wallet, loading)}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col gap-0 overflow-hidden p-0">
            <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-gradient-to-br from-violet-700/15 via-indigo-700/10 to-background px-4 py-4 pr-12 text-left">
              <SheetTitle className="text-lg font-bold tracking-tight">Tu cuenta</SheetTitle>
              <SheetDescription className="sr-only">
                Perfil, dirección Stellar y sesión Pollar
              </SheetDescription>
              <p className="text-xs text-muted-foreground">Perfil y sesión Pollar</p>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <SheetClose asChild>
                <Link
                  href="/dashboard"
                  className="mb-4 flex h-11 w-full items-center justify-center rounded-full bg-secondary/70 text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-secondary"
                >
                  Inicio
                </Link>
              </SheetClose>
              <AppUserAccountPanel />
              <div className="mt-6 border-t border-border pt-4">
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <div className="rounded-full bg-secondary py-2.5 pl-10 pr-4 ring-1 ring-border">
            <span className="text-sm text-muted-foreground">Buscar</span>
          </div>
        </div>
        <Link
          href="/estadisticas"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary ring-1 ring-border transition hover:bg-secondary/80"
          aria-label="Estadísticas y tipo de cambio"
        >
          <BarChart3 className="size-[1.15rem] text-foreground" strokeWidth={2} />
        </Link>
        <Link
          href="/tarjeta"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary ring-1 ring-border transition hover:bg-secondary/80"
          aria-label="Tarjeta virtual"
        >
          <CreditCard className="size-[1.15rem] text-foreground" strokeWidth={2} />
        </Link>
      </div>
    </header>
  )
}
