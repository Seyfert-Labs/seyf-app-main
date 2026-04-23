'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Tema
      </p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Theme preference">
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            variant={theme === value ? 'default' : 'outline'}
            size="sm"
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
            className="min-w-0 px-2 text-xs sm:text-sm"
          >
            <Icon className="size-4" aria-hidden />
            <span className="truncate">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
