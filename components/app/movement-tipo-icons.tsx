'use client'

import type { ReactNode } from 'react'
import type { MovimientoTipo } from '@/lib/seyf/user-movements-types'

const iconClass = 'size-4'

export function iconForMovimientoTipo(tipo: MovimientoTipo): ReactNode {
  switch (tipo) {
    case 'deposito':
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )
    case 'rendimiento':
    case 'inversion':
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      )
    case 'adelanto':
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 8 12 12 15 14" />
        </svg>
      )
    case 'retiro':
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="5 12 19 12" />
          <polyline points="13 6 19 12 13 18" />
        </svg>
      )
    case 'pago':
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    default:
      return (
        <span className="text-xs font-bold" aria-hidden>
          ·
        </span>
      )
  }
}

export function labelForMovimientoTipo(tipo: MovimientoTipo): string {
  const map: Record<MovimientoTipo, string> = {
    deposito: 'Entrada',
    rendimiento: 'Rendimiento',
    adelanto: 'Adelanto',
    retiro: 'Salida',
    pago: 'Pago',
    inversion: 'Ahorro',
  }
  return map[tipo]
}
