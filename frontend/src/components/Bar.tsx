import { motion } from 'motion/react'

export function Bar({ value, color, height = 8, delay = 0, marker }: { value: number; color: string; height?: number; delay?: number; marker?: boolean }) {
  const w = Math.max(0, Math.min(value, 1)) * 100
  return (
    <div className="bar" style={{ height }}>
      <motion.span
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${w}%` }}
        transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
      />
      {marker && <i style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, background: 'rgba(18,21,28,.18)' }} />}
    </div>
  )
}
