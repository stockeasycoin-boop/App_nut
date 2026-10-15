import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useApp } from '../state/store'

const COLORS = ['#ff6a3d', '#ff3d7f', '#5b6cff', '#f29a00', '#b05cf5', '#1fcf83']

/** One-shot burst from the top of the screen; replays whenever `confetti` increments. */
export function Confetti() {
  const { confetti } = useApp()
  const bits = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        x: (Math.random() - 0.5) * 360,
        y: 260 + Math.random() * 420,
        r: (Math.random() - 0.5) * 720,
        d: 1.4 + Math.random() * 0.9,
        w: 6 + Math.random() * 6,
        c: COLORS[i % COLORS.length],
        round: i % 3 === 0,
      })),
    [confetti],
  )
  if (!confetti) return null
  return (
    <div key={confetti} className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <motion.i
          key={i}
          style={{ background: b.c, width: b.w, height: b.round ? b.w : b.w * 0.45, borderRadius: b.round ? 99 : 2 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: b.x, y: b.y, rotate: b.r, opacity: 0 }}
          transition={{ duration: b.d, ease: [0.15, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  )
}
