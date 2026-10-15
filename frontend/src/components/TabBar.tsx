import { motion } from 'motion/react'
import { BarChart3, Home, Leaf, ScanLine, UserRound } from 'lucide-react'
import { useApp, type Tab } from '../state/store'

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'today', label: 'Today', Icon: Home },
  { id: 'insights', label: 'Insights', Icon: BarChart3 },
  { id: 'nutrients', label: 'Nutrients', Icon: Leaf },
  { id: 'profile', label: 'Goals', Icon: UserRound },
]

export function TabBar() {
  const { tab, setTab, openScan } = useApp()
  const btn = ({ id, label, Icon }: (typeof TABS)[number]) => (
    <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
      <Icon size={22} strokeWidth={tab === id ? 2.4 : 2} />
      {label}
      {tab === id && <motion.i layoutId="tab-dot" className="tab-dot" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
    </button>
  )
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.slice(0, 2).map(btn)}
      <motion.button className="scan-fab" onClick={openScan} whileTap={{ scale: 0.9 }} whileHover={{ y: -2 }} aria-label="Scan a meal">
        <ScanLine size={28} strokeWidth={2.3} />
      </motion.button>
      {TABS.slice(2).map(btn)}
    </nav>
  )
}
