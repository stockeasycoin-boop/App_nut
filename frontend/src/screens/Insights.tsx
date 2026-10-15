import { motion } from 'motion/react'
import { useState } from 'react'
import { Flame, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { useApp } from '../state/store'
import { Segmented } from '../components/Segmented'
import { NUTRIENT_HEATMAP, PROFILE, WEEK_HISTORY } from '../data/mock'
import { fmt } from '../lib/nutrition'

const fade = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.04 + i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
})

function dayLabel(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-IN', { weekday: 'short' })
}

export function Insights() {
  const { totals, goals } = useApp()
  const [range, setRange] = useState<'week' | 'month'>('week')
  const days = [
    ...WEEK_HISTORY.map((d, i) => ({ ...d, day: dayLabel(i - 6), today: false })),
    {
      day: 'Today',
      calories: Math.round(totals.calories ?? 0),
      protein: totals.protein ?? 0,
      carbs: totals.carbs ?? 0,
      fat: totals.fat ?? 0,
      fiber: totals.fiber ?? 0,
      micro: 0,
      today: true,
    },
  ]
  const [sel, setSel] = useState(days.length - 1)
  const past = days.slice(0, -1)
  const avg = (k: 'calories' | 'protein' | 'fiber') => past.reduce((a, d) => a + d[k], 0) / past.length
  const avgP = past.reduce((a, d) => a + d.protein * 4, 0)
  const avgC = past.reduce((a, d) => a + d.carbs * 4, 0)
  const avgF = past.reduce((a, d) => a + d.fat * 9, 0)
  const sumE = avgP + avgC + avgF

  // Chart geometry
  const W = 340,
    H = 170,
    top = 18,
    base = H - 24
  const max = Math.max(goals.calories * 1.2, ...days.map((d) => d.calories))
  const y = (v: number) => base - (v / max) * (base - top)
  const bw = 26
  const step = (W - 40) / days.length
  const s = days[sel]

  return (
    <div className="page">
      <motion.header className="screen-head" {...fade(0)}>
        <div>
          <div className="eyebrow">Your trends</div>
          <h1 className="h1">Insights</h1>
        </div>
      </motion.header>
      <motion.div {...fade(1)} style={{ marginTop: 16 }}>
        <Segmented value={range} onChange={setRange} options={[{ value: 'week', label: 'This week' }, { value: 'month', label: '30 days' }]} />
      </motion.div>

      {/* Stat tiles */}
      <div className="stat-grid">
        {[
          { label: 'Avg calories', value: fmt(avg('calories')), unit: 'kcal', delta: '−3%', good: true, down: true },
          { label: 'Avg protein', value: fmt(avg('protein')), unit: 'g', delta: '+8%', good: true },
          { label: 'Avg fiber', value: fmt(avg('fiber')), unit: 'g', delta: '+12%', good: true },
          { label: 'Avg micro score', value: fmt(past.reduce((a, d) => a + d.micro, 0) / past.length), unit: '/100', delta: '−4', good: false, down: true },
        ].map((t, i) => (
          <motion.div key={t.label} className="stat" {...fade(2 + i * 0.4)}>
            <span className="stat-label">{t.label}</span>
            <div className="stat-val">
              <b className="num">{t.value}</b>
              <small>{t.unit}</small>
            </div>
            <span className={`delta ${t.good ? 'up' : 'down'}`}>
              {'down' in t && t.down ? <TrendingDown size={13} /> : <TrendingUp size={13} />} {t.delta} vs last week
            </span>
          </motion.div>
        ))}
      </div>

      {/* Calorie chart */}
      <motion.section className="card chart-card" {...fade(4)}>
        <div className="chart-head">
          <div>
            <div className="h2">Calories</div>
            <div className="muted micro-sub">Daily intake vs your {fmt(goals.calories)} kcal goal</div>
          </div>
          <div className="chart-readout">
            <b className="num">{fmt(s.calories)}</b>
            <span>{s.today ? 'Today so far' : s.day}</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Calories per day for the last 7 days">
          {[0.5, 1].map((f) => (
            <line key={f} x1={0} x2={W} y1={y(goals.calories * f)} y2={y(goals.calories * f)} stroke="var(--line)" strokeWidth={1} />
          ))}
          <line x1={0} x2={W} y1={y(goals.calories)} y2={y(goals.calories)} stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={W} y={y(goals.calories) + 4} textAnchor="end" className="chart-goal" paintOrder="stroke" stroke="var(--surface)" strokeWidth={6}>
            {fmt(goals.calories)}
          </text>
          {days.map((d, i) => {
            const x = i * step + (step - bw) / 2
            const h = base - y(d.calories)
            const active = i === sel
            return (
              <g key={i} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                <rect x={i * step} y={0} width={step} height={H} fill="transparent" />
                <motion.rect
                  x={x}
                  width={bw}
                  rx={7}
                  initial={{ height: 0, y: base }}
                  animate={{ height: h, y: base - h }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  fill={active ? 'url(#barGrad)' : d.today ? 'var(--brand-soft)' : 'var(--bar)'}
                  stroke={d.today && !active ? 'var(--brand)' : 'none'}
                  strokeDasharray={d.today && !active ? '3 3' : undefined}
                />
                <text x={i * step + step / 2} y={H - 6} textAnchor="middle" className={`chart-x ${active ? 'on' : ''}`}>
                  {d.today ? 'Today' : d.day}
                </text>
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
        <div className="muted micro-sub">7‑day average · target 25 / 45 / 30</div>
        <div className="split">
          {[
            { k: 'Protein', v: avgP / sumE, c: 'var(--c-protein)' },
            { k: 'Carbs', v: avgC / sumE, c: 'var(--c-carbs)' },
            { k: 'Fat', v: avgF / sumE, c: 'var(--c-fat)' },
          ].map((m, i) => (
            <motion.div key={m.k} className="split-seg" initial={{ flexGrow: 0 }} animate={{ flexGrow: m.v }} transition={{ duration: 0.9, delay: 0.3 + i * 0.1 }}>
              <span className="split-bar" style={{ background: m.c }} />
              <b className="num">{Math.round(m.v * 100)}%</b>
              <span>{m.k}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Heatmap */}
      <motion.section className="card" style={{ marginTop: 12 }} {...fade(6)}>
        <div className="h2">Nutrient consistency</div>
        <div className="muted micro-sub">% of daily goal · last 14 days</div>
        <Heatmap />
      </motion.section>

      {/* Highlights */}
      <div className="section-head">
        <h2 className="h2">This week</h2>
      </div>
      <div className="hl-list">
        {[
          { icon: <Flame size={18} />, tone: 'warm', title: `${PROFILE.streak}‑day logging streak`, body: 'Your longest yet. Log dinner to keep it alive.' },
          { icon: <Trophy size={18} />, tone: 'good', title: 'Protein goal hit 5 of 7 days', body: 'Up from 3 last week — great consistency.' },
          { icon: <TrendingDown size={18} />, tone: 'bad', title: 'Vitamin D is your weakest link', body: 'Averaging 41% of goal. Salmon, eggs or 15 min of sun help.' },
        ].map((h, i) => (
          <motion.div key={h.title} className="hl-card" {...fade(7 + i * 0.5)}>
            <span className={`hl-icon ${h.tone}`}>{h.icon}</span>
            <div>
              <b>{h.title}</b>
              <span>{h.body}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function Heatmap() {
  const [cell, setCell] = useState<{ r: number; c: number } | null>(null)
  const color = (v: number) => {
    // Sequential single-hue ramp (green), light → dark.
    const i = v >= 100 ? 5 : v >= 80 ? 4 : v >= 60 ? 3 : v >= 40 ? 2 : v >= 20 ? 1 : 0
    return `var(--h${i})`
  }
  const sel = cell ? NUTRIENT_HEATMAP[cell.r] : null
  return (
    <div className="heat">
      <div className="heat-tip">
        {sel && cell ? (
          <>
            <b>{sel.label}</b> · {cell.c === 13 ? 'today' : `${13 - cell.c} days ago`} · <b className="num">{sel.values[cell.c]}%</b> of goal
          </>
        ) : (
          <span className="muted">Tap a cell for details</span>
        )}
      </div>
      {NUTRIENT_HEATMAP.map((row, r) => (
        <div key={row.key} className="heat-row">
          <span className="heat-label">{row.label}</span>
          <div className="heat-cells">
            {row.values.map((v, c) => (
              <motion.button
                key={c}
                className={`heat-cell ${cell?.r === r && cell?.c === c ? 'on' : ''}`}
                style={{ background: color(v) }}
                onClick={() => setCell({ r, c })}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + c * 0.02 + r * 0.03 }}
                aria-label={`${row.label}, ${v}% of goal`}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="heat-legend">
        <span>0%</span>
        {[0, 1, 2, 3, 4, 5].map((i) => `var(--h${i})`).map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
        <span>100%+</span>
      </div>
    </div>
  )
}
