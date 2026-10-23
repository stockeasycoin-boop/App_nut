/**
 * API client.
 *
 * Server mode: the backend URL comes from the in-app setting (Goals → Server), falling
 * back to `VITE_API_URL` at build time. Demo mode (no server): everything runs on the
 * device — meals, water, goals and profile persist in local storage, nutrient values
 * come from the same reference food database the backend uses, and photo analysis
 * returns a sample result (clearly labelled in the UI).
 */
import foodsJson from '../../../backend/app/data/foods.json'
import { DEMO_SCAN, NUTRIENT_HEATMAP, TODAY_MEALS, WEEK_HISTORY, type FoodItem, type Meal, type MealType } from '../data/mock'
import { DEFAULT_GOALS, type NutrientKey, type Nutrients } from '../data/nutrients'
import { dayTotal, mealTotal, microCoverage } from './nutrition'
import { MINERAL_KEYS, VITAMIN_KEYS } from '../data/nutrients'

// ───── Server URL ─────

const SERVER_KEY = 'nutrilens-server'

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — setting lasts for this session only */
  }
}

let serverUrl: string | null = normaliseUrl(stored(SERVER_KEY) ?? (import.meta.env.VITE_API_URL as string | undefined) ?? '')

export function normaliseUrl(url: string): string | null {
  const u = url.trim().replace(/\/+$/, '')
  if (!u) return null
  return /^https?:\/\//i.test(u) ? u : `http://${u}`
}

export const getServerUrl = () => serverUrl
export const isServerMode = () => serverUrl !== null

export function setServerUrl(url: string | null) {
  serverUrl = url ? normaliseUrl(url) : null
  store(SERVER_KEY, serverUrl ?? '')
}

/** GET /health on a candidate URL — used by the server setting before saving. */
export async function testServer(url: string): Promise<boolean> {
  const base = normaliseUrl(url)
  if (!base) return false
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(`${base}/health`, { signal: ctrl.signal })
    clearTimeout(t)
    return res.ok && (await res.json())?.status === 'ok'
  } catch {
    return false
  }
}

// ───── Shared types ─────

export interface ScanResult {
  analysisId?: string
  name: string
  photo: string
  confidence: number
  score: number
  items: FoodItem[]
  demo?: boolean
}

export type Sex = 'male' | 'female'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'
export type Aim = 'lose' | 'maintain' | 'gain'
export type Preset = 'balanced' | 'protein' | 'lowcarb' | 'keto'

export interface Profile {
  name: string
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  targetKg: number | null
  activity: Activity
  aim: Aim
  macroPreset: Preset
  diets: string[]
  maintenanceKcal: number
}

export interface Food {
  id: string
  name: string
  emoji: string
  servingG: number
  per100g: Nutrients
}

export interface HistoryDay {
  date: string
  totals: Nutrients
  micro: number
  meals: number
}

export interface History {
  days: HistoryDay[]
  percentOfGoal: Partial<Record<NutrientKey, number[]>>
}

export interface DayData {
  meals: Meal[]
  goals: Record<NutrientKey, number>
  water: number
}

export class ApiError extends Error {}

// ───── Helpers ─────

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const timeLabel = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toUpperCase()

const absolute = (path: string) => (/^https?:/.test(path) ? path : `${serverUrl}${path}`)

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${serverUrl}${path}`, init)
  } catch {
    throw new ApiError('Can’t reach the NutriLens server. Check your connection or the server address.')
  }
  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => (typeof b?.detail === 'string' ? b.detail : null))
      .catch(() => null)
    throw new ApiError(detail ?? `Something went wrong (${res.status}).`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

// ───── Reference foods (shared with the backend) ─────

interface RawFood {
  id: string
  name: string
  emoji: string
  serving_g: number
  aliases: string[]
  per100g: Nutrients
}
const LOCAL_FOODS: Food[] = (foodsJson as { foods: RawFood[] }).foods.map((f) => ({
  id: f.id,
  name: f.name,
  emoji: f.emoji,
  servingG: f.serving_g,
  per100g: f.per100g,
}))
const LOCAL_ALIASES = new Map((foodsJson as { foods: RawFood[] }).foods.map((f) => [f.id, [f.name, ...f.aliases].map((a) => a.toLowerCase())]))

export const localFood = (id: string) => LOCAL_FOODS.find((f) => f.id === id)

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const out: Nutrients = {}
  for (const [k, v] of Object.entries(n)) out[k as NutrientKey] = (v ?? 0) * factor
  return out
}

/** A meal item for `grams` of a reference food. */
export function foodItem(food: Food, grams = food.servingG): FoodItem {
  return {
    id: `food:${food.id}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    foodId: food.id,
    name: food.name,
    emoji: food.emoji,
    grams,
    nutrients: scaleNutrients(food.per100g, grams / 100),
    portion: 1,
  }
}

