import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MEAL_META, type Meal, type MealType } from '../data/mock'
import { DEFAULT_GOALS, type NutrientKey, type Nutrients } from '../data/nutrients'
import { dayTotal, fmt } from '../lib/nutrition'
import {
  deleteMeal,
  fetchDay,
  fetchHistory,
  fetchProfile,
  foodItem,
  logMeal,
  type Food,
  isServerMode,
  localDate,
  saveWater,
  type History,
  type Profile,
} from '../lib/api'

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

type LoadState = 'loading' | 'ready' | 'error'

interface AppState {
  tab: Tab
  setTab: (t: Tab) => void
  status: LoadState
  serverMode: boolean
  reload: () => void
  meals: Meal[]
  totals: Nutrients
  goals: Record<NutrientKey, number>
  setGoals: (g: Record<NutrientKey, number>) => void
  profile: Profile | null
  setProfile: (p: Profile) => void
  history: History | null
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
  foodSearchOpen: boolean
  openFoodSearch: () => void
  closeFoodSearch: () => void
  /** Log one reference food as its own meal, picking the meal type from the clock. */
  logFood: (food: Food, grams: number, name?: string, photo?: string) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>('today')
  const [status, setStatus] = useState<LoadState>('loading')
  const [serverMode, setServerMode] = useState(isServerMode())
  const [meals, setMeals] = useState<Meal[]>([])
  const [goals, setGoalsState] = useState(DEFAULT_GOALS)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [history, setHistory] = useState<History | null>(null)
  const [water, setWaterState] = useState(0)
  const [scanOpen, setScanOpen] = useState(false)
  const [openMeal, setOpenMeal] = useState<Meal | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [confetti, setConfetti] = useState(0)
  const [foodSearchOpen, setFoodSearchOpen] = useState(false)
  const goalsRef = useRef(goals)

  useEffect(() => {
    goalsRef.current = goals
  }, [goals])

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

  const showToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now()
    setToast({ ...t, id })
    setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), 3400)
  }, [])

  const refreshHistory = useCallback((g?: Record<NutrientKey, number>) => {
    fetchHistory(30, g ?? goalsRef.current)
      .then(setHistory)
      .catch(() => setHistory(null))
  }, [])

  const reload = useCallback(() => {
    setStatus('loading')
    setServerMode(isServerMode())
    Promise.all([fetchDay(), fetchProfile()])
      .then(([day, p]) => {
        setMeals(day.meals)
        setGoalsState(day.goals)
        setWaterState(day.water)
        setProfile(p)
        setStatus('ready')
        refreshHistory(day.goals)
      })
      .catch((e: Error) => {
        setStatus('error')
        showToast({ emoji: '⚠️', title: 'Couldn’t load your day', body: e.message })
      })
  }, [refreshHistory, showToast])

  useEffect(reload, [reload])

  // Roll over to the new day if the app stays open past midnight.
  const dayRef = useRef(localDate())
  useEffect(() => {
    const t = setInterval(() => {
      if (localDate() !== dayRef.current) {
        dayRef.current = localDate()
        reload()
      }
    }, 60_000)
    return () => clearInterval(t)
  }, [reload])

  const totals = useMemo(() => dayTotal(meals), [meals])

  const setWater = (n: number) => {
    const prev = water
    setWaterState(n)
    saveWater(n).catch((e: Error) => {
      setWaterState(prev)
      showToast({ emoji: '⚠️', title: 'Water not saved', body: e.message })
    })
  }

  const removeMeal = (id: string) => {
    const removed = meals.find((m) => m.id === id)
    setMeals((list) => list.filter((m) => m.id !== id))
    if (id.startsWith('draft-')) return // never reached the server
    deleteMeal(id)
      .then(() => refreshHistory())
      .catch((e: Error) => {
        if (removed) setMeals((list) => [...list, removed])
        showToast({ emoji: '⚠️', title: 'Couldn’t delete meal', body: e.message })
      })
  }

  const logFood = (food: Food, grams: number, name = food.name, photo?: string) => {
    const h = new Date().getHours()
    const type: MealType = h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner'
    const item = foodItem(food, grams)
    const draft: Meal = {
      id: `draft-${Date.now()}`,
      type,
      name,
      time: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toUpperCase(),
      photo,
      score: 0,
      items: [item],
    }
    setMeals((list) => [...list, draft])
    logMeal(draft)
      .then((saved) => {
        setMeals((list) => list.map((x) => (x.id === draft.id ? { ...saved, photo: saved.photo ?? photo } : x)))
        refreshHistory()
        showToast({ emoji: food.emoji, title: `${name} added to ${MEAL_META[type].label.toLowerCase()}`, body: `${fmt(item.nutrients.calories ?? 0)} kcal · ${fmt(item.nutrients.protein ?? 0)} g protein` })
      })
      .catch((e: Error) => {
        setMeals((list) => list.filter((x) => x.id !== draft.id))
        showToast({ emoji: '⚠️', title: 'Not added', body: e.message })
      })
  }

  const openScan = useCallback(() => setScanOpen(true), [])
  const closeScan = useCallback(() => setScanOpen(false), [])
  const openFoodSearch = useCallback(() => setFoodSearchOpen(true), [])
  const closeFoodSearch = useCallback(() => setFoodSearchOpen(false), [])

  const value: AppState = {
    tab,
    setTab,
    status,
    serverMode,
    reload,
    meals,
    totals,
    goals,
    setGoals: (g) => {
      setGoalsState(g)
      refreshHistory(g)
    },
    profile,
    setProfile,
    history,
    addMeal: (m) => setMeals((list) => [...list, m]),
    replaceMeal: (id, m) => {
      setMeals((list) => list.map((x) => (x.id === id ? m : x)))
      refreshHistory()
    },
    removeMeal,
    water,
    setWater,
    scanOpen,
    openScan,
    closeScan,
    openMeal,
    setOpenMeal,
    toast,
    showToast,
    theme,
    setTheme,
    confetti,
    celebrate: () => setConfetti((n) => n + 1),
    foodSearchOpen,
    openFoodSearch,
    closeFoodSearch,
    logFood,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
