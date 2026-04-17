'use client'

import PollarWalletPanel from '@/components/pollar-wallet-panel'
import HeroSection from '@/components/hero-section'

export default function Home() {
  return (
    <main className="h-screen overflow-y-auto snap-y snap-mandatory">
      <section className="h-screen snap-start">
        <HeroSection />
      </section>
      <section
        id="landing-sesion"
        className="min-h-screen snap-start scroll-mt-0"
      >
        <PollarWalletPanel />
      </section>
    </main>
  )
}