// ───── Wire types (camelCase JSON from the backend) ─────

interface MealOut {
  id: number
  type: MealType
  name: string
  eatenAt: string
  photoUrl: string | null
  score: number
  items: { id: number; name: string; emoji: string; grams: number; foodId: string | null; nutrients: Nutrients }[]
}

function toMeal(m: MealOut): Meal {
  return {
    id: String(m.id),
    type: m.type,
    name: m.name,
    time: timeLabel(new Date(m.eatenAt)),
    photo: m.photoUrl ? absolute(m.photoUrl) : undefined,
    score: m.score,
    items: m.items.map((i) => ({
      id: String(i.id),
      name: i.name,
      emoji: i.emoji,
      grams: i.grams,
      nutrients: i.nutrients,
      portion: 1,
      foodId: i.foodId ?? undefined,
    })),
  }
}

// ───── Demo-mode storage ─────

const DEMO_KEY = 'nutrilens-demo-v1'

interface DemoState {
  days: Record<string, { meals: Meal[]; water: number }>
  goals: Record<NutrientKey, number>
  profile: Profile
}

const DEMO_PROFILE: Profile = {
  name: 'Abhi',
  sex: 'male',
  age: 28,
  heightCm: 176,
  weightKg: 72,
  targetKg: 68,
  activity: 'moderate',
  aim: 'lose',
  macroPreset: 'balanced',
  diets: ['Eggetarian'],
  maintenanceKcal: 2600,
}

function demo(): DemoState {
  const raw = stored(DEMO_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as DemoState
    } catch {
      /* corrupted — start fresh */
    }
  }
  return { days: { [localDate()]: { meals: TODAY_MEALS, water: 5 } }, goals: DEFAULT_GOALS, profile: DEMO_PROFILE }
}

function saveDemo(update: (s: DemoState) => void) {
  const s = demo()
  update(s)
  store(DEMO_KEY, JSON.stringify(s))
}

export function healthScore(n: Nutrients): number {
  // Same formula as backend/app/nutrition.py:health_score.
  const kcal = n.calories ?? 0
  if (kcal <= 0) return 0
  const per = 100 / kcal
  const ref: Partial<Record<NutrientKey, number>> = { vitA: 900, vitC: 90, vitD: 15, vitE: 15, vitK: 120, b1: 1.2, b2: 1.3, b3: 16, b6: 1.3, b12: 2.4, folate: 400, calcium: 1000, iron: 8, magnesium: 400, potassium: 3400, zinc: 11, selenium: 55, phosphorus: 700 }
  const keys = Object.keys(ref) as NutrientKey[]
  const micro = keys.reduce((a, k) => a + Math.min(((n[k] ?? 0) * per) / (ref[k]! * 0.1), 1), 0) / keys.length
  const raw =
    40 +
    15 * Math.min(((n.protein ?? 0) * per) / 5, 1) +
    20 * Math.min(((n.fiber ?? 0) * per) / 3, 1) +
    35 * micro -
    15 * Math.min(((n.sugar ?? 0) * per) / 10, 1) -
    10 * Math.min(((n.satFat ?? 0) * per) / 4, 1) -
    10 * Math.min(((n.sodium ?? 0) * per) / 400, 1)
  return Math.max(0, Math.min(100, Math.round(raw)))
}

// ───── Endpoints ─────

/** Today's meals, goals and water. */
export async function fetchDay(date = localDate()): Promise<DayData> {
  if (!isServerMode()) {
    const s = demo()
    const d = s.days[date] ?? { meals: [], water: 0 }
    return { meals: d.meals, goals: s.goals, water: d.water }
  }
  const d = await request<{ meals: MealOut[]; goals: Record<NutrientKey, number>; waterGlasses: number }>(`/v1/days/${date}`)
  return { meals: d.meals.map(toMeal), goals: { ...DEFAULT_GOALS, ...d.goals }, water: d.waterGlasses }
}

/** POST /v1/meals/analyze — upload the photo, get detected foods with nutrients. */
export async function analyzeMealPhoto(photo: Blob, previewUrl: string): Promise<ScanResult> {
  if (!isServerMode()) {
    await wait(3200)
    return { ...DEMO_SCAN, photo: previewUrl, items: DEMO_SCAN.items.map((i) => ({ ...i })), demo: true }
  }
  const form = new FormData()
  form.append('photo', photo, 'meal.jpg')
  const a = await request<{
    id: string
    name: string
    photoUrl: string
    confidence: number
    score: number
    items: { id: string; name: string; emoji: string; grams: number; confidence: number; pin: { x: number; y: number }; foodId: string | null; source: string; nutrients: Nutrients }[]
  }>('/v1/meals/analyze', { method: 'POST', body: form })
  return {
    analysisId: a.id,
    name: a.name,
    photo: absolute(a.photoUrl),
    confidence: a.confidence,
    score: a.score,
    items: a.items.map((i) => ({
      id: i.id,
      name: i.name,
      emoji: i.emoji,
      grams: i.grams,
      nutrients: i.nutrients,
      portion: 1,
      // Items the database doesn't know are model estimates — surface them as "check me".
      confidence: i.source === 'estimate' ? Math.min(i.confidence, 0.8) : i.confidence,
      pin: i.pin,
    })),
  }
}

export interface MealDraft {
  type: MealType
  name: string
  photo?: string
  items: FoodItem[]
}

/** POST /v1/meals — the server recomputes nutrients from the analysis/food ids and portions. */
export async function logMeal(draft: MealDraft, analysisId?: string): Promise<Meal> {
  const now = new Date()
  if (!isServerMode()) {
    const meal: Meal = {
      id: `local-${now.getTime()}`,
      type: draft.type,
      name: draft.name,
      time: timeLabel(now),
      photo: draft.photo,
      items: draft.items,
      score: healthScore(mealTotal({ ...draft, id: '', time: '', score: 0 })),
    }
    saveDemo((s) => {
      const d = (s.days[localDate(now)] ??= { meals: [], water: 0 })
      d.meals.push(meal)
    })
    return meal
  }
  const created = await request<MealOut>(
    '/v1/meals',
    json('POST', {
      type: draft.type,
      name: draft.name,
      localDate: localDate(now),
      eatenAt: now.toISOString(),
      analysisId,
      // Database foods go by id + grams; detected items by analysis item id + portion.
      items: draft.items.map((i) =>
        i.foodId ? { foodId: i.foodId, grams: Math.round(i.grams * i.portion * 10) / 10 } : { analysisItemId: i.id, portion: i.portion },
      ),
    }),
  )
  return toMeal(created)
}

export async function deleteMeal(id: string): Promise<void> {
  if (!isServerMode()) {
    saveDemo((s) => {
      for (const d of Object.values(s.days)) d.meals = d.meals.filter((m) => m.id !== id)
    })
    return
  }
  await request<void>(`/v1/meals/${id}`, { method: 'DELETE' })
}

export async function saveWater(glasses: number, date = localDate()): Promise<void> {
  if (!isServerMode()) {
    saveDemo((s) => {
      ;(s.days[date] ??= { meals: [], water: 0 }).water = glasses
    })
    return
  }
  await request(`/v1/days/${date}/water`, json('PUT', { glasses }))
}

export async function searchFoods(q: string): Promise<Food[]> {
  if (!isServerMode()) {
    const query = q.trim().toLowerCase()
    if (!query) return LOCAL_FOODS.slice(0, 12)
    return LOCAL_FOODS.filter((f) => LOCAL_ALIASES.get(f.id)!.some((a) => a.includes(query) || query.includes(a))).slice(0, 12)
  }
  return request<Food[]>(`/v1/foods?q=${encodeURIComponent(q)}&limit=12`)
}

/** Last `days` days ending today, oldest first. */
export async function fetchHistory(days: number, goals: Record<NutrientKey, number>): Promise<History> {
  const end = localDate()
  if (isServerMode()) {
    const r = await request<{
      days: { date: string; totals: Nutrients; microCoverage: number; mealCount: number }[]
      percentOfGoal: Partial<Record<NutrientKey, number[]>>
    }>(`/v1/insights?end=${end}&days=${days}`)
    return {
      days: r.days.map((d) => ({ date: d.date, totals: d.totals, micro: d.microCoverage, meals: d.mealCount })),
      percentOfGoal: r.percentOfGoal,
    }
  }
  // Demo: real data for days logged on this device, sample history before that.
  const s = demo()
  const micro = [...VITAMIN_KEYS, ...MINERAL_KEYS]
  const out: HistoryDay[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = localDate(d)
    const logged = s.days[key]
    if (logged) {
      const t = dayTotal(logged.meals)
      out.push({ date: key, totals: t, micro: logged.meals.length ? microCoverage(t, goals, micro) : 0, meals: logged.meals.length })
    } else {
      const h = WEEK_HISTORY[(days - i) % WEEK_HISTORY.length]
      out.push({ date: key, totals: { calories: h.calories, protein: h.protein, carbs: h.carbs, fat: h.fat, fiber: h.fiber }, micro: h.micro / 100, meals: 3 })
    }
  }
  const percentOfGoal: Partial<Record<NutrientKey, number[]>> = {}
  for (const row of NUTRIENT_HEATMAP) {
    const k = row.key as NutrientKey
    const offset = row.values.length - out.length
    percentOfGoal[k] = out.map((d, idx) =>
      s.days[d.date] ? Math.round((100 * (d.totals[k] ?? 0)) / goals[k]) : row.values[(((idx + offset) % row.values.length) + row.values.length) % row.values.length],
    )
  }
  return { days: out, percentOfGoal }
}

export async function fetchProfile(): Promise<Profile> {
  if (!isServerMode()) return demo().profile
  return request<Profile>('/v1/profile')
}

/**
 * Save profile and goals together. When `customCalories` is set the calorie target and
 * macro grams are pinned; otherwise goals are recomputed from the profile.
 */
export async function saveProfileAndGoals(profile: Profile, customCalories: number | null): Promise<{ profile: Profile; goals: Record<NutrientKey, number> }> {
  const kcal = customCalories ?? computeCalories(profile)
  const macros = macroGrams(kcal, profile.macroPreset)
  if (!isServerMode()) {
    let goals = DEFAULT_GOALS
    saveDemo((s) => {
      s.profile = { ...profile, maintenanceKcal: computeCalories({ ...profile, aim: 'maintain' }) }
      s.goals = { ...s.goals, calories: kcal, ...macros, fiber: Math.round((kcal / 1000) * 14) }
      goals = s.goals
    })
    return { profile: demo().profile, goals }
  }
  const { maintenanceKcal: _derived, ...body } = profile
  void _derived
  const saved = await request<Profile>('/v1/profile', json('PUT', body))
  let goals: { values: Record<NutrientKey, number> }
  if (customCalories !== null) goals = await request('/v1/goals', json('PATCH', { values: { calories: kcal, ...macros } }))
  else goals = await request('/v1/goals/reset', { method: 'POST' })
  return { profile: saved, goals: { ...DEFAULT_GOALS, ...goals.values } }
}

// Mirrors backend/app/nutrition.py so the UI can preview targets before saving.
const ACTIVITY: Record<Activity, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 }
const AIM: Record<Aim, number> = { lose: -500, maintain: 0, gain: 300 }
export const PRESETS: Record<Preset, { label: string; p: number; c: number; f: number }> = {
  balanced: { label: 'Balanced', p: 25, c: 45, f: 30 },
  protein: { label: 'High protein', p: 35, c: 40, f: 25 },
  lowcarb: { label: 'Low carb', p: 30, c: 25, f: 45 },
  keto: { label: 'Keto', p: 25, c: 5, f: 70 },
}

export function computeCalories(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg' | 'activity' | 'aim'>) {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
  const kcal = Math.max(p.sex === 'male' ? 1500 : 1200, bmr * ACTIVITY[p.activity] + AIM[p.aim])
  return Math.round(kcal / 50) * 50
}

export function macroGrams(kcal: number, preset: Preset) {
  const x = PRESETS[preset]
  return { protein: Math.round((kcal * x.p) / 400), carbs: Math.round((kcal * x.c) / 400), fat: Math.round((kcal * x.f) / 900) }
}

