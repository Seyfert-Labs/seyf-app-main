'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type AppErrorFallbackProps = {
  title?: string
  description?: string
}

/**
 * Pantalla de error sobria: una acción principal, sin CTAs de reintento que carguen la UI.
 * Recuperación: el usuario puede actualizar la página o seguir la navegación.
 */
export function AppErrorFallback({
  title = 'Algo salió mal',
  description = 'Vuelve al inicio o actualiza la página.',
}: AppErrorFallbackProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/30">
        <AlertTriangle className="size-8 text-amber-400" strokeWidth={2} />
      </div>
      <h1 className="text-2xl font-black tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-10 flex w-full max-w-xs flex-col items-center gap-4">
        <Button asChild variant="default" className="h-11 w-full rounded-full font-semibold">
          <Link href="/dashboard">Ir al inicio</Link>
        </Button>
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
        >
          Inicio público
        </Link>
      </div>
    </div>
  )
}
