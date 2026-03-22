'use client'

import { useCallback, useState } from 'react'
import { Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type SpeiTransferDetails,
  formatSpeiMxnAmount,
} from '@/lib/etherfuse/spei-transfer-details'

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
 * Recuento tipo transferencia SPEI (CLABE, beneficiario, monto). Sin datos muestra texto guía.
 */
export function SpeiPaymentCard({
  details,
  concept,
}: {
  details: SpeiTransferDetails | null
  /** Ej. orderId corto para referencia bancaria. */
  concept?: string | null
}) {
  return (
    <section
      className="overflow-hidden rounded-[1.5rem] border border-border bg-card"
      aria-label="Datos para pago SPEI"
    >
      <div className="border-b border-border bg-secondary/40 px-4 py-3">
        <h2 className="text-sm font-bold text-foreground">Pago con SPEI</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Transfiere desde tu banco con estos datos
        </p>
      </div>

      <div className="px-4 py-3">
        {details ? (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Compra · <span className="font-semibold text-foreground">{details.assetCode}</span>
            </p>
            <div className="rounded-xl border border-dashed border-border bg-background/60 px-3">
              <FieldRow label="CLABE" value={details.clabe} mono copyValue={details.clabe} />
              <FieldRow label="Beneficiario" value={details.beneficiaryName} />
              <FieldRow
                label="Monto"
                value={formatSpeiMxnAmount(details.amountMxn)}
                copyValue={String(details.amountMxn)}
              />
              {concept ? (
                <FieldRow label="Referencia" value={concept} mono copyValue={concept} />
              ) : null}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Verifica que el monto coincida exactamente. Luego confirma abajo cuando hayas enviado la
              transferencia (en sandbox se simula la recepción).
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Indica cuánto vas a depositar y pulsa <span className="font-medium text-foreground">Continuar</span>.
            Aquí aparecerán la CLABE de Etherfuse y el monto exacto para tu SPEI.
          </p>
        )}
      </div>
    </section>
  )
}
