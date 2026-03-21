'use client'

import ThreeDMarquee, { MARQUEE_IMAGE_POOL } from '@/components/ui/3d-marquee'

export default function HeroSection() {
  return (
    <section className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-x-clip overflow-y-hidden bg-background">
      {/* 3D Marquee Background */}
      <ThreeDMarquee
        images={[...MARQUEE_IMAGE_POOL]}
        className="absolute inset-0 z-0 h-full min-h-0 w-full rounded-none opacity-50"
      />

      {/* Content overlay */}
      <div className="relative z-20 flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        {/* Transparent content box */}
        <div className="rounded-3xl border border-foreground/10 bg-background/40 px-8 py-10 backdrop-blur-sm">
          {/* Logo */}
          <h1 className="text-6xl font-black tracking-tight text-foreground sm:text-7xl md:text-8xl">
            Seyf
          </h1>

          {/* Tagline */}
          <p className="mt-6 max-w-sm text-xl font-bold text-foreground sm:text-2xl md:max-w-md text-balance leading-snug">
            Tu dinero, tu control.
          </p>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg font-normal">
            Finanzas inteligentes al alcance de tu mano.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <span className="text-sm font-medium tracking-wide">Desliza</span>
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
