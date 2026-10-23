import { motion } from 'motion/react'
import { Clock, Trash2 } from 'lucide-react'
import { useApp } from '../state/store'
import { Sheet } from '../components/Sheet'
import { Ring } from '../components/Ring'
import { MEAL_META } from '../data/mock'
import { MINERAL_KEYS, NUTRIENT_MAP, VITAMIN_KEYS, type NutrientKey } from '../data/nutrients'
import { fmt, itemNutrients, mealTotal } from '../lib/nutrition'

export function MealSheet() {
  const { openMeal, setOpenMeal, goals, removeMeal, showToast } = useApp()
  const meal = openMeal
  const close = () => setOpenMeal(null)
  const t = meal ? mealTotal(meal) : {}
  const top = [...VITAMIN_KEYS, ...MINERAL_KEYS, 'fiber' as NutrientKey]
    .map((k) => ({ k, pct: (t[k] ?? 0) / goals[k] }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6)

  return (
    <Sheet open={!!meal} onClose={close}>
      {meal && (
        <>
          <div className="ms-hero">
            {meal.photo ? <img src={meal.photo} alt="" /> : <div className="ms-hero-emoji">{meal.items[0]?.emoji ?? '🍽️'}</div>}
            <div className="ms-hero-shade" />
            <div className="ms-hero-text">
              <span className="ms-type">
                {MEAL_META[meal.type].emoji} {MEAL_META[meal.type].label}
                <Clock size={12} /> {meal.time}
              </span>
              <h2 className="h1" style={{ color: '#fff', fontSize: 26 }}>
                {meal.name}
              </h2>
            </div>
            <div className="ms-score">
              <Ring size={50} stroke={5} progress={meal.score / 100} color="#4ad991" track="rgba(255,255,255,.25)">
                <b className="num" style={{ color: '#fff', fontSize: 16 }}>
                  {meal.score}
                </b>
              </Ring>
            </div>
          </div>

          <div className="ms-macros">
            {(
              [
                ['calories', 'kcal', 'var(--c-cal)'],
                ['protein', 'g', 'var(--c-protein)'],
                ['carbs', 'g', 'var(--c-carbs)'],
                ['fat', 'g', 'var(--c-fat)'],
                ['fiber', 'g', 'var(--c-fiber)'],
              ] as [NutrientKey, string, string][]
            ).map(([k, u, c]) => (
              <div key={k}>
                <b className="num">{fmt(t[k] ?? 0)}</b>
                <span>
                  <i style={{ background: c }} />
                  {k === 'calories' ? u : NUTRIENT_MAP[k].label}
                </span>
              </div>
            ))}
          </div>

          <div className="res-section-title">Best for your day</div>
          <div className="ms-top">
            {top.map(({ k, pct }, i) => (
              <motion.div key={k} className="ms-top-item" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.04 }}>
                <Ring size={46} stroke={4.5} progress={pct} color={NUTRIENT_MAP[k].color} delay={0.15 + i * 0.04}>
                  <span className="num" style={{ fontSize: 12, fontWeight: 700 }}>
                    {Math.round(pct * 100)}%
                  </span>
                </Ring>
                <span>{NUTRIENT_MAP[k].label.replace('Vitamin ', 'Vit ').replace(/ \(.*\)/, '')}</span>
              </motion.div>
            ))}
          </div>

          <div className="res-section-title">What’s in it</div>
          <div className="items">
            {meal.items.map((it) => {
              const n = itemNutrients(it)
              return (
                <div key={it.id} className="item">
                  <span className="item-emoji">{it.emoji}</span>
                  <div className="item-body">
                    <b>{it.name}</b>
                    <span>
                      {Math.round(it.grams * it.portion)} g · P {fmt(n.protein ?? 0)} · C {fmt(n.carbs ?? 0)} · F {fmt(n.fat ?? 0)}
                    </span>
                  </div>
                  <b className="num item-kcal">{fmt(n.calories ?? 0)}</b>
                </div>
              )
            })}
          </div>

          <div className="ms-actions">
            <button
              className="btn btn-ghost"
              style={{ flex: 1, color: 'var(--bad)' }}
              onClick={() => {
                removeMeal(meal.id)
                close()
                showToast({ emoji: '🗑️', title: 'Meal removed', body: meal.name })
              }}
            >
              <Trash2 size={17} /> Delete
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
