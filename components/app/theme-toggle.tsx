'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ThemeChoice = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className="h-12 rounded-xl border border-border bg-secondary/40 animate-pulse"
        aria-hidden
      />
    )
  }

  const current = (theme ?? 'system') as ThemeChoice

  const items: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Claro', icon: Sun },
    { id: 'dark', label: 'Oscuro', icon: Moon },
    { id: 'system', label: 'Sistema', icon: Monitor },
  ]

  return (
    <div className="mb-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Apariencia</p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tema de la aplicación">
        {items.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            variant={current === id ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-auto flex-col gap-1 py-2.5 text-[11px] font-semibold',
              current === id && 'ring-1 ring-ring',
            )}
            aria-pressed={current === id}
            onClick={() => setTheme(id)}
          >
            <Icon className="size-4" strokeWidth={2} aria-hidden />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
