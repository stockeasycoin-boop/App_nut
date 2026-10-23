import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'

interface RingProps {
  size: number
  stroke: number
  progress: number
  color?: string
  gradient?: [string, string]
  track?: string
  delay?: number
  children?: ReactNode
}

/** Circular progress ring that draws itself in. Values above 1 show a lap marker. */
export function Ring({ size, stroke, progress, color = 'var(--brand)', gradient, track = 'var(--track)', delay = 0, children }: RingProps) {
  const id = useId()
  const r = (size - stroke) / 2
  const p = Math.max(0, Math.min(progress, 1))
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        {gradient && (
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={gradient[0]} />
              <stop offset="100%" stopColor={gradient[1]} />
            </linearGradient>
          </defs>
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={gradient ? `url(#${id})` : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: p === 0 ? 0.0001 : p, opacity: p === 0 ? 0 : 1 }}
          transition={{ duration: 1.3, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {children && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
      )}
    </div>
  )
}
