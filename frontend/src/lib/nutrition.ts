import type { FoodItem, Meal } from '../data/mock'
import { NUTRIENT_MAP, type NutrientKey, type Nutrients } from '../data/nutrients'

export function itemNutrients(item: FoodItem): Nutrients {
  const out: Nutrients = {}
  for (const [k, v] of Object.entries(item.nutrients)) out[k as NutrientKey] = (v ?? 0) * item.portion
  return out
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  const out: Nutrients = {}
  for (const n of list) {
    for (const [k, v] of Object.entries(n)) {
      const key = k as NutrientKey
      out[key] = (out[key] ?? 0) + (v ?? 0)
    }
  }
  return out
}

export const itemsTotal = (items: FoodItem[]) => sumNutrients(items.map(itemNutrients))
export const mealTotal = (meal: Meal) => itemsTotal(meal.items)
export const dayTotal = (meals: Meal[]) => sumNutrients(meals.map(mealTotal))

export type Status = 'low' | 'progress' | 'met' | 'over'

export function statusFor(key: NutrientKey, value: number, goal: number): Status {
  const pct = goal ? value / goal : 0
  if (NUTRIENT_MAP[key].kind === 'limit') return pct > 1 ? 'over' : pct > 0.85 ? 'progress' : 'met'
  if (pct >= 1) return 'met'
  if (pct >= 0.5) return 'progress'
  return 'low'
}

export const STATUS_LABEL: Record<Status, string> = {
  low: 'Low',
  progress: 'On track',
  met: 'Goal met',
  over: 'Over limit',
}

export function fmt(value: number, unit?: string) {
  const v = value >= 100 ? Math.round(value) : value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  const s = v.toLocaleString('en-IN')
  return unit ? `${s} ${unit}` : s
}

/** Share of energy that comes from each macro (4/4/9 kcal per gram). */
export function macroSplit(n: Nutrients) {
  const p = (n.protein ?? 0) * 4
  const c = (n.carbs ?? 0) * 4
  const f = (n.fat ?? 0) * 9
  const total = p + c + f || 1
  return { protein: p / total, carbs: c / total, fat: f / total }
}

/** Average % of goal across the target micronutrients, each capped at 100%. */
export function microCoverage(n: Nutrients, goals: Record<NutrientKey, number>, keys: NutrientKey[]) {
  const vals = keys.map((k) => Math.min(1, (n[k] ?? 0) / goals[k]))
  return vals.reduce((a, b) => a + b, 0) / vals.length
}
