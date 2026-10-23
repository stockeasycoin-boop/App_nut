import type { Meal } from '../data/mock'

/** Meal photo, or the first item's emoji on a soft tile for meals logged without one. */
export function MealThumb({ meal, className }: { meal: Meal; className?: string }) {
  if (meal.photo) return <img src={meal.photo} alt="" className={className} />
  return (
    <span className={`${className ?? ''} meal-emoji-thumb`} aria-hidden>
      {meal.items[0]?.emoji ?? '🍽️'}
    </span>
  )
}
