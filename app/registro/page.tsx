'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegistroPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nombre: '', correo: '', telefono: '', password: '' })
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accepted) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      router.push('/verificacion')
    }, 1200)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <Link href="/" className="text-2xl font-black tracking-tight text-foreground">Seyf</Link>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8">
          <h2 className="text-4xl font-black tracking-tight text-foreground leading-none">
            Crea tu<br />cuenta.
          </h2>
          <p className="mt-4 text-base text-muted-foreground font-normal">
            Solo toma 2 minutos. Sin complicaciones.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={handleChange('nombre')}
            required
            className="h-14 rounded-full bg-secondary px-6 text-base font-medium placeholder:text-muted-foreground border-0 focus-visible:ring-1 focus-visible:ring-foreground"
          />
          <Input
            type="email"
            placeholder="Correo electronico"
            value={form.correo}
            onChange={handleChange('correo')}
            required
            className="h-14 rounded-full bg-secondary px-6 text-base font-medium placeholder:text-muted-foreground border-0 focus-visible:ring-1 focus-visible:ring-foreground"
          />
          <Input
            type="tel"
            placeholder="Telefono (10 digitos)"
            value={form.telefono}
            onChange={handleChange('telefono')}
            required
            maxLength={10}
            className="h-14 rounded-full bg-secondary px-6 text-base font-medium placeholder:text-muted-foreground border-0 focus-visible:ring-1 focus-visible:ring-foreground"
          />
          <Input
            type="password"
            placeholder="Contrasena"
            value={form.password}
            onChange={handleChange('password')}
            required
            className="h-14 rounded-full bg-secondary px-6 text-base font-medium placeholder:text-muted-foreground border-0 focus-visible:ring-1 focus-visible:ring-foreground"
          />

          {/* Terms checkbox */}
          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <div
              onClick={() => setAccepted(!accepted)}
              className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border transition-colors cursor-pointer ${accepted ? 'bg-foreground border-foreground' : 'border-muted-foreground'}`}
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              Acepto los{' '}
              <Link href="#" className="text-foreground underline underline-offset-4">Terminos y Condiciones</Link>{' '}
              y el{' '}
              <Link href="#" className="text-foreground underline underline-offset-4">Aviso de Privacidad</Link>
            </span>
          </label>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={loading || !accepted}
              className="w-full h-14 rounded-full bg-foreground text-background font-bold text-base hover:bg-foreground/90 transition-all disabled:opacity-40"
            >
              {loading ? 'Creando cuenta...' : 'Continuar'}
            </Button>
          </div>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Ya tienes cuenta?{' '}
        <Link href="/login" className="font-bold text-foreground hover:underline">
          Iniciar sesion
        </Link>
      </p>
    </div>
  )
}
