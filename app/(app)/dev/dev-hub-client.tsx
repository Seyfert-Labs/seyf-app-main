'use client'

import Link from 'next/link'
import { AppBackLink } from '@/components/app/app-back-link'
import { AppPageBody } from '@/components/app/app-page-body'
import { DevKycResetPanel } from '@/components/app/dev-kyc-reset-panel'

export default function DevHubClient({ showKycReset }: { showKycReset: boolean }) {
  return (
    <AppPageBody className="space-y-6 pt-4">
      <AppBackLink href="/dashboard" />

      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Desarrollo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accesos rápidos a flujos y paneles de integración.
        </p>
      </div>

      <section className="space-y-2 rounded-[1.25rem] border border-dashed border-amber-500/25 bg-amber-500/[0.06] p-4">
        <p className="text-xs font-bold text-amber-200/90">Enlaces</p>
        <Link
          href="/anadir"
          className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Añadir fondos
        </Link>
        <Link
          href="/retirar"
          className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Retirar
        </Link>
        <Link
          href="/identidad"
          className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Identidad / KYC
        </Link>
        <Link
          href="/dev/poc-omnibus"
          className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Omnibus
        </Link>
        <Link
          href="/dev/etherfuse-ops"
          className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Backoffice Etherfuse
        </Link>
        <Link
          href="/dev/etherfuse-testnet-bank"
          className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Testnet · CLABE sintética (cuenta sin UI Identidad)
        </Link>
      </section>

      {showKycReset ? <DevKycResetPanel /> : null}
    </AppPageBody>
  )
}
