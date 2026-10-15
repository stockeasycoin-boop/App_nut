import { motion } from 'motion/react'
import { Bell, Camera, ChevronRight, Flame, Plus, Sparkles } from 'lucide-react'
import { Ring } from '../components/Ring'
import { Bar } from '../components/Bar'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { useApp } from '../state/store'
import { MEAL_META, PROFILE, RECENT_FOODS, SUGGESTIONS, WEEK_HISTORY, type MealType } from '../data/mock'
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
  const { totals, goals, meals, openScan, setTab, setOpenMeal, water, setWater } = useApp()
  const cal = totals.calories ?? 0
  const left = Math.max(0, goals.calories - cal)
  const coverage = microCoverage(totals, goals, [...VITAMIN_KEYS, ...MINERAL_KEYS])
  const todayPct = cal / goals.calories
  const loggedTypes = new Set(meals.map((m) => m.type))
  const nextEmpty = (['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).find((t) => !loggedTypes.has(t))

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div className="page">
      {/* Header */}
      <motion.header className="today-head" {...fade(0)}>
        <div>
          <div className="eyebrow">{dateLabel}</div>
          <h1 className="h1">
            {greeting()}, {PROFILE.name}
          </h1>
        </div>
        <div className="today-head-actions">
          <span className="streak">
            <Flame size={15} fill="currentColor" /> {PROFILE.streak}
          </span>
          <button className="icon-btn" aria-label="Notifications">
            <Bell size={19} />
            <i className="notif-dot" />
          </button>
        </div>
      </motion.header>

      {/* Week strip */}
      <motion.div className="week" {...fade(1)}>
        {[...WEEK_HISTORY.map((d) => ({ day: d.day, pct: d.calories / goals.calories, today: false })), { day: 'Today', pct: todayPct, today: true }].map(
          (d, i) => (
            <button key={i} className={`week-day ${d.today ? 'on' : ''}`}>
              <span className="week-label">{dayOffset(i - 6).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
              <Ring size={30} stroke={4} progress={d.pct} color={d.pct > 1.08 ? 'var(--c-cal-2)' : d.today ? 'var(--on-ink)' : 'var(--brand)'} track={d.today ? 'color-mix(in srgb, var(--on-ink) 20%, transparent)' : undefined} delay={0.2 + i * 0.04}>
                <span className="week-num">{dayOffset(i - 6).getDate()}</span>
              </Ring>
            </button>
          ),
        )}
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
              Remaining
            </div>
            <div className="hero-big num">
              <AnimatedNumber value={left} />
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
              <div className="macro-left">{done ? '✓ Goal reached' : `${fmt(g - v)}g to go`}</div>
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

      {/* Smart suggestion */}
      <motion.section className="insight" {...fade(7)}>
        <div className="insight-head">
          <span className="insight-badge">
            <Sparkles size={14} /> Smart pick
          </span>
        </div>
        <p className="insight-text">
          You’re short on <b>iron</b> and <b>fiber</b> today. Any of these for dinner closes the gap:
        </p>
        <div className="sugg-row">
          {SUGGESTIONS.map((s) => (
            <div key={s.name} className="sugg">
              <img src={s.photo} alt="" />
              <div className="sugg-body">
                <b>{s.name}</b>
                <div className="sugg-tags">
                  {s.boosts.map((b) => (
                    <span key={b}>+{NUTRIENT_MAP[b].short}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
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
              <img src={m.photo} alt="" className="meal-photo" />
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
        {nextEmpty && (
          <motion.button className="meal-empty" {...fade(10)} whileTap={{ scale: 0.98 }} onClick={openScan}>
            <span className="meal-empty-icon">
              <Camera size={22} />
            </span>
            <div>
              <b>Snap your {MEAL_META[nextEmpty].label.toLowerCase()}</b>
              <span>
                {fmt(left)} kcal left · AI fills in the nutrients
              </span>
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
        {RECENT_FOODS.map((f) => (
          <button key={f.name} className="quick">
            <img src={f.photo} alt="" />
            <div>
              <b>{f.name}</b>
              <span className="num">{f.kcal} kcal</span>
            </div>
            <span className="quick-plus">
              <Plus size={16} strokeWidth={2.6} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
