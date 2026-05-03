'use client'

import { animate, scroll, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { useLayoutEffect, useRef } from 'react'
import {
  SEYF_LANDING_GALLERY_FOOTER,
  SEYF_LANDING_GALLERY_TITLE,
  SEYF_LANDING_MARKETS,
  SEYF_LANDING_RECORRIDO_SLIDES,
  SEYF_LANDING_TAGLINE_PARTS,
  type SeyfRecorridoSlide,
} from '@/lib/seyf/landing-copy'
import { cn } from '@/lib/utils'

const HEADER_OFFSET_REM = 4

function noop() {}

function RecorridoTitle({ slide }: { slide: SeyfRecorridoSlide }) {
  const cls =
    'text-balance text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl md:text-[2.35rem] md:leading-[1.12] dark:text-white'
  if (slide.highlightNuncaInTitle) {
    return (
      <h3 className={cls}>
        {SEYF_LANDING_TAGLINE_PARTS.before}
        <span className="text-[#45b596] dark:text-[#7fe8cc]">{SEYF_LANDING_TAGLINE_PARTS.highlight}</span>
        {SEYF_LANDING_TAGLINE_PARTS.after}
      </h3>
    )
  }
  return <h3 className={cls}>{slide.title}</h3>
}

function RecorridoBody({ slide, layout }: { slide: SeyfRecorridoSlide; layout: 'scroll' | 'stacked' }) {
  const stacked = layout === 'stacked'
  const introCls = cn(
    'mt-4 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg',
    stacked && 'mx-auto text-center',
  )

  if (slide.marketsList) {
    return (
      <>
        {slide.body ? <p className={introCls}>{slide.body}</p> : null}
        <div
          className={cn(
            'grid grid-cols-1 gap-3 sm:grid-cols-2',
            slide.body ? 'mt-5' : 'mt-5',
            stacked && 'mx-auto w-full max-w-xl text-left',
          )}
        >
          {SEYF_LANDING_MARKETS.map((m) => (
            <div
              key={m.name}
              className="rounded-xl border border-zinc-200/90 bg-white/60 p-3.5 text-left shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{m.name}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{m.description}</p>
            </div>
          ))}
        </div>
      </>
    )
  }
  if (!slide.body) return null
  return (
    <p
      className={cn(
        'mt-4 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg',
        stacked && 'mx-auto text-center',
      )}
    >
      {slide.body}
    </p>
  )
}

function RecorridoSlideInner({ slide, layout }: { slide: SeyfRecorridoSlide; layout: 'scroll' | 'stacked' }) {
  const hasImage = Boolean(slide.image)
  const isScroll = layout === 'scroll'

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col justify-center gap-6',
        hasImage && isScroll && 'md:flex-row md:items-center md:gap-10 lg:gap-14',
        !hasImage && isScroll && 'items-center px-2 text-center md:px-12',
        layout === 'stacked' && 'items-center text-center',
      )}
    >
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col justify-center',
          hasImage && isScroll && 'max-w-xl text-left',
          !hasImage && 'max-w-2xl',
        )}
      >
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-emerald-700/90 dark:text-emerald-400/90">
          {slide.step}
        </p>
        <div className={cn('mt-2', layout === 'stacked' && 'flex justify-center')}>
          <RecorridoTitle slide={slide} />
        </div>
        <RecorridoBody slide={slide} layout={layout} />
      </div>
      {slide.image ? (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center',
            isScroll && 'md:w-[42%] md:max-w-md lg:max-w-lg',
          )}
        >
          <Image
            src={slide.image.src}
            alt={slide.image.alt}
            width={slide.image.width}
            height={slide.image.height}
            sizes="(max-width: 768px) 90vw, 400px"
            className={cn('object-contain', slide.image.className)}
            priority={slide.id === 'promesa'}
          />
        </div>
      ) : null}
    </div>
  )
}

export function SeyfScrollGallery() {
  const shouldReduce = useReducedMotion()
  const containerRef = useRef<HTMLElement>(null)
  const groupRef = useRef<HTMLUListElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const slides = SEYF_LANDING_RECORRIDO_SLIDES
  const n = slides.length

  useLayoutEffect(() => {
    if (shouldReduce) return
    const container = containerRef.current
    const group = groupRef.current
    const progress = progressRef.current
    if (!container || !group) return

    const endX = `-${(n - 1) * 100}vw`
    const horiz = animate(group, {
      transform: ['none', `translateX(${endX})`],
    })
    const stopScrollX = scroll(horiz, { target: container })

    const stopProgress = progress
      ? scroll(animate(progress, { scaleX: [0, 1] }), { target: container })
      : noop

    return () => {
      stopScrollX()
      stopProgress()
    }
  }, [shouldReduce, n])

  if (shouldReduce) {
    return (
      <article
        id="recorrido"
        className="scroll-mt-24 w-full border-y border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
      >
        <header
          className="flex min-h-[36vh] items-center justify-center px-4 py-12"
          style={{ minHeight: 'min(56vh, 520px)' }}
        >
          <h2 className="max-w-2xl text-center text-3xl font-black tracking-tight sm:text-4xl">{SEYF_LANDING_GALLERY_TITLE}</h2>
        </header>
        <div className="mx-auto max-w-3xl space-y-20 px-4 py-12">
          {slides.map((slide) => (
            <div key={slide.id}>
              <RecorridoSlideInner slide={slide} layout="stacked" />
            </div>
          ))}
        </div>
        <footer className="flex min-h-[28vh] items-center justify-center px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p className="max-w-lg leading-relaxed">{SEYF_LANDING_GALLERY_FOOTER}</p>
        </footer>
      </article>
    )
  }

  return (
    <article
      id="recorrido"
      className="scroll-mt-24 relative w-full max-w-[100vw] overflow-x-clip border-y border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
    >
      <header className="flex items-center justify-center px-4 py-10 text-center sm:py-14" style={{ minHeight: 'min(42vh, 440px)' }}>
        <h2 className="max-w-xl text-3xl font-black tracking-tight text-balance sm:text-4xl md:text-[2.75rem] md:leading-tight">
          {SEYF_LANDING_GALLERY_TITLE}
        </h2>
      </header>

      <section ref={containerRef} className="relative" style={{ height: `${n * 100}vh` }}>
        <div
          className="sticky z-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950"
          style={{
            top: `${HEADER_OFFSET_REM}rem`,
            height: `calc(100dvh - ${HEADER_OFFSET_REM}rem)`,
          }}
        >
          <ul ref={groupRef} className="flex h-full w-max">
            {slides.map((slide) => (
              <li
                key={slide.id}
                className="flex h-full w-screen shrink-0 flex-col px-4 pb-6 pt-3 sm:px-8 lg:px-12"
              >
                <RecorridoSlideInner slide={slide} layout="scroll" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="flex min-h-[32vh] items-center justify-center px-4 py-12 text-center sm:py-14">
        <p className="max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{SEYF_LANDING_GALLERY_FOOTER}</p>
      </footer>

      <div
        ref={progressRef}
        className="pointer-events-none fixed right-0 bottom-10 left-0 z-[35] mx-auto h-[5px] max-w-screen bg-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)] dark:bg-emerald-400"
        style={{ transformOrigin: 'left center' }}
        aria-hidden
      />
    </article>
  )
}
