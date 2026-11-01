import { motion } from 'motion/react'
import { Bell, Camera, ChevronRight, Flame, Plus, RotateCw, Search, Sparkles } from 'lucide-react'
import { Ring } from '../components/Ring'
import { Bar } from '../components/Bar'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { useApp } from '../state/store'
import { MEAL_META, QUICK_ADD, SUGGESTIONS, type MealType } from '../data/mock'
import { localFood } from '../lib/api'
import { biggestGaps, nutrientName, streakDays } from '../lib/insights'
import { MealThumb } from '../components/MealThumb'
import { NUTRIENT_MAP, VITAMIN_KEYS, MINERAL_KEYS, type NutrientKey } from '../data/nutrients'
import { fmt, mealTotal, microCoverage } from '../lib/nutrition'

const MACROS: { key: NutrientKey; emoji: string; grad: [string, string] }[] = [
  { key: 'protein', emoji: '💪', grad: ['#7b88ff', '#4a5af0'] },
  { key: 'carbs', emoji: '🌾', grad: ['#ffc24d', '#ff9500'] },
  { key: 'fat', emoji: '🥑', grad: ['#c98bff', '#9b45ef'] },
  { key: 'fiber', emoji: '🌿', grad: ['#4fe09a', '#0fa75e'] },
]

const MICRO_SPOTLIGHT: NutrientKey[] = ['vitD', 'vitC', 'iron', 'calcium', 'b12', 'magnesium', 'potassium', 'zinc']

const fade = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
})

