'use client'

import HeroSection from '@/components/hero-section'
import SignupSection from '@/components/signup-section'

export default function Home() {
  return (
    <main className="min-h-[100svh] h-[100dvh] overflow-y-auto snap-y snap-mandatory supports-[height:100svh]:h-[100svh]">
      <section className="flex min-h-[100svh] h-[100dvh] snap-start flex-col supports-[height:100svh]:h-[100svh]">
        <HeroSection />
      </section>
      <section className="min-h-screen snap-start">
        <SignupSection />
      </section>
    </main>
  )
}
