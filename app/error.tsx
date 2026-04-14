'use client'

import { useEffect } from 'react'
import { AppErrorFallback } from '@/components/errors/app-error-fallback'

export default function RootError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app-error]', error)
  }, [error])

  return (
    <AppErrorFallback
      title="No pudimos cargar esta parte"
      description="Error inesperado. Vuelve al inicio o actualiza la página."
    />
  )
}
