import { animate, useMotionValue, useTransform, motion } from 'motion/react'
import { useEffect } from 'react'

/** Counts up/down to `value` whenever it changes. */
export function AnimatedNumber({ value, decimals = 0, duration = 1.1 }: { value: number; decimals?: number; duration?: number }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) =>
    v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
  )
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [value, duration, mv])
  return <motion.span>{text}</motion.span>
}
