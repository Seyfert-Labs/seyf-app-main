'use client'

import ThreeDMarquee from '@/components/ui/3d-marquee'

const fintechImages = [
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1618044733300-9472054094ee?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=400&h=300&fit=crop',
]

export default function HeroSection() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* 3D Marquee Background */}
      <ThreeDMarquee images={fintechImages} className="opacity-50" />

      {/* Content overlay */}
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-6 text-center">
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
