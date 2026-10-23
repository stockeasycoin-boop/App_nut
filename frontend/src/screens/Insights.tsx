import { motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { Flame, TrendingDown, TrendingUp, Trophy, Target } from 'lucide-react'
import { useApp } from '../state/store'
import { Segmented } from '../components/Segmented'
import { NUTRIENT_MAP, VITAMIN_KEYS, MINERAL_KEYS, type NutrientKey } from '../data/nutrients'
import { fmt, microCoverage } from '../lib/nutrition'
import { streakDays } from '../lib/insights'

const fade = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.04 + i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
})

const HEAT_KEYS: NutrientKey[] = ['protein', 'fiber', 'vitD', 'iron', 'vitC', 'calcium', 'magnesium', 'b12']
const HEAT_LABEL: Partial<Record<NutrientKey, string>> = { vitD: 'Vit D', vitC: 'Vit C', magnesium: 'Magnes.', b12: 'B12' }

interface Day {
  date: Date
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  micro: number
  meals: number
  today: boolean
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function Insights() {
  const { totals, goals, history, meals, status } = useApp()
  const [range, setRange] = useState<'week' | 'month'>('week')

  // History with today's live totals swapped in.
  const all: Day[] = useMemo(() => {
    if (!history) return []
    return history.days.map((d, i) => {
      const today = i === history.days.length - 1
      const t = today ? totals : d.totals
      return {
        date: new Date(`${d.date}T12:00:00`),
        calories: t.calories ?? 0,
        protein: t.protein ?? 0,
        carbs: t.carbs ?? 0,
        fat: t.fat ?? 0,
        fiber: t.fiber ?? 0,
        micro: today ? microCoverage(totals, goals, [...VITAMIN_KEYS, ...MINERAL_KEYS]) : d.micro,
        meals: today ? meals.length : d.meals,
        today,
      }
    })
  }, [history, totals, goals, meals.length])

  const span = range === 'week' ? 7 : 30
  const days = all.slice(-span)
  const prev = range === 'week' ? all.slice(-14, -7) : []
  const [selRaw, setSel] = useState<number | null>(null)
  const sel = selRaw !== null && selRaw < days.length ? selRaw : days.length - 1

  if (!history) {
    return (
      <div className="page">
        <Header range={range} setRange={setRange} />
        <div className="card empty-card">{status === 'error' ? 'Couldn’t load your history.' : 'Loading your trends…'}</div>
      </div>
    )
  }

  // Completed, logged days only — a half-eaten today would drag every average down.
  const done = (ds: Day[]) => ds.filter((d) => !d.today && d.meals > 0)
  const cur = done(days)
  const before = done(prev)
  const stat = (k: 'calories' | 'protein' | 'fiber' | 'micro') => ({
    now: avg(cur.map((d) => d[k])),
    delta: before.length && cur.length ? avg(cur.map((d) => d[k])) / (avg(before.map((d) => d[k])) || 1) - 1 : null,
  })
  const stats = [
    { label: 'Avg calories', ...stat('calories'), unit: 'kcal', goodWhenUp: false, scale: 1 },
    { label: 'Avg protein', ...stat('protein'), unit: 'g', goodWhenUp: true, scale: 1 },
    { label: 'Avg fiber', ...stat('fiber'), unit: 'g', goodWhenUp: true, scale: 1 },
    { label: 'Avg micro score', ...stat('micro'), unit: '/100', goodWhenUp: true, scale: 100 },
  ]

  const eP = cur.reduce((a, d) => a + d.protein * 4, 0)
  const eC = cur.reduce((a, d) => a + d.carbs * 4, 0)
  const eF = cur.reduce((a, d) => a + d.fat * 9, 0)
  const eSum = eP + eC + eF

  // Chart geometry
  const W = 340,
    H = 170,
    top = 18,
    base = H - 24,
    plotW = W - 40
  const max = Math.max(goals.calories * 1.25, ...days.map((d) => d.calories))
  const y = (v: number) => base - (v / max) * (base - top)
  const step = plotW / days.length
  const bw = Math.min(26, step * 0.62)
  const s = days[sel]

  // Highlights from the selected range.
  const streak = streakDays(history, meals.length)
  const proteinHits = cur.filter((d) => d.protein >= goals.protein * 0.95).length
  const pctOf = (k: NutrientKey) => {
    const vals = history.percentOfGoal[k]?.slice(-span) ?? []
    const logged = vals.filter((_, i) => days[i] && !days[i].today && days[i].meals > 0)
    return avg(logged)
  }
  const microRank = HEAT_KEYS.filter((k) => k !== 'protein' && k !== 'fiber')
    .map((k) => ({ k, v: pctOf(k) }))
    .sort((a, b) => a.v - b.v)
  const weakest = microRank[0]
  const strongest = microRank[microRank.length - 1]

  return (
    <div className="page">
      <Header range={range} setRange={setRange} />

      {/* Stat tiles */}
      <div className="stat-grid">
        {stats.map((t, i) => {
          const up = (t.delta ?? 0) >= 0
          const good = t.delta === null || Math.abs(t.delta) < 0.01 ? null : up === t.goodWhenUp
          return (
            <motion.div key={t.label} className="stat" {...fade(2 + i * 0.4)}>
              <span className="stat-label">{t.label}</span>
              <div className="stat-val">
                <b className="num">{cur.length ? fmt(t.now * t.scale) : '—'}</b>
                <small>{t.unit}</small>
              </div>
              {t.delta !== null && Math.abs(t.delta) < 0.005 ? (
                <span className="delta muted">Same as last week</span>
              ) : t.delta !== null ? (
                <span className={`delta ${good === false ? 'down' : 'up'}`}>
                  {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {up ? '+' : '−'}
                  {Math.abs(Math.round(t.delta * 100))}% vs last week
                </span>
              ) : (
                <span className="delta muted">{cur.length ? `${cur.length} logged day${cur.length === 1 ? '' : 's'}` : 'No full days yet'}</span>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Calorie chart */}
      <motion.section className="card chart-card" {...fade(4)}>
        <div className="chart-head">
          <div>
            <div className="h2">Calories</div>
            <div className="muted micro-sub">Daily intake vs your {fmt(goals.calories)} kcal goal</div>
          </div>
          <div className="chart-readout" aria-live="polite">
            <b className="num">{fmt(s.calories)}</b>
            <span>{s.today ? 'Today so far' : s.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Calories per day for the last ${span} days`}>
          {[0.5, 1].map((f) => (
            <line key={f} x1={0} x2={plotW} y1={y(goals.calories * f)} y2={y(goals.calories * f)} stroke="var(--line)" strokeWidth={1} />
          ))}
          <line x1={0} x2={plotW} y1={y(goals.calories)} y2={y(goals.calories)} stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={W} y={y(goals.calories) + 4} textAnchor="end" className="chart-goal">
            {fmt(goals.calories)}
          </text>
          {days.map((d, i) => {
            const x = i * step + (step - bw) / 2
            const h = Math.max(d.calories ? 3 : 0, base - y(d.calories))
            const active = i === sel
            const showLabel = range === 'week' || i % 5 === (days.length - 1) % 5
            return (
              <g key={d.date.toISOString()} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                <rect x={i * step} y={0} width={step} height={H} fill="transparent" />
                <motion.rect
                  x={x}
                  width={bw}
                  rx={Math.min(7, bw / 2)}
                  initial={{ height: 0, y: base }}
                  animate={{ height: h, y: base - h }}
                  transition={{ duration: 0.8, delay: 0.15 + i * (range === 'week' ? 0.05 : 0.012), ease: [0.22, 1, 0.36, 1] }}
                  fill={active ? 'url(#barGrad)' : d.today ? 'var(--brand-soft)' : 'var(--bar)'}
                  stroke={d.today && !active ? 'var(--brand)' : 'none'}
                  strokeDasharray={d.today && !active ? '3 3' : undefined}
                />
                {showLabel && (
                  <text x={i * step + step / 2} y={H - 6} textAnchor="middle" className={`chart-x ${active ? 'on' : ''}`}>
                    {d.today ? 'Today' : range === 'week' ? d.date.toLocaleDateString('en-IN', { weekday: 'short' }) : d.date.getDate()}
                  </text>
                )}
              </g>
            )
          })}
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1fcf83" />
              <stop offset="1" stopColor="#0b8a56" />
            </linearGradient>
          </defs>
        </svg>
      </motion.section>

      {/* Macro split */}
      <motion.section className="card" style={{ marginTop: 12 }} {...fade(5)}>
        <div className="h2">Where your energy comes from</div>
        <div className="muted micro-sub">Average of logged days · your target is {goalsSplit(goals)}</div>
        {eSum > 0 ? (
          <div className="split">
            {[
              { k: 'Protein', v: eP / eSum, c: 'var(--c-protein)' },
              { k: 'Carbs', v: eC / eSum, c: 'var(--c-carbs)' },
              { k: 'Fat', v: eF / eSum, c: 'var(--c-fat)' },
            ].map((m, i) => (
              <motion.div key={m.k} className="split-seg" initial={{ flexGrow: 0 }} animate={{ flexGrow: m.v }} transition={{ duration: 0.9, delay: 0.3 + i * 0.1 }}>
                <span className="split-bar" style={{ background: m.c }} />
                <b className="num">{Math.round(m.v * 100)}%</b>
                <span>{m.k}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="muted empty-inline">Log a full day to see your energy split.</p>
        )}
      </motion.section>

      {/* Heatmap */}
      <motion.section className="card" style={{ marginTop: 12 }} {...fade(6)}>
        <div className="h2">Nutrient consistency</div>
        <div className="muted micro-sub">% of daily goal · last 14 days</div>
        <Heatmap all={all} percentOfGoal={history.percentOfGoal} totals={totals} goals={goals} />
      </motion.section>

      {/* Highlights */}
      <div className="section-head">
        <h2 className="h2">{range === 'week' ? 'This week' : 'Last 30 days'}</h2>
      </div>
      <div className="hl-list">
        {[
          {
            icon: <Flame size={18} />,
            tone: 'warm',
            title: streak ? `${streak}‑day logging streak` : 'Start a streak today',
            body: streak ? (meals.length ? 'Nice — today is logged.' : 'Log a meal today to keep it going.') : 'Log a meal to start counting.',
          },
          cur.length > 0 && {
            icon: <Trophy size={18} />,
            tone: 'good',
            title: `Protein goal hit ${proteinHits} of ${cur.length} day${cur.length === 1 ? '' : 's'}`,
            body: proteinHits / cur.length >= 0.7 ? 'Great consistency.' : `Aim for ${goals.protein} g — eggs, dal, paneer and chicken help.`,
          },
          cur.length > 0 &&
            weakest && {
              icon: <Target size={18} />,
              tone: 'bad',
              title: `${NUTRIENT_MAP[weakest.k].label} is your weakest link`,
              body: `Averaging ${Math.round(weakest.v)}% of goal. ${strongest ? `${NUTRIENT_MAP[strongest.k].label} is your strongest at ${Math.round(strongest.v)}%.` : ''}`,
            },
        ]
          .filter(Boolean)
          .map((h, i) => {
            const c = h as { icon: ReactNode; tone: string; title: string; body: string }
            return (
              <motion.div key={c.title} className="hl-card" {...fade(7 + i * 0.5)}>
                <span className={`hl-icon ${c.tone}`}>{c.icon}</span>
                <div>
                  <b>{c.title}</b>
                  <span>{c.body}</span>
                </div>
              </motion.div>
            )
          })}
      </div>
    </div>
  )
}

function goalsSplit(g: Record<NutrientKey, number>) {
  const e = g.protein * 4 + g.carbs * 4 + g.fat * 9 || 1
  return [g.protein * 4, g.carbs * 4, g.fat * 9].map((v) => Math.round((100 * v) / e)).join(' / ')
}

function Header({ range, setRange }: { range: 'week' | 'month'; setRange: (r: 'week' | 'month') => void }) {
  return (
    <>
      <motion.header className="screen-head" {...fade(0)}>
        <div>
          <div className="eyebrow">Your trends</div>
          <h1 className="h1">Insights</h1>
        </div>
      </motion.header>
      <motion.div {...fade(1)} style={{ marginTop: 16 }}>
        <Segmented value={range} onChange={setRange} options={[{ value: 'week', label: 'This week' }, { value: 'month', label: '30 days' }]} />
      </motion.div>
    </>
  )
}

function Heatmap({
  all,
  percentOfGoal,
  totals,
  goals,
}: {
  all: Day[]
  percentOfGoal: Partial<Record<NutrientKey, number[]>>
  totals: Record<string, number | undefined>
  goals: Record<NutrientKey, number>
}) {
  const [cell, setCell] = useState<{ r: number; c: number } | null>(null)
  const days = all.slice(-14)
  const rows = HEAT_KEYS.map((k) => {
    const vals = (percentOfGoal[k] ?? []).slice(-14)
    // Today's column comes from live totals.
    vals[vals.length - 1] = Math.round((100 * (totals[k] ?? 0)) / goals[k])
    return { k, label: HEAT_LABEL[k] ?? NUTRIENT_MAP[k].label, vals }
  })
  const level = (v: number) => (v >= 100 ? 5 : v >= 80 ? 4 : v >= 60 ? 3 : v >= 40 ? 2 : v >= 20 ? 1 : 0)
  const sel = cell ? rows[cell.r] : null
  const selDay = cell ? days[cell.c] : null

  return (
    <div className="heat">
      <div className="heat-tip" aria-live="polite">
        {sel && cell && selDay ? (
          <>
            <b>{sel.label}</b> · {selDay.today ? 'today' : selDay.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
            {selDay.meals ? (
              <>
                <b className="num">{sel.vals[cell.c]}%</b> of goal
              </>
            ) : (
              'nothing logged'
            )}
          </>
        ) : (
          <span className="muted">Tap a cell for details</span>
        )}
      </div>
      {rows.map((row, r) => (
        <div key={row.k} className="heat-row">
          <span className="heat-label">{row.label}</span>
          <div className="heat-cells">
            {row.vals.map((v, c) => {
              const empty = !days[c]?.meals
              return (
                <motion.button
                  key={c}
                  className={`heat-cell ${cell?.r === r && cell?.c === c ? 'on' : ''} ${empty ? 'empty' : ''}`}
                  style={{ background: empty ? 'var(--track)' : `var(--h${level(v)})` }}
                  onClick={() => setCell({ r, c })}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + c * 0.02 + r * 0.03 }}
                  aria-label={`${row.label}, ${empty ? 'nothing logged' : `${v}% of goal`}`}
                />
              )
            })}
          </div>
        </div>
      ))}
      <div className="heat-legend">
        <span>0%</span>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <i key={i} style={{ background: `var(--h${i})` }} />
        ))}
        <span>100%+</span>
      </div>
    </div>
  )
}
