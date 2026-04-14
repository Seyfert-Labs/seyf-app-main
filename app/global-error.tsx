'use client'

import { useEffect } from 'react'
import './globals.css'
import { AppErrorFallback } from '@/components/errors/app-error-fallback'

export default function GlobalError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error]', error)
  }, [error])

  return (
    <html lang="es" className="dark">
      <body className="min-h-dvh bg-background font-sans antialiased text-foreground">
        <AppErrorFallback
          title="Algo salió mal"
          description="Error grave. Vuelve al inicio o actualiza más tarde."
        />
      </body>
    </html>
  )
}
