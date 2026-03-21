'use client'

import HeroSection from '@/components/hero-section'
import SignupSection from '@/components/signup-section'

export default function Home() {
  return (
    <main className="h-screen overflow-y-auto snap-y snap-mandatory">
      <section className="h-screen snap-start">
        <HeroSection />
      </section>
      <section className="min-h-screen snap-start">
        <SignupSection />
      </section>
    </main>
  )
}
