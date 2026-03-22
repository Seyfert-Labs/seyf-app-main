'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, PlusCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/dashboard',
    label: 'Inicio',
    icon: LayoutGrid,
  },
  {
    href: '/anadir',
    label: 'Añadir',
    icon: PlusCircle,
  },
  {
    href: '/historial',
    label: 'Historial',
    icon: Clock,
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-4 pt-2">
      <nav
        className={cn(
          'pointer-events-auto flex max-w-sm items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl',
        )}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-[4.5rem] flex-col items-center gap-1 rounded-full px-4 py-2 transition-colors',
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-5" strokeWidth={isActive ? 2.25 : 2} />
              <span className={cn('text-[10px] font-semibold', isActive && 'text-foreground')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