function dayOffset(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function Today() {
  const { totals, goals, meals, openScan, setTab, setOpenMeal, water, setWater, profile, history, status, reload, showToast, logFood, openFoodSearch } = useApp()
  const cal = totals.calories ?? 0
  const left = Math.max(0, goals.calories - cal)
  const over = Math.max(0, cal - goals.calories)
  const streak = streakDays(history, meals.length)
  const gaps = biggestGaps(totals, goals)
  const picks = SUGGESTIONS.filter((s) => s.boosts.some((b) => gaps.includes(b as NutrientKey))).slice(0, 3)
  const week = Array.from({ length: 7 }, (_, i) => {
    const offset = i - 6
    if (offset === 0) return { offset, pct: cal / goals.calories }
    const h = history?.days[history.days.length - 1 + offset]
    return { offset, pct: h ? (h.totals.calories ?? 0) / goals.calories : 0 }
  })

  const quickAdd = (q: (typeof QUICK_ADD)[number]) => {
    const food = localFood(q.foodId)
    if (food) logFood(food, q.grams, q.name, q.photo)
  }
  const coverage = microCoverage(totals, goals, [...VITAMIN_KEYS, ...MINERAL_KEYS])
  const todayPct = cal / goals.calories
  const loggedTypes = new Set(meals.map((m) => m.type))
  const ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner']
  const hour = new Date().getHours()
  const nowType: MealType = hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 18 ? 'snack' : 'dinner'
  // Suggest the meal for this time of day, else the next one still to log.
  const nextEmpty = ORDER.slice(ORDER.indexOf(nowType)).find((t) => !loggedTypes.has(t))

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div className="page">
      {/* Header */}
      <motion.header className="today-head" {...fade(0)}>
        <div>
          <div className="eyebrow">{dateLabel}</div>
          <h1 className="h1">
            {greeting()}
            {profile?.name ? `, ${profile.name}` : ''}
          </h1>
        </div>
        <div className="today-head-actions">
          <span className="streak" aria-label={`${streak}-day logging streak`} title={`${streak}-day logging streak`}>
            <Flame size={15} fill="currentColor" /> {streak}
          </span>
          <button className="icon-btn" aria-label="Notifications" onClick={() => showToast({ emoji: '🔔', title: 'You’re all caught up', body: 'Meal reminders are coming in a future update.' })}>
            <Bell size={19} />
          </button>
        </div>
      </motion.header>

      {status === 'error' && (
        <div className="load-error" role="alert">
          <span>Couldn’t reach the server.</span>
          <button className="link" onClick={reload}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Week strip — calories vs goal for the last 7 days */}
      <motion.div className="week" {...fade(1)} role="list" aria-label="Last 7 days">
        {week.map((d, i) => {
          const today = d.offset === 0
          return (
            <div key={i} role="listitem" className={`week-day ${today ? 'on' : ''}`} aria-label={`${dayOffset(d.offset).toLocaleDateString('en-IN', { weekday: 'long' })}: ${Math.round(d.pct * 100)}% of calorie goal`}>
              <span className="week-label">{dayOffset(d.offset).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
              <Ring size={30} stroke={4} progress={d.pct} color={d.pct > 1.08 ? 'var(--c-cal-2)' : today ? 'var(--on-ink)' : 'var(--brand)'} track={today ? 'color-mix(in srgb, var(--on-ink) 20%, transparent)' : undefined} delay={0.2 + i * 0.04}>
                <span className="week-num">{dayOffset(d.offset).getDate()}</span>
              </Ring>
            </div>
          )
        })}
      </motion.div>

      {/* Hero rings */}
      <motion.section className="hero" {...fade(2)}>
        <div className="hero-glow" />
        <div className="hero-row">
          <div className="hero-rings">
            <Ring size={172} stroke={14} progress={todayPct} gradient={['#ffa24d', '#ff3d7f']} track="rgba(255,255,255,.07)" delay={0.15}>
              <div />
            </Ring>
            <div className="hero-ring-abs" style={{ inset: 18 }}>
              <Ring size={136} stroke={9} progress={(totals.protein ?? 0) / goals.protein} gradient={MACROS[0].grad} track="rgba(255,255,255,.07)" delay={0.3} />
            </div>
            <div className="hero-ring-abs" style={{ inset: 31 }}>
              <Ring size={110} stroke={9} progress={(totals.carbs ?? 0) / goals.carbs} gradient={MACROS[1].grad} track="rgba(255,255,255,.07)" delay={0.4} />
            </div>
            <div className="hero-ring-abs" style={{ inset: 44 }}>
              <Ring size={84} stroke={9} progress={(totals.fat ?? 0) / goals.fat} gradient={MACROS[2].grad} track="rgba(255,255,255,.07)" delay={0.5} />
            </div>
            <div className="hero-center">
              <div className="hero-pct">
                <b className="num">{Math.round(todayPct * 100)}%</b>
                <span>eaten</span>
              </div>
            </div>
          </div>
          <div className="hero-stats">
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,.55)' }}>
              {over ? 'Over goal' : 'Remaining'}
            </div>
            <div className="hero-big num" data-testid="kcal-left">
              <AnimatedNumber value={Math.round(over || left)} />
            </div>
            <div className="hero-sub">kcal of {fmt(goals.calories)}</div>
            <div className="hero-legend">
              <div>
                <i style={{ background: 'linear-gradient(135deg,#ffa24d,#ff3d7f)' }} />
                <span>Eaten</span>
                <b className="num">{fmt(cal)}</b>
              </div>
              {MACROS.slice(0, 3).map((m) => (
                <div key={m.key}>
                  <i style={{ background: `linear-gradient(135deg,${m.grad[0]},${m.grad[1]})` }} />
                  <span>{NUTRIENT_MAP[m.key].label}</span>
                  <b className="num">{fmt(totals[m.key] ?? 0)}g</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Macro cards */}
      <div className="macro-grid">
        {MACROS.map((m, i) => {
          const v = totals[m.key] ?? 0
          const g = goals[m.key]
          const done = v >= g
          return (
            <motion.button key={m.key} className="macro-card" {...fade(3 + i * 0.5)} whileTap={{ scale: 0.97 }} onClick={() => setTab('nutrients')}>
              <div className="macro-top">
                <span className="macro-emoji">{m.emoji}</span>
                <span className="macro-label">{NUTRIENT_MAP[m.key].label}</span>
                <span className="macro-pct num">{Math.round((v / g) * 100)}%</span>
              </div>
              <div className="macro-val">
                <span className="num">
                  <AnimatedNumber value={Math.round(v)} />
                </span>
                <small>/ {g}g</small>
              </div>
              <Bar value={v / g} color={`linear-gradient(90deg,${m.grad[0]},${m.grad[1]})`} delay={0.3 + i * 0.08} />
              <div className="macro-left">{done ? '✓ Goal reached' : `${fmt(g - v)} g to go`}</div>
            </motion.button>
          )
        })}
      </div>

      {/* Micronutrients */}
      <motion.section className="card micro-card" {...fade(6)}>
        <div className="micro-head">
          <div>
            <div className="h2">Vitamins & minerals</div>
            <div className="muted micro-sub">{Math.round(coverage * 100)}% of 19 daily targets covered</div>
          </div>
          <button className="link" onClick={() => setTab('nutrients')}>
            All <ChevronRight size={16} />
          </button>
        </div>
        <div className="micro-grid">
          {MICRO_SPOTLIGHT.map((k, i) => {
            const pct = (totals[k] ?? 0) / goals[k]
            const color = pct >= 1 ? 'var(--ok)' : pct >= 0.5 ? NUTRIENT_MAP[k].color : 'var(--warn)'
            return (
              <button key={k} className="micro-item" onClick={() => setTab('nutrients')}>
                <Ring size={54} stroke={5} progress={pct} color={color} delay={0.4 + i * 0.05}>
                  <span className="micro-pct num">{Math.min(999, Math.round(pct * 100))}</span>
                </Ring>
                <span className="micro-label">{NUTRIENT_MAP[k].label.replace('Vitamin ', 'Vit ')}</span>
              </button>
            )
          })}
        </div>
      </motion.section>

      {/* Smart suggestion — based on today's biggest gaps */}
      <motion.section className="insight" {...fade(7)}>
        <div className="insight-head">
          <span className="insight-badge">
            <Sparkles size={14} /> Smart pick
          </span>
        </div>
        {gaps.length && picks.length ? (
          <>
            <p className="insight-text">
              You’re behind on{' '}
              {gaps.map((g, i) => (
                <span key={g}>
                  {i > 0 && ' and '}
                  <b>{nutrientName(g)}</b>
                </span>
              ))}{' '}
              for this time of day. Any of these closes the gap:
            </p>
            <div className="sugg-row">
              {picks.map((s) => (
                <div key={s.name} className="sugg">
                  <img src={s.photo} alt="" />
                  <div className="sugg-body">
                    <b>{s.name}</b>
                    <div className="sugg-tags">
                      {s.boosts.slice(0, 3).map((b) => (
                        <span key={b}>+{NUTRIENT_MAP[b].short}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="insight-text" style={{ marginBottom: 0 }}>
            You’re right on track for this time of day. Keep it up! 🎉
          </p>
        )}
      </motion.section>

      {/* Meals */}
      <div className="section-head">
        <h2 className="h2">Today’s meals</h2>
        <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
          {meals.length} logged
        </span>
      </div>
      <div className="meal-list">
        {meals.map((m, i) => {
          const t = mealTotal(m)
          const p = (t.protein ?? 0) * 4,
            c = (t.carbs ?? 0) * 4,
            f = (t.fat ?? 0) * 9
          const sum = p + c + f || 1
          return (
            <motion.button key={m.id} className="meal" {...fade(8 + i * 0.5)} whileTap={{ scale: 0.98 }} onClick={() => setOpenMeal(m)} layout>
              <MealThumb meal={m} className="meal-photo" />
              <div className="meal-body">
                <div className="meal-type">
                  {MEAL_META[m.type].label} · {m.time}
                </div>
                <div className="meal-name">{m.name}</div>
                <div className="meal-split">
                  <span style={{ flex: p / sum, background: 'var(--c-protein)' }} />
                  <span style={{ flex: c / sum, background: 'var(--c-carbs)' }} />
                  <span style={{ flex: f / sum, background: 'var(--c-fat)' }} />
                </div>
              </div>
              <div className="meal-kcal">
                <b className="num">{fmt(t.calories ?? 0)}</b>
                <span>kcal</span>
              </div>
            </motion.button>
          )
        })}
        {(
          <motion.button className="meal-empty" {...fade(10)} whileTap={{ scale: 0.98 }} onClick={openScan}>
            <span className="meal-empty-icon">
              <Camera size={22} />
            </span>
            <div>
              <b>{nextEmpty ? `Snap your ${MEAL_META[nextEmpty].label.toLowerCase()}` : 'Snap another meal'}</b>
              <span>{over ? `${fmt(over)} kcal over today’s goal` : `${fmt(left)} kcal left · AI fills in the nutrients`}</span>
            </div>
            <Plus size={20} className="meal-empty-plus" />
          </motion.button>
        )}
      </div>

      {/* Water */}
      <motion.section className="card water" {...fade(11)}>
        <div className="water-head">
          <div>
            <div className="h2">Hydration</div>
            <div className="muted micro-sub">
              <b className="num" style={{ color: 'var(--ink)' }}>
                {(water * 0.25).toFixed(2)} L
              </b>{' '}
              of 2.5 L
            </div>
          </div>
          <span className="water-drop">💧</span>
        </div>
        <div className="glasses">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.button
              key={i}
              className={`glass ${i < water ? 'full' : ''}`}
              onClick={() => setWater(i < water ? i : i + 1)}
              whileTap={{ scale: 0.85 }}
              aria-label={`${i + 1} glasses`}
            >
              <motion.span className="glass-fill" initial={false} animate={{ height: i < water ? '100%' : '0%' }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} />
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* Quick add */}
      <div className="section-head">
        <h2 className="h2">Quick add</h2>
        <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
          Your usuals
        </span>
      </div>
      <div className="quick-row">
        {QUICK_ADD.map((f) => {
          const food = localFood(f.foodId)
          return (
            <motion.button key={f.foodId} className="quick" whileTap={{ scale: 0.96 }} onClick={() => quickAdd(f)} aria-label={`Add ${f.name}`}>
              <img src={f.photo} alt="" />
              <div>
                <b>{f.name}</b>
                <span className="num">{fmt(((food?.per100g.calories ?? 0) * f.grams) / 100)} kcal</span>
              </div>
              <span className="quick-plus">
                <Plus size={16} strokeWidth={2.6} />
              </span>
            </motion.button>
          )
        })}
      </div>
      <motion.button className="search-food" whileTap={{ scale: 0.98 }} onClick={openFoodSearch}>
        <Search size={18} /> Search 50+ foods to log without a photo
      </motion.button>
    </div>
  )
}
