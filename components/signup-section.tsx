'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignupSection() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = '/registro'
  }

  return (
    <section className="min-h-screen w-full bg-background px-6 py-20 flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-10">
          <h2 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            Crea tu cuenta
          </h2>
          <p className="mt-4 text-lg font-bold text-foreground leading-snug">
            Empieza a gestionar tus finanzas de forma inteligente.
          </p>
          <p className="mt-2 text-sm text-muted-foreground font-normal">
            Solo toma 2 minutos.
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Input
              id="name"
              type="text"
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-14 rounded-full bg-secondary px-6 text-base font-medium placeholder:text-muted-foreground border-0 focus-visible:ring-1 focus-visible:ring-foreground"
            />
          </div>

          <div>
            <Input
              id="email"
              type="email"
              placeholder="Correo electronico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-14 rounded-full bg-secondary px-6 text-base font-medium placeholder:text-muted-foreground border-0 focus-visible:ring-1 focus-visible:ring-foreground"
            />
          </div>

          <Button 
            type="submit" 
            size="lg"
            className="w-full h-14 rounded-full bg-foreground text-background font-bold text-base hover:bg-foreground/90 border border-foreground transition-all"
          >
            Crear cuenta
          </Button>
        </form>

        {/* Terms */}
        <p className="mt-8 text-center text-sm text-muted-foreground leading-relaxed">
          Al crear tu cuenta, aceptas nuestros{' '}
          <a href="#" className="underline underline-offset-4 hover:text-foreground">
            Terminos
          </a>{' '}
          y{' '}
          <a href="#" className="underline underline-offset-4 hover:text-foreground">
            Privacidad
          </a>
        </p>
      </div>
    </section>
  )
}
