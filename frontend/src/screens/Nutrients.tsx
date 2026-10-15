import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../state/store'
import { Segmented } from '../components/Segmented'
import { Ring } from '../components/Ring'
import { Bar } from '../components/Bar'
import { LIMIT_KEYS, MINERAL_KEYS, NUTRIENT_MAP, VITAMIN_KEYS, type NutrientKey } from '../data/nutrients'
import { fmt, mealTotal, microCoverage, statusFor, STATUS_LABEL, type Status } from '../lib/nutrition'

type Group = 'vitamins' | 'minerals' | 'macros'

const GROUPS: Record<Group, NutrientKey[]> = {
  vitamins: VITAMIN_KEYS,
  minerals: MINERAL_KEYS,
  macros: ['protein', 'carbs', 'fat', 'fiber', 'omega3', ...LIMIT_KEYS],
}

const BOOSTERS: Partial<Record<NutrientKey, string>> = {
  vitD: '🐟 Salmon · 🥚 Eggs · 🍄 UV mushrooms · ☀️ 15 min sun',
  iron: '🥬 Spinach · 🫘 Lentils · 🥩 Lean beef · 🎃 Pumpkin seeds',
  calcium: '🥛 Milk · 🧀 Paneer · 🥬 Kale · 🌰 Almonds',
  magnesium: '🎃 Pumpkin seeds · 🍫 Dark chocolate · 🥜 Cashews',
  potassium: '🍌 Banana · 🥔 Potato · 🥥 Coconut water · 🫘 Beans',
  zinc: '🦪 Oysters · 🎃 Pumpkin seeds · 🫘 Chickpeas',
  vitE: '🌻 Sunflower seeds · 🌰 Almonds · 🥑 Avocado',
  b1: '🌾 Whole grains · 🫛 Peas · 🐖 Pork',
  b3: '🐔 Chicken · 🐟 Tuna · 🥜 Peanuts',
  folate: '🥬 Leafy greens · 🫘 Lentils · 🥦 Broccoli',
  fiber: '🫘 Beans · 🍐 Pears · 🌾 Oats · 🫐 Berries',
  protein: '🐔 Chicken · 🥚 Eggs · 🧀 Paneer · 🫘 Dal',
  vitK: '🥬 Kale · 🥦 Broccoli · 🫛 Edamame',
  selenium: '🌰 Brazil nuts · 🐟 Tuna · 🥚 Eggs',
  omega3: '🐟 Salmon · 🌰 Walnuts · 🌱 Chia seeds',
}

const STATUS_COLOR: Record<Status, string> = {
  low: 'var(--warn)',
  progress: 'var(--c-protein)',
  met: 'var(--ok)',
  over: 'var(--bad)',
}

export function NutrientsScreen() {
  const { totals, goals, meals } = useApp()
  const [group, setGroup] = useState<Group>('vitamins')
  const [open, setOpen] = useState<NutrientKey | null>(null)
  const micro = [...VITAMIN_KEYS, ...MINERAL_KEYS]
  const cov = microCoverage(totals, goals, micro)
  const counts = micro.reduce(
    (acc, k) => {
      acc[statusFor(k, totals[k] ?? 0, goals[k])]++
      return acc
    },
    { low: 0, progress: 0, met: 0, over: 0 } as Record<Status, number>,
  )

  return (
    <div className="page">
      <motion.header className="screen-head" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <div className="eyebrow">28 tracked today</div>
          <h1 className="h1">Nutrients</h1>
        </div>
      </motion.header>

      <motion.section className="cov-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <Ring size={108} stroke={11} progress={cov} gradient={['#4ad991', '#0f9d63']} track="rgba(255,255,255,.12)">
          <div>
            <b className="num cov-num">{Math.round(cov * 100)}</b>
            <span className="cov-of">/100</span>
          </div>
        </Ring>
        <div className="cov-body">
          <b>Micronutrient score</b>
          <span>How close you are to all 19 vitamin & mineral targets.</span>
          <div className="cov-counts">
            <span>
              <i style={{ background: 'var(--ok)' }} /> {counts.met} met
            </span>
            <span>
              <i style={{ background: '#8f9bff' }} /> {counts.progress} on track
            </span>
            <span>
              <i style={{ background: 'var(--warn)' }} /> {counts.low} low
            </span>
          </div>
        </div>
      </motion.section>

      <div style={{ margin: '16px 0 12px' }}>
        <Segmented
          value={group}
          onChange={(g) => {
            setGroup(g)
            setOpen(null)
          }}
          options={[
            { value: 'vitamins', label: 'Vitamins' },
            { value: 'minerals', label: 'Minerals' },
            { value: 'macros', label: 'Macros & limits' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={group} className="nlist" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
          {GROUPS[group].map((k, i) => {
            const def = NUTRIENT_MAP[k]
            const v = totals[k] ?? 0
            const g = goals[k]
            const st = statusFor(k, v, g)
            const isOpen = open === k
            const sources = meals
              .map((m) => ({ name: m.name, photo: m.photo, v: mealTotal(m)[k] ?? 0 }))
              .filter((s) => s.v > 0)
              .sort((a, b) => b.v - a.v)
            return (
              <motion.div key={k} className={`nrow ${isOpen ? 'open' : ''}`} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
                <button className="nrow-main" onClick={() => setOpen(isOpen ? null : k)} aria-expanded={isOpen}>
                  <div className="nrow-top">
                    <span className="nrow-name">
                      {def.label}
                      {def.kind === 'limit' && <em className="limit-tag">limit</em>}
                    </span>
                    <span className={`pill ${st}`}>{STATUS_LABEL[st]}</span>
                  </div>
                  <div className="nrow-mid">
                    <span className="nrow-val">
                      <b className="num">{fmt(v)}</b> / {fmt(g)} {def.unit}
                    </span>
                    <span className="nrow-pct num">{Math.round((v / g) * 100)}%</span>
                    <ChevronDown size={16} className="nrow-chev" />
                  </div>
                  <Bar value={v / g} color={STATUS_COLOR[st]} height={7} delay={0.1 + i * 0.03} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div className="nrow-more" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }}>
                      <p className="nrow-why">{def.why}</p>
                      {sources.length > 0 && (
                        <>
                          <div className="nrow-sub">Today’s sources</div>
                          {sources.map((s) => (
                            <div key={s.name} className="src">
                              <img src={s.photo} alt="" />
                              <span>{s.name}</span>
                              <Bar value={s.v / Math.max(v, 0.0001)} color="var(--ink-2)" height={5} />
                              <b className="num">
                                {fmt(s.v)} {def.unit}
                              </b>
                            </div>
                          ))}
                        </>
                      )}
                      {BOOSTERS[k] && def.kind === 'target' && st !== 'met' && (
                        <>
                          <div className="nrow-sub">Easy ways to close the gap</div>
                          <div className="boost">{BOOSTERS[k]}</div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
