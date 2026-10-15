import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { AppProvider, useApp } from './state/store'
import { TabBar } from './components/TabBar'
import { Toast } from './components/Toast'
import { Today } from './screens/Today'
import { Insights } from './screens/Insights'
import { NutrientsScreen } from './screens/Nutrients'
import { Profile } from './screens/Profile'
import { ScanFlow } from './screens/Scan'
import { MealSheet } from './screens/MealSheet'
import { Aside } from './components/Aside'
import { Confetti } from './components/Confetti'

const SCREENS = { today: Today, insights: Insights, nutrients: NutrientsScreen, profile: Profile }

function Shell() {
  const { tab } = useApp()
  const scrollRef = useRef<HTMLDivElement>(null)
  const Screen = SCREENS[tab]
  useEffect(() => scrollRef.current?.scrollTo({ top: 0 }), [tab])
  return (
    <div className="stage">
      <Aside />
      <div className="device">
        <div className="scroll" ref={scrollRef}>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
              <Screen />
            </motion.div>
          </AnimatePresence>
        </div>
        <TabBar />
        <MealSheet />
        <ScanFlow />
        <Toast />
        <Confetti />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
