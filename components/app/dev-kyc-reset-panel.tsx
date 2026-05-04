'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { resetKycTestSession } from '@/app/(app)/identidad/actions'

/**
 * Borra la cookie de onboarding Etherfuse en este navegador (solo si el servidor permite reinicio).
 * Pensado para la página /dev, no para flujo de usuario final.
 */
export function DevKycResetPanel({ onAfterReset }: { onAfterReset?: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="rounded-[1.5rem] border border-dashed border-amber-500/25 bg-amber-500/[0.06] p-4">
      <p className="text-xs font-bold text-amber-200/90">Solo desarrollo</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Borra la sesión guardada en este navegador. Para volver a empezar puede hacer falta usar otra cuenta o
        borrar datos locales del dispositivo.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setMsg(null)
          startTransition(async () => {
            const r = await resetKycTestSession()
            if (!r.ok) {
              setMsg(r.error)
              return
            }
            onAfterReset?.()
            router.refresh()
          })
        }}
        className="mt-3 rounded-full border-border bg-transparent text-xs font-semibold text-foreground hover:bg-secondary"
      >
        {pending ? 'Reiniciando…' : 'Reiniciar verificación'}
      </Button>
      {msg ? <p className="mt-2 text-xs text-destructive">{msg}</p> : null}
    </div>
  )
}
