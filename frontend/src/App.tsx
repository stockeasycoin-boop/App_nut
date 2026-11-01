import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
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
import { FoodSearch } from './screens/Scan'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Welcome } from './screens/Welcome'
import { Onboarding } from './screens/Onboarding'
import { onBackButton, setSystemBars } from './lib/native'

const SCREENS = {
  today: Today,
  insights: Insights,
  nutrients: NutrientsScreen,
  profile: Profile,
}

function Shell() {
  const { tab, setTab, foodSearchOpen, closeFoodSearch, logFood, scanOpen, closeScan, openMeal, setOpenMeal, theme, signedIn, onboarded } = useApp()

  // Android back button closes the top-most layer, then returns to Today, then exits.
  const layers = useRef({ foodSearchOpen, openMeal, scanOpen, tab })
  useEffect(() => {
    layers.current = { foodSearchOpen, openMeal, scanOpen, tab }
  })
  useEffect(
    () =>
      onBackButton(() => {
        const l = layers.current
        if (l.foodSearchOpen) closeFoodSearch()
        else if (l.openMeal) setOpenMeal(null)
        else if (l.scanOpen) closeScan()
        else if (l.tab !== 'today') setTab('today')
        else return false
        return true
      }),
    [closeFoodSearch, setOpenMeal, closeScan, setTab],
  )

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => setSystemBars(scanOpen || theme === 'dark' || (theme === 'system' && media.matches))
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme, scanOpen])
  const scrollRef = useRef<HTMLDivElement>(null)
  const Screen = SCREENS[tab]
  useEffect(() => scrollRef.current?.scrollTo({ top: 0 }), [tab])
  return (
    <div className="stage">
      <Aside />
      <div className="device">
        {!signedIn ? (
          <Welcome />
        ) : !onboarded ? (
          <Onboarding />
        ) : (
          <MainApp scrollRef={scrollRef} Screen={Screen} tab={tab} foodSearchOpen={foodSearchOpen} closeFoodSearch={closeFoodSearch} logFood={logFood} />
        )}
        <div id="overlay-root" />
        <Toast />
        <Confetti />
      </div>
    </div>
  )
}

function MainApp({
  scrollRef,
  Screen,
  tab,
  foodSearchOpen,
  closeFoodSearch,
  logFood,
}: {
  scrollRef: RefObject<HTMLDivElement | null>
  Screen: () => ReactNode
  tab: string
  foodSearchOpen: boolean
  closeFoodSearch: () => void
  logFood: ReturnType<typeof useApp>['logFood']
}) {
  return (
    <>
      <div className="scroll" ref={scrollRef}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
            <Screen />
          </motion.div>
        </AnimatePresence>
      </div>
      <TabBar />
      <MealSheet />
      <AnimatePresence>
        {foodSearchOpen && (
          <>
            <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeFoodSearch} />
            <FoodSearch
              title="Log a food"
              onClose={closeFoodSearch}
              onPick={(f) => {
                closeFoodSearch()
                logFood(f, f.servingG)
              }}
            />
          </>
        )}
      </AnimatePresence>
      <ScanFlow />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ErrorBoundary>
  )
}
