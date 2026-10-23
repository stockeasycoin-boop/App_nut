import type { History } from './api'
import { NUTRIENT_MAP, type NutrientKey, type Nutrients } from '../data/nutrients'

/** Consecutive days with at least one meal, ending today (or yesterday if today is still empty). */
export function streakDays(history: History | null, mealsToday: number): number {
  if (!history) return mealsToday ? 1 : 0
  const days = history.days.map((d) => d.meals)
  days[days.length - 1] = mealsToday
  let i = days.length - 1
  if (!days[i]) i--
  let n = 0
  while (i >= 0 && days[i] > 0) {
    n++
    i--
  }
  return n
}

const GAP_KEYS: NutrientKey[] = ['protein', 'fiber', 'iron', 'vitD', 'calcium', 'magnesium', 'folate', 'b12', 'omega3', 'vitC', 'potassium', 'vitA', 'zinc']

/**
 * The nutrients most behind schedule today. Compares intake with how much of the day
 * has passed (07:00–22:00), so a light breakfast doesn't flag everything at 8 AM.
 */
export function biggestGaps(totals: Nutrients, goals: Record<NutrientKey, number>, now = new Date(), count = 2): NutrientKey[] {
  const hours = now.getHours() + now.getMinutes() / 60
  const expected = Math.min(1, Math.max(0.25, (hours - 7) / 15))
  return GAP_KEYS.map((k) => ({ k, ratio: (totals[k] ?? 0) / goals[k] / expected }))
    .filter((x) => x.ratio < 0.8)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, count)
    .map((x) => x.k)
}

export function nutrientName(k: NutrientKey) {
  const label = NUTRIENT_MAP[k].label.replace(/ \(.*\)/, '')
  return label.startsWith('Vitamin') || label.startsWith('Omega') ? label : label.toLowerCase()
}
