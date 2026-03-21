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
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1618044733300-9472054094ee?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=300&fit=crop',
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
      className={cn('absolute inset-0 overflow-hidden', className)}
      style={{ perspective: '1000px' }}
    >
      <div
        style={{
          transform: 'rotateX(35deg) rotateZ(45deg)',
          transformOrigin: 'center center',
          position: 'absolute',
          top: '-30%',
          left: '-30%',
          width: '160%',
          height: '160%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
        }}
      >
        {chunks.map((subarray, colIndex) => (
          <motion.div
            animate={{ y: colIndex % 2 === 0 ? 80 : -80 }}
            transition={{
              duration: colIndex % 2 === 0 ? 12 : 18,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
            }}
            key={colIndex + 'marquee'}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {subarray.map((src, imageIndex) => (
              <div key={imageIndex + src} style={{ flexShrink: 0 }}>
                <img
                  src={src}
                  draggable={false}
                  alt={`Image ${imageIndex + 1}`}
                  style={{ borderRadius: '6px', width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default ThreeDMarquee
