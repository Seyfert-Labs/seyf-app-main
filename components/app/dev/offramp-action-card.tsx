'use client'

import { useCallback, useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OfframpOrderSummary } from '@/lib/etherfuse/order-create-response'

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  const onCopy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setDone(true)
      window.setTimeout(() => setDone(false), 1400)
    })
  }, [value])
  return (
    <button
      type="button"
      onClick={onCopy}
      title={`Copiar ${label}`}
      aria-label={`Copiar ${label}`}
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-none border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
        done && 'border-foreground/30 text-foreground',
      )}
    >
      <Copy className="size-4" />
    </button>
  )
}

function FieldRow({
  label,
  value,
  mono,
  copyValue,
}: {
  label: string
  value: string
  mono?: boolean
  copyValue?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span
          className={cn(
            'text-right text-sm font-medium text-foreground',
            mono && 'break-all font-mono text-xs',
          )}
        >
          {value}
        </span>
        {copyValue ? <CopyBtn value={copyValue} label={label} /> : null}
      </div>
    </div>
  )
}

/**
 * Siguiente paso offramp: firma (statusPage / burn / anchor). Sin orden muestra guía breve.
 */
export function OfframpActionCard({ summary }: { summary: OfframpOrderSummary | null }) {
  const hasOrder = Boolean(summary?.orderId)
  const burnPreview =
    summary?.burnTransaction && summary.burnTransaction.length > 140
      ? `${summary.burnTransaction.slice(0, 140)}…`
      : (summary?.burnTransaction ?? '')

  return (
    <section
      className="overflow-hidden rounded-[1.5rem] border border-border bg-card"
      aria-label="Autorizar retiro"
    >
      <div className="border-b border-border bg-secondary/40 px-4 py-3">
        <h2 className="text-sm font-bold text-foreground">Siguiente paso</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Autoriza tu retiro en pesos</p>
      </div>

      <div className="px-4 py-3">
        {!hasOrder ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Indica el monto y pulsa <span className="font-medium text-foreground">Continuar</span>. Te daremos un
            enlace seguro para autorizar el retiro.
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-dashed border-border bg-background/60 px-3">
              <FieldRow
                label="Orden"
                value={summary!.orderId!}
                mono
                copyValue={summary!.orderId!}
              />
              {summary!.statusPage ? (
                <div className="border-b border-border py-3 last:border-0">
                  <a
                    href={summary!.statusPage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700"
                  >
                    Abrir para autorizar
                    <ExternalLink className="size-4 opacity-90" aria-hidden />
                  </a>
                </div>
              ) : null}
              {burnPreview ? (
                <FieldRow
                  label="Código de operación"
                  value={burnPreview}
                  mono
                  copyValue={summary!.burnTransaction ?? undefined}
                />
              ) : null}
              {summary!.withdrawAnchorAccount ? (
                <FieldRow
                  label="Cuenta de destino"
                  value={summary!.withdrawAnchorAccount}
                  mono
                  copyValue={summary!.withdrawAnchorAccount}
                />
              ) : null}
              {summary!.withdrawMemo ? (
                <FieldRow
                  label="Memo"
                  value={summary!.withdrawMemo}
                  mono
                  copyValue={summary!.withdrawMemo}
                />
              ) : null}
              {summary!.withdrawMemoType ? (
                <FieldRow label="Tipo memo" value={summary!.withdrawMemoType} />
              ) : null}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Al terminar, pulsa <span className="font-medium text-foreground">Consultar estado</span> abajo.{' '}
              <a
                href="https://docs.etherfuse.com/guides/testing-offramps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 underline underline-offset-2 hover:text-violet-500"
              >
                Ayuda
              </a>
            </p>
          </>
        )}
      </div>
    </section>
  )
}
