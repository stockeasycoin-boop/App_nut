import { motion } from 'motion/react'
import { Bell, ChevronRight, HeartPulse, Ruler, Settings } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { useApp } from '../state/store'
import { Segmented } from '../components/Segmented'
import { PROFILE } from '../data/mock'
import { fmt } from '../lib/nutrition'

type Aim = 'lose' | 'maintain' | 'gain'
type Preset = 'balanced' | 'protein' | 'lowcarb' | 'keto'

const PRESETS: Record<Preset, { label: string; p: number; c: number; f: number }> = {
  balanced: { label: 'Balanced', p: 25, c: 45, f: 30 },
  protein: { label: 'High protein', p: 35, c: 40, f: 25 },
  lowcarb: { label: 'Low carb', p: 30, c: 25, f: 45 },
  keto: { label: 'Keto', p: 25, c: 5, f: 70 },
}

const DIETS = ['Vegetarian', 'Eggetarian', 'Vegan', 'Jain', 'Gluten‑free', 'Lactose‑free', 'Nut allergy']

const fade = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.04 + i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
})

export function Profile() {
  const { goals, setGoals, showToast, theme, setTheme } = useApp()
  const [aim, setAim] = useState<Aim>('lose')
  const [preset, setPreset] = useState<Preset>('balanced')
  const [diets, setDiets] = useState<string[]>(['Eggetarian'])
  const kcal = goals.calories
  const pr = PRESETS[preset]
  const grams = { protein: Math.round((kcal * pr.p) / 100 / 4), carbs: Math.round((kcal * pr.c) / 100 / 4), fat: Math.round((kcal * pr.f) / 100 / 9) }
  const bmi = PROFILE.weightKg / (PROFILE.heightCm / 100) ** 2
  const weeks = Math.round(((PROFILE.weightKg - PROFILE.targetKg) * 7700) / ((2550 - kcal) * 7))

  const apply = (k: number, p: Preset) => {
    const x = PRESETS[p]
    setGoals({ calories: k, protein: Math.round((k * x.p) / 400), carbs: Math.round((k * x.c) / 400), fat: Math.round((k * x.f) / 900) })
  }

  return (
    <div className="page">
      <motion.header className="screen-head" {...fade(0)}>
        <div>
          <div className="eyebrow">Personalise</div>
          <h1 className="h1">Your goals</h1>
        </div>
        <button className="icon-btn" aria-label="Settings">
          <Settings size={19} />
        </button>
      </motion.header>

      <motion.section className="profile-card" {...fade(1)}>
        <div className="avatar">{PROFILE.name[0]}</div>
        <div className="profile-main">
          <b>{PROFILE.name}</b>
          <span>
            {PROFILE.age} yrs · {PROFILE.sex} · {PROFILE.activity}
          </span>
        </div>
        <ChevronRight size={18} className="muted" />
        <div className="profile-stats">
          <div>
            <b className="num">{PROFILE.weightKg}</b>
            <span>kg now</span>
          </div>
          <div>
            <b className="num">{PROFILE.targetKg}</b>
            <span>kg target</span>
          </div>
          <div>
            <b className="num">{bmi.toFixed(1)}</b>
            <span>BMI</span>
          </div>
          <div>
            <b className="num">{PROFILE.heightCm}</b>
            <span>cm</span>
          </div>
        </div>
      </motion.section>

      <div className="section-head">
        <h2 className="h2">Goal</h2>
      </div>
      <motion.div {...fade(2)}>
        <Segmented
          value={aim}
          onChange={(a) => {
            setAim(a)
            const k = a === 'lose' ? 2100 : a === 'maintain' ? 2550 : 2900
            apply(k, preset)
          }}
          options={[
            { value: 'lose', label: '🔥 Lose' },
            { value: 'maintain', label: '⚖️ Maintain' },
            { value: 'gain', label: '💪 Gain' },
          ]}
        />
      </motion.div>

      <motion.section className="card kcal-card" {...fade(3)}>
        <div className="kcal-top">
          <div>
            <span className="eyebrow">Daily calories</span>
            <div className="kcal-big">
              <b className="num">{fmt(kcal)}</b>
              <small>kcal</small>
            </div>
          </div>
          {aim === 'lose' && weeks > 0 && (
            <span className="eta">
              🎯 {PROFILE.targetKg} kg in ~{weeks} wks
            </span>
          )}
        </div>
        <input
          type="range"
          className="slider"
          min={1400}
          max={3400}
          step={50}
          value={kcal}
          onChange={(e) => apply(Number(e.target.value), preset)}
          style={{ '--fill': `${((kcal - 1400) / 2000) * 100}%` } as CSSProperties}
          aria-label="Daily calorie target"
        />
        <div className="slider-scale">
          <span>1,400</span>
          <span>Maintenance 2,550</span>
          <span>3,400</span>
        </div>
      </motion.section>

      <div className="section-head">
        <h2 className="h2">Macro split</h2>
      </div>
      <motion.section className="card" {...fade(4)}>
        <div className="preset-row">
          {(Object.keys(PRESETS) as Preset[]).map((p) => (
            <button
              key={p}
              className={`preset ${p === preset ? 'on' : ''}`}
              onClick={() => {
                setPreset(p)
                apply(kcal, p)
              }}
            >
              {PRESETS[p].label}
            </button>
          ))}
        </div>
        <div className="mix">
          {[
            { k: 'Protein', pct: pr.p, g: grams.protein, c: 'var(--c-protein)' },
            { k: 'Carbs', pct: pr.c, g: grams.carbs, c: 'var(--c-carbs)' },
            { k: 'Fat', pct: pr.f, g: grams.fat, c: 'var(--c-fat)' },
          ].map((m) => (
            <motion.span key={m.k} className="mix-seg" style={{ background: m.c }} animate={{ flexGrow: m.pct }} transition={{ type: 'spring', stiffness: 200, damping: 26 }} />
          ))}
        </div>
        <div className="mix-legend">
          {[
            { k: 'Protein', pct: pr.p, g: grams.protein, c: 'var(--c-protein)' },
            { k: 'Carbs', pct: pr.c, g: grams.carbs, c: 'var(--c-carbs)' },
            { k: 'Fat', pct: pr.f, g: grams.fat, c: 'var(--c-fat)' },
          ].map((m) => (
            <div key={m.k}>
              <span>
                <i style={{ background: m.c }} />
                {m.k}
              </span>
              <b className="num">{m.g} g</b>
              <small>{m.pct}%</small>
            </div>
          ))}
        </div>
      </motion.section>

      <div className="section-head">
        <h2 className="h2">Micronutrient targets</h2>
      </div>
      <motion.section className="card target-card" {...fade(5)}>
        <div className="target-row">
          <span className="target-ic">
            <HeartPulse size={18} />
          </span>
          <div>
            <b>RDA for your age & sex</b>
            <span>19 vitamins & minerals · auto‑adjusted</span>
          </div>
          <span className="switch on" aria-hidden />
        </div>
        <div className="target-row">
          <span className="target-ic" style={{ background: 'var(--warn-soft)', color: 'var(--warn-text)' }}>
            <Ruler size={18} />
          </span>
          <div>
            <b>Limits</b>
            <span>
              Sodium {fmt(goals.sodium)} mg · Sugar {goals.sugar} g · Sat fat {goals.satFat} g
            </span>
          </div>
          <ChevronRight size={18} className="muted" />
        </div>
      </motion.section>

      <div className="section-head">
        <h2 className="h2">Diet & allergies</h2>
      </div>
      <motion.div className="diet-chips" {...fade(6)}>
        {DIETS.map((d) => {
          const on = diets.includes(d)
          return (
            <motion.button key={d} whileTap={{ scale: 0.94 }} className={`diet ${on ? 'on' : ''}`} onClick={() => setDiets(on ? diets.filter((x) => x !== d) : [...diets, d])}>
              {on && '✓ '}
              {d}
            </motion.button>
          )
        })}
      </motion.div>

      <div className="section-head">
        <h2 className="h2">Appearance</h2>
      </div>
      <motion.div {...fade(7)}>
        <Segmented
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'Auto' },
            { value: 'light', label: '☀️ Light' },
            { value: 'dark', label: '🌙 Dark' },
          ]}
        />
      </motion.div>

      <motion.section className="card settings" {...fade(8)}>
        {[
          { icon: <Bell size={18} />, label: 'Meal reminders', value: '3 a day' },
          { icon: <HeartPulse size={18} />, label: 'Connect Health / Google Fit', value: 'Off' },
          { icon: <Ruler size={18} />, label: 'Units', value: 'Metric' },
        ].map((r) => (
          <button key={r.label} className="set-row">
            <span className="set-ic">{r.icon}</span>
            <span className="set-label">{r.label}</span>
            <span className="set-val">{r.value}</span>
            <ChevronRight size={16} className="muted" />
          </button>
        ))}
      </motion.section>

      <button className="btn btn-dark btn-block" style={{ marginTop: 16 }} onClick={() => showToast({ emoji: '🎯', title: 'Goals saved', body: `${fmt(kcal)} kcal · ${grams.protein} g protein a day` })}>
        Save goals
      </button>
    </div>
  )
}
