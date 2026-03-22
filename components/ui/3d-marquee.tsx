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

/** Pool amplio para repartir en 3 columnas; scroll infinito duplica cada columna en runtime. */
export const MARQUEE_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618044733300-9472054094ee?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop&q=80',
] as const

const defaultImages: string[] = [...MARQUEE_IMAGE_POOL]

/** Reparto en 3 columnas por round-robin: evita bloques largos parecidos y que un mismo src quede seguido en vertical. */
function splitImagesIntoColumns(urls: string[], columnCount: number): string[][] {
  const cols: string[][] = Array.from({ length: columnCount }, () => [])
  urls.forEach((src, i) => {
    cols[i % columnCount].push(src)
  })
  return cols
}

const ThreeDMarquee = ({
  images = defaultImages,
  className,
}: ThreeDMarqueeProps) => {
  const chunks = splitImagesIntoColumns(images, 3)

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
              'top-0 right-[-55%] gap-2 sm:gap-4 md:gap-5',
              'xl:-top-[7.5rem] xl:right-[-45%]',
            )}
          >
            {chunks.map((subarray, colIndex) => {
              const loop = [...subarray, ...subarray]
              const goesDown = colIndex % 2 === 1
              const column = (
                <motion.figure
                  className="flex flex-col items-start gap-3 sm:gap-4 md:gap-6"
                  animate={{ y: ['0%', '-50%'] }}
                  transition={{
                    duration: 48 + colIndex * 10,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  {loop.map((src, imageIndex) => (
                    <div
                      className={cn(
                        'relative w-full shrink-0',
                        goesDown && 'scale-y-[-1]',
                      )}
                      key={`${colIndex}-${imageIndex}-${src}`}
                    >
                      <img
                        className="aspect-[4/3] h-full w-full select-none rounded-[4px] bg-muted object-cover sm:rounded-[6px] dark:bg-muted/80"
                        src={src}
                        draggable={false}
                        alt=""
                        loading={imageIndex < 4 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </div>
                  ))}
                </motion.figure>
              )
              return (
                <div
                  key={colIndex + 'marquee-col'}
                  className={cn('min-h-0 min-w-0', goesDown && 'scale-y-[-1]')}
                >
                  {column}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThreeDMarquee
