/**
 * API client. With `VITE_API_URL` set (e.g. http://localhost:8000) every call goes to
 * the NutriLens backend; without it the app runs on the bundled mock data, so the
 * front end can still be developed on its own.
 */
import { DEMO_SCAN, type FoodItem, type Meal, type MealType } from '../data/mock'
import type { NutrientKey, Nutrients } from '../data/nutrients'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
export const API_ENABLED = Boolean(API_URL)

export interface ScanResult {
  analysisId?: string
  name: string
  photo: string
  confidence: number
  score: number
  items: FoodItem[]
}

export class ApiError extends Error {}

// ───── Wire types (camelCase JSON from the backend) ─────

interface AnalysisItemOut {
  id: string
  name: string
  emoji: string
  grams: number
  confidence: number
  pin: { x: number; y: number }
  foodId: string | null
  source: 'database' | 'estimate'
  nutrients: Nutrients
}

interface AnalysisOut {
  id: string
  name: string
  photoUrl: string
  confidence: number
  score: number
  items: AnalysisItemOut[]
}

interface MealOut {
  id: number
  type: MealType
  name: string
  eatenAt: string
  photoUrl: string | null
  score: number
  items: { id: number; name: string; emoji: string; grams: number; nutrients: Nutrients }[]
}

interface DayOut {
  meals: MealOut[]
  goals: Partial<Record<NutrientKey, number>>
  waterGlasses: number
}

// ───── Helpers ─────

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const absolute = (path: string) => (path.startsWith('http') ? path : `${API_URL}${path}`)

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, init)
  } catch {
    throw new ApiError('Can’t reach NutriLens right now. Check your connection.')
  }
  if (!res.ok) {
    const detail = await res.json().then((b) => (typeof b?.detail === 'string' ? b.detail : null)).catch(() => null)
    throw new ApiError(detail ?? `Something went wrong (${res.status}).`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toUpperCase()

function toMeal(m: MealOut): Meal {
  return {
    id: String(m.id),
    type: m.type,
    name: m.name,
    time: timeLabel(m.eatenAt),
    photo: m.photoUrl ? absolute(m.photoUrl) : undefined,
    score: m.score,
    items: m.items.map((i) => ({ id: String(i.id), name: i.name, emoji: i.emoji, grams: i.grams, nutrients: i.nutrients, portion: 1 })),
  }
}

// ───── Endpoints ─────

/** POST /v1/meals/analyze — upload the photo, get detected foods with nutrients. */
export async function analyzeMealPhoto(photoUrl: string): Promise<ScanResult> {
  if (!API_ENABLED) {
    await wait(3600)
    return { ...DEMO_SCAN, photo: photoUrl, items: DEMO_SCAN.items.map((i) => ({ ...i })) }
  }
  const blob = await fetch(photoUrl).then((r) => r.blob())
  const form = new FormData()
  form.append('photo', blob, 'meal.jpg')
  const a = await request<AnalysisOut>('/v1/meals/analyze', { method: 'POST', body: form })
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
      confidence: i.source === 'estimate' ? Math.min(i.confidence, 0.8) : i.confidence,
      pin: i.pin,
    })),
  }
}

/** POST /v1/meals — the server recomputes nutrients from the analysis and portions. */
export async function logMeal(meal: Meal, analysisId?: string): Promise<Meal> {
  if (!API_ENABLED) return meal
  const created = await request<MealOut>(
    '/v1/meals',
    json('POST', {
      type: meal.type,
      name: meal.name,
      localDate: localDate(),
      eatenAt: new Date().toISOString(),
      analysisId,
      items: meal.items.map((i) => ({ analysisItemId: i.id, portion: i.portion })),
    }),
  )
  return toMeal(created)
}

export async function deleteMeal(id: string): Promise<void> {
  if (API_ENABLED) await request<void>(`/v1/meals/${id}`, { method: 'DELETE' })
}

/** GET /v1/days/:date — meals, goals and water for one day; null in mock mode. */
export async function fetchDay(date = localDate()) {
  if (!API_ENABLED) return null
  const d = await request<DayOut>(`/v1/days/${date}`)
  return { meals: d.meals.map(toMeal), goals: d.goals, water: d.waterGlasses }
}

export async function saveWater(glasses: number, date = localDate()): Promise<void> {
  if (API_ENABLED) await request(`/v1/days/${date}/water`, json('PUT', { glasses }))
}
