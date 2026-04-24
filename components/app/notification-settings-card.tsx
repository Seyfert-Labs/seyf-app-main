'use client'

import { useEffect, useState, useTransition } from 'react'
import { BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

type SettingsResponse = {
  userId: string
  settings: {
    phoneNumber: string | null
    smsEnabled: boolean
    updatedAt: string
  }
}

export function NotificationSettingsCard() {
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/seyf/notification-settings')
      .then(async (response) => {
        const data = (await response.json()) as SettingsResponse
        if (!response.ok) {
          throw new Error('No se pudo cargar tu preferencia de notificaciones.')
        }
        if (cancelled) return
        setPhoneNumber(data.settings.phoneNumber ?? '')
        setSmsEnabled(data.settings.smsEnabled)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'No se pudo cargar la preferencia.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function handleSave() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const response = await fetch('/api/seyf/notification-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber,
            smsEnabled,
          }),
        })
        const data = (await response.json()) as
          | SettingsResponse
          | { error?: string }

        if (!response.ok) {
          const msg =
            typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
              ? data.error
              : 'No se pudo guardar.'
          throw new Error(msg)
        }

        if ('settings' in data) {
          setPhoneNumber(data.settings.phoneNumber ?? '')
          setSmsEnabled(data.settings.smsEnabled)
        }
        setMessage('Preferencia guardada.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      }
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-secondary/25 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <BellRing className="size-4 text-foreground" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Avisos por SMS</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Recibe avances de tu capital, retiros y validacion de identidad. Puedes apagar estos
            avisos cuando quieras.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Telefono para SMS</span>
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="5512345678 o +525512345678"
            className="mt-2 h-11 rounded-xl border-border bg-background"
            disabled={loading || pending}
          />
        </label>

        <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3">
          <div className="pr-4">
            <p className="text-sm font-semibold text-foreground">Notificaciones activas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Si apagas esta opcion, seguiremos registrando el intento pero no enviaremos SMS.
            </p>
          </div>
          <Switch
            checked={smsEnabled}
            onCheckedChange={setSmsEnabled}
            disabled={loading || pending}
            aria-label="Activar notificaciones SMS"
          />
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={loading || pending}
          className="h-11 w-full rounded-full font-bold"
        >
          {pending ? 'Guardando...' : 'Guardar ajustes'}
        </Button>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {message ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p> : null}
      </div>
    </section>
  )
}
