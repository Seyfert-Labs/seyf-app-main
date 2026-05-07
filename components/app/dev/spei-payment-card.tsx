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
        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#9ec7b3]/45 bg-white/70 text-[#3d5c50] transition-colors hover:border-[#15534a]/50 hover:bg-[#e8f3ed] dark:border-emerald-500/35 dark:bg-white/10 dark:text-emerald-100 dark:hover:border-emerald-400/45 dark:hover:bg-emerald-500/15',
        done && 'border-emerald-500/60 text-emerald-700 dark:text-emerald-200',
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
    <div className="flex items-start justify-between gap-3 border-b border-[#c6dccf]/55 py-3.5 last:border-b-0 dark:border-white/10">
      <span className="pt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#5f7168] dark:text-[#b8d9ce]/90">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-start justify-end gap-2">
        <span
          className={cn(
            'text-right text-sm font-semibold leading-snug text-[#1a2e28] dark:text-white',
            mono && 'break-all font-mono text-[13px] tabular-nums',
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
      className="relative overflow-hidden rounded-[1.5rem] border border-[#bfd6ca] bg-gradient-to-br from-[#f4faf7] via-[#ecf5f0] to-[#e0ebe4] shadow-[0_12px_40px_rgba(35,94,77,0.08)] dark:border-[#2b4a43] dark:from-[#0f3b36] dark:via-[#15534a] dark:to-[#1b5b50] dark:shadow-[0_12px_40px_rgba(8,42,36,0.35)]"
      aria-label="Datos para transferencia SPEI"
    >
      <div className="relative">
        <div className="border-b border-[#c6dccf]/70 bg-white/35 px-4 py-3.5 dark:border-white/10 dark:bg-black/15">
          <p className="inline-flex items-center rounded-full border border-[#9ec7b3]/40 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#4f6b5f] dark:border-emerald-400/30 dark:bg-white/10 dark:text-[#d2e9df]">
            SPEI
          </p>
          <h2 className="mt-2 text-base font-bold tracking-tight text-[#1a2e28] dark:text-white">
            Deposita por transferencia
          </h2>
          <p className="mt-0.5 text-xs leading-snug text-[#5f7168] dark:text-[#b8d9ce]/90">
            Transferencia con tu CLABE interbancaria
          </p>
        </div>

        <div className="px-4 py-4">
          {details ? (
            <>
              <p className="mb-1 text-xs leading-relaxed text-[#5f7168] dark:text-[#b8d9ce]/90">
                Copia los datos en tu app del banco. El monto debe coincidir exactamente.
              </p>
              <div className="mt-3 space-y-0">
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
              <p className="mt-4 rounded-xl border border-[#c6dccf]/50 bg-white/40 px-3 py-2.5 text-xs leading-relaxed text-[#5f7168] dark:border-white/10 dark:bg-black/20 dark:text-[#b8d9ce]/90">
                Cuando termines la transferencia, confirma abajo para seguir el estado de tu depósito.
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-[#5f7168] dark:text-[#b8d9ce]/85">
              Indica el monto que vas a enviar y usa el botón{' '}
              <span className="font-semibold text-[#1a2e28] dark:text-white">Ver datos para transferir</span>.
              Aquí aparecerán la CLABE, el beneficiario y el importe exacto (como en tu banca tradicional).
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
