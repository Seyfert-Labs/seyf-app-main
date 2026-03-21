'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function VerificacionPage() {
  const router = useRouter()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...code]
    next[index] = value
    setCode(next)
    setError(false)
    if (value && index < 5) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handleVerify = () => {
    const full = code.join('')
    if (full.length < 6) { setError(true); return }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      router.push('/dashboard')
    }, 1200)
  }

  const isComplete = code.every(Boolean)

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Seyf</h1>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-10">
          <h2 className="text-4xl font-black tracking-tight text-foreground leading-none">
            Verifica<br />tu numero.
          </h2>
          <p className="mt-4 text-base text-muted-foreground font-normal">
            Te enviamos un codigo de 6 digitos por SMS. Puede tardar unos segundos.
          </p>
        </div>

        {/* OTP inputs */}
        <div className="flex justify-between gap-2 mb-8">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`h-14 w-12 rounded-2xl bg-secondary text-center text-xl font-black text-foreground outline-none transition-all focus:ring-2 focus:ring-foreground ${error ? 'ring-2 ring-destructive' : ''}`}
            />
          ))}
        </div>

        {error && (
          <p className="mb-4 text-sm text-destructive font-medium">
            Ingresa los 6 digitos del codigo.
          </p>
        )}

        <Button
          onClick={handleVerify}
          disabled={!isComplete || loading}
          className="w-full h-14 rounded-full bg-foreground text-background font-bold text-base hover:bg-foreground/90 transition-all disabled:opacity-40"
        >
          {loading ? 'Verificando...' : 'Verificar'}
        </Button>

        <button className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          No recibi el codigo. <span className="font-bold text-foreground">Reenviar</span>
        </button>
      </div>
    </div>
  )
}
