'use client'

import { useCallback, useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type SpeiTransferDetails,
  formatSpeiMxnAmount,
} from '@/lib/etherfuse/spei-transfer-details'
import { cn } from '@/lib/utils'

function CopyChip({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setDone(true)
      window.setTimeout(() => setDone(false), 1600)
    })
  }, [value])
  return (
    <button
      type="button"
      onClick={copy}
      title={`Copiar ${label}`}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background/80 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        done && 'border-emerald-500/40 text-emerald-600',
      )}
      aria-label={`Copiar ${label}`}
    >
      <Copy className="size-3.5" />
    </button>
  )
}

function Row({
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
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-3 last:border-0">
      <span className="shrink-0 text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span
          className={cn(
            'text-right text-sm text-foreground',
            mono && 'break-all font-mono text-[13px]',
          )}
        >
          {value}
        </span>
        {copyValue ? <CopyChip value={copyValue} label={label} /> : null}
      </div>
    </div>
  )
}

export function SpeiTransferReviewDialog({
  open,
  onOpenChange,
  details,
  onConfirm,
  confirmBusy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  details: SpeiTransferDetails | null
  onConfirm: () => void | Promise<void>
  confirmBusy: boolean
}) {
  const amountLabel = details ? formatSpeiMxnAmount(details.amountMxn) : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90vh,640px)] overflow-y-auto border-border bg-background p-0 sm:max-w-md"
        showCloseButton={!confirmBusy}
      >
        <div className="border-b border-border/60 bg-emerald-500/[0.08] px-5 py-3">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="text-sm font-black uppercase tracking-wide text-emerald-600">
              Detalles de transferencia SPEI
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-5 pb-2 pt-4">
          {details ? (
            <>
              <p className="text-base font-semibold text-foreground">Datos para tu banca</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Para completar la compra de <span className="font-semibold text-foreground">{details.assetCode}</span>,
                transfiere por SPEI a la cuenta que indica Etherfuse:
              </p>

              <div className="mt-4 rounded-[1rem] border border-border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">
                  Abre tu app bancaria y envía una transferencia SPEI a:
                </p>
                <div className="mt-2">
                  <Row
                    label="CLABE"
                    value={details.clabe}
                    mono
                    copyValue={details.clabe}
                  />
                  <Row label="Nombre" value={details.beneficiaryName} />
                  <Row
                    label="Monto"
                    value={amountLabel}
                    copyValue={String(details.amountMxn)}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-[0.75rem] border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-bold text-amber-900 dark:text-amber-200">Aviso: </span>
                En producción, si no reciben el monto en el plazo indicado por Etherfuse, la orden puede
                cancelarse. En este panel de desarrollo, al confirmar se simula el SPEI en sandbox (
                <span className="font-mono">fiat_received</span>).
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No hay datos de transferencia.</p>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/20 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={confirmBusy}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="rounded-full bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            disabled={!details || confirmBusy}
            onClick={() => void onConfirm()}
          >
            {confirmBusy ? 'Ejecutando…' : 'Aceptar y ejecutar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
