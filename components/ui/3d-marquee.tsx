'use client'

/**
 * @author: @emerald-ui
 * @description: A 3D marquee component that rotates images in a 3D space.
 * @version: 1.0.0
 * @date: 2026-02-12
 * @license: MIT
 * @website: https://emerald-ui.com
 */
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ThreeDMarqueeProps {
  images?: string[]
  className?: string
}

const defaultImages = [
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1618044733300-9472054094ee?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=400&h=300&fit=crop',
]

const ThreeDMarquee = ({
  images = defaultImages,
  className,
}: ThreeDMarqueeProps) => {
  const chunkSize = Math.ceil(images.length / 3)
  const chunks = Array.from({ length: 3 }, (_, colIndex) => {
    const start = colIndex * chunkSize
    return images.slice(start, start + chunkSize)
  })

  return (
    <div
      className={cn(
        'pointer-events-none relative mx-auto block w-full overflow-hidden rounded-md',
        'min-h-[min(95svh,32rem)] sm:min-h-[36rem] md:min-h-[42rem] xl:min-h-0 xl:h-[56rem]',
        className,
      )}
    >
      <div className="flex size-full min-h-0 items-center justify-center">
        <div
          className={cn(
            'aspect-square w-full max-w-full min-w-0 shrink-0',
            'scale-[1.95] sm:scale-[1.85] md:scale-[1.72] lg:scale-[1.62]',
            'xl:size-[min(48rem,90vmin)] xl:max-w-none xl:scale-[1.78]',
          )}
        >
          <div
            style={{
              transform: 'rotateX(45deg) rotateY(0deg) rotateZ(45deg)',
            }}
            className={cn(
              'relative grid size-full origin-top-left grid-cols-3 [transform-style:preserve-3d]',
              // Móvil: menos offset y hueco; xl: alineación tipo demo original
              'top-0 right-[-55%] gap-2 sm:gap-4 md:gap-5',
              'xl:-top-[7.5rem] xl:right-[-45%]',
            )}
          >
            {chunks.map((subarray, colIndex) => (
              <motion.figure
                animate={{ y: colIndex % 2 === 0 ? 60 : -60 }}
                transition={{
                  duration: colIndex % 2 === 0 ? 10 : 15,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }}
                key={colIndex + 'marquee'}
                className="flex flex-col items-start gap-3 sm:gap-4 md:gap-6"
              >
                {subarray.map((src, imageIndex) => (
                  <div className="relative w-full" key={imageIndex + src}>
                    <img
                      className="aspect-[4/3] h-full w-full select-none rounded-[4px] bg-muted object-cover sm:rounded-[6px] dark:bg-muted/80"
                      src={src}
                      draggable={false}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ))}
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThreeDMarquee
