import { AnimatePresence, motion } from 'motion/react'
import { useApp } from '../state/store'

export function Toast() {
  const { toast } = useApp()
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className="toast"
          role="status"
          initial={{ y: -80, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          <span className="toast-emoji">{toast.emoji ?? '✅'}</span>
          <div>
            <b>{toast.title}</b>
            {toast.body && <span>{toast.body}</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
