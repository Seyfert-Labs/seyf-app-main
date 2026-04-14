'use client'

import { useEffect } from 'react'
import { AppErrorFallback } from '@/components/errors/app-error-fallback'

export default function AppSegmentError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app-segment-error]', error)
  }, [error])

  return (
    <AppErrorFallback
      title="No pudimos mostrar esta sección"
      description="No se pudo cargar esta sección. Vuelve al inicio o actualiza."
    />
  )
}
