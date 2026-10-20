import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { TODAY_MEALS, type Meal } from '../data/mock'
import { DEFAULT_GOALS, type NutrientKey, type Nutrients } from '../data/nutrients'
import { dayTotal } from '../lib/nutrition'
import { API_ENABLED, deleteMeal, fetchDay, saveWater } from '../lib/api'

export type Tab = 'today' | 'insights' | 'nutrients' | 'profile'
export type Theme = 'system' | 'light' | 'dark'

const THEME_KEY = 'nutrilens-theme'

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

interface Toast {
  id: number
  title: string
  body?: string
  emoji?: string
}

interface AppState {
  tab: Tab
  setTab: (t: Tab) => void
  meals: Meal[]
  totals: Nutrients
  goals: Record<NutrientKey, number>
  setGoal: (k: NutrientKey, v: number) => void
  setGoals: (g: Partial<Record<NutrientKey, number>>) => void
  addMeal: (m: Meal) => void
  replaceMeal: (id: string, m: Meal) => void
  removeMeal: (id: string) => void
  water: number
  setWater: (n: number) => void
  scanOpen: boolean
  openScan: () => void
  closeScan: () => void
  openMeal: Meal | null
  setOpenMeal: (m: Meal | null) => void
  toast: Toast | null
  showToast: (t: Omit<Toast, 'id'>) => void
  theme: Theme
  setTheme: (t: Theme) => void
  confetti: number
  celebrate: () => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>('today')
  const [meals, setMeals] = useState<Meal[]>(API_ENABLED ? [] : TODAY_MEALS)
  const [goals, setGoalsState] = useState(DEFAULT_GOALS)
  const [water, setWaterState] = useState(API_ENABLED ? 0 : 5)
  const [scanOpen, setScanOpen] = useState(false)
  const [openMeal, setOpenMeal] = useState<Meal | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const [theme, setTheme] = useState<Theme>(readTheme)
  const [confetti, setConfetti] = useState(0)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, [theme])

  const totals = useMemo(() => dayTotal(meals), [meals])

  const showToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now()
    setToast({ ...t, id })
    setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), 3200)
  }, [])

  useEffect(() => {
    fetchDay()
      .then((day) => {
        if (!day) return
        setMeals(day.meals)
        setGoalsState((g) => ({ ...g, ...day.goals }))
        setWaterState(day.water)
      })
      .catch((e: Error) => showToast({ emoji: '⚠️', title: 'Couldn’t load today', body: e.message }))
  }, [showToast])

  const setWater = (n: number) => {
    setWaterState(n)
    saveWater(n).catch((e: Error) => showToast({ emoji: '⚠️', title: 'Water not saved', body: e.message }))
  }

  const removeMeal = (id: string) => {
    const before = meals
    setMeals((list) => list.filter((m) => m.id !== id))
    if (id.startsWith('draft-')) return // never reached the server
    deleteMeal(id).catch((e: Error) => {
      setMeals(before)
      showToast({ emoji: '⚠️', title: 'Couldn’t delete meal', body: e.message })
    })
  }

  const value: AppState = {
    tab,
    setTab,
    meals,
    totals,
    goals,
    setGoal: (k, v) => setGoalsState((g) => ({ ...g, [k]: v })),
    setGoals: (patch) => setGoalsState((g) => ({ ...g, ...patch })),
    addMeal: (m) => setMeals((list) => [...list, m]),
    replaceMeal: (id, m) => setMeals((list) => list.map((x) => (x.id === id ? m : x))),
    removeMeal,
    water,
    setWater,
    scanOpen,
    openScan: () => setScanOpen(true),
    closeScan: () => setScanOpen(false),
    openMeal,
    setOpenMeal,
    toast,
    showToast,
    theme,
    setTheme,
    confetti,
    celebrate: () => setConfetti((n) => n + 1),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
