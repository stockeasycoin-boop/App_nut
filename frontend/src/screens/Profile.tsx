import { motion } from 'motion/react'
import { ChevronRight, HeartPulse, Info, LogOut, Server, Ruler } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { useApp } from '../state/store'
import { Segmented } from '../components/Segmented'
import { Sheet } from '../components/Sheet'
import { PRESETS, computeCalories, getServerUrl, macroGrams, macroSplit, saveProfileAndGoals, setServerUrl, testServer, type Activity, type Aim, type Preset, type Profile as ProfileT, type Sex } from '../lib/api'
import { fmt } from '../lib/nutrition'

const DIETS = ['Vegetarian', 'Eggetarian', 'Vegan', 'Jain', 'Gluten‑free', 'Lactose‑free', 'Nut allergy']
export const SEX_LABEL: Record<Sex, string> = { male: 'Male', female: 'Female', unspecified: 'Sex not given' }
export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
  athlete: 'Athlete',
}

const fade = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.04 + i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
})

export function Profile() {
  const { goals, setGoals, profile, setProfile, showToast, theme, setTheme, serverMode, reload, signOut } = useApp()
  const [draft, setDraft] = useState<ProfileT | null>(profile)
  const [customKcal, setCustomKcal] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [serverOpen, setServerOpen] = useState(false)

  // Keep the draft in sync when the profile (re)loads.
  useEffect(() => {
    setDraft(profile)
    setCustomKcal(null)
  }, [profile])

  if (!draft || !profile) return <div className="page" />

  const autoKcal = computeCalories(draft)
  const kcal = customKcal ?? (draftChanged(draft, profile) ? autoKcal : goals.calories)
  const grams = macroGrams(kcal, draft.macroPreset, draft.weightKg, draft.aim)
  const pr = macroSplit(grams)
  const bmi = draft.weightKg / (draft.heightCm / 100) ** 2
  const maintenance = computeCalories({ ...draft, aim: 'maintain' })
  const weeks = draft.targetKg && draft.aim === 'lose' && kcal < maintenance ? Math.round(((draft.weightKg - draft.targetKg) * 7700) / ((maintenance - kcal) * 7)) : 0
  const dirty = customKcal !== null || draftChanged(draft, profile)
  const update = (patch: Partial<ProfileT>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  const save = async () => {
    setSaving(true)
    try {
      const res = await saveProfileAndGoals(draft, customKcal)
      setProfile(res.profile)
      setGoals(res.goals)
      showToast({ emoji: '🎯', title: 'Goals saved', body: `${fmt(res.goals.calories)} kcal · ${res.goals.protein} g protein a day` })
    } catch (e) {
      showToast({ emoji: '⚠️', title: 'Couldn’t save', body: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <motion.header className="screen-head" {...fade(0)}>
        <div>
          <div className="eyebrow">Personalise</div>
          <h1 className="h1">Your goals</h1>
        </div>
      </motion.header>

      <motion.button className="profile-card" {...fade(1)} onClick={() => setEditing(true)} aria-label="Edit profile">
        <div className="avatar">{draft.name ? draft.name[0].toUpperCase() : '🙂'}</div>
        <div className="profile-main">
          <b>{draft.name || 'Your profile'}</b>
          <span>
            {draft.age} yrs · {SEX_LABEL[draft.sex]} · {ACTIVITY_LABEL[draft.activity]}
          </span>
        </div>
        <ChevronRight size={18} style={{ opacity: 0.6 }} />
        <div className="profile-stats">
          <div>
            <b className="num">{draft.weightKg}</b>
            <span>kg now</span>
          </div>
          <div>
            <b className="num">{draft.targetKg ?? '—'}</b>
            <span>kg target</span>
          </div>
          <div>
            <b className="num">{bmi.toFixed(1)}</b>
            <span>BMI</span>
          </div>
          <div>
            <b className="num">{draft.heightCm}</b>
            <span>cm</span>
          </div>
        </div>
      </motion.button>

      <div className="section-head">
        <h2 className="h2">Goal</h2>
      </div>
      <motion.div {...fade(2)}>
        <Segmented
          value={draft.aim}
          onChange={(a: Aim) => {
            update({ aim: a })
            setCustomKcal(null)
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
              <b className="num" data-testid="goal-kcal">
                {fmt(kcal)}
              </b>
              <small>kcal</small>
            </div>
          </div>
          {weeks > 0 && (
            <span className="eta">
              🎯 {draft.targetKg} kg in ~{weeks} wks
            </span>
          )}
        </div>
        <input
          type="range"
          className="slider"
          min={1200}
          max={4000}
          step={50}
          value={kcal}
          onChange={(e) => setCustomKcal(Number(e.target.value))}
          style={{ '--fill': `${((kcal - 1200) / 2800) * 100}%` } as CSSProperties}
          aria-label="Daily calorie target"
        />
        <div className="slider-scale">
          <span>1,200</span>
          <span>Maintenance {fmt(maintenance)}</span>
          <span>4,000</span>
        </div>
        {customKcal !== null && (
          <button className="link" style={{ marginTop: 10 }} onClick={() => setCustomKcal(null)}>
            Use recommended ({fmt(autoKcal)} kcal)
          </button>
        )}
      </motion.section>

      <div className="section-head">
        <h2 className="h2">Macro split</h2>
      </div>
      <motion.section className="card" {...fade(4)}>
        <div className="preset-row">
          {(Object.keys(PRESETS) as Preset[]).map((p) => (
            <button key={p} className={`preset ${p === draft.macroPreset ? 'on' : ''}`} aria-pressed={p === draft.macroPreset} onClick={() => update({ macroPreset: p })}>
              {PRESETS[p].label}
            </button>
          ))}
        </div>
        <div className="mix">
          {[
            { k: 'Protein', pct: pr.p, c: 'var(--c-protein)' },
            { k: 'Carbs', pct: pr.c, c: 'var(--c-carbs)' },
            { k: 'Fat', pct: pr.f, c: 'var(--c-fat)' },
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
        <h2 className="h2">Diet & allergies</h2>
      </div>
      <motion.div className="diet-chips" {...fade(5)}>
        {DIETS.map((d) => {
          const on = draft.diets.includes(d)
          return (
            <motion.button key={d} whileTap={{ scale: 0.94 }} className={`diet ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => update({ diets: on ? draft.diets.filter((x) => x !== d) : [...draft.diets, d] })}>
              {on && '✓ '}
              {d}
            </motion.button>
          )
        })}
      </motion.div>

      <motion.button className="btn btn-primary btn-block save-goals" style={{ marginTop: 18 }} disabled={!dirty || saving} onClick={save} {...fade(6)}>
        {saving ? 'Saving…' : dirty ? 'Save goals' : 'Goals saved'}
      </motion.button>

      <div className="section-head">
        <h2 className="h2">Vitamins & minerals</h2>
      </div>
      <motion.section className="card target-card" {...fade(7)}>
        <div className="target-row">
          <span className="target-ic">
            <HeartPulse size={18} />
          </span>
          <div>
            <b>Recommended daily intakes</b>
            <span>
              19 vitamins & minerals for {draft.age}-year-olds{draft.sex === 'unspecified' ? '' : ` (${draft.sex})`}, updated when your profile changes
            </span>
          </div>
        </div>
        <div className="target-row">
          <span className="target-ic" style={{ background: 'var(--warn-soft)', color: 'var(--warn-text)' }}>
            <Ruler size={18} />
          </span>
          <div>
            <b>Daily limits</b>
            <span>
              Sodium {fmt(goals.sodium)} mg · Sugar {goals.sugar} g · Sat fat {goals.satFat} g
            </span>
          </div>
        </div>
      </motion.section>

      <div className="section-head">
        <h2 className="h2">Appearance</h2>
      </div>
      <motion.div {...fade(8)}>
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

      <motion.section className="card settings" {...fade(9)}>
        <button className="set-row" onClick={() => setServerOpen(true)}>
          <span className="set-ic">
            <Server size={18} />
          </span>
          <span className="set-label">Server</span>
          <span className="set-val">{serverMode ? shortUrl(getServerUrl()) : 'Demo mode'}</span>
          <ChevronRight size={16} className="muted" />
        </button>
        <div className="set-row">
          <span className="set-ic">
            <Info size={18} />
          </span>
          <span className="set-label">Version</span>
          <span className="set-val">{__APP_VERSION__}</span>
        </div>
        <button className="set-row" onClick={signOut}>
          <span className="set-ic">
            <LogOut size={18} />
          </span>
          <span className="set-label">Sign out</span>
          <span className="set-val">Your log stays saved</span>
        </button>
      </motion.section>

      <ProfileEditor
        open={editing}
        profile={draft}
        onClose={() => setEditing(false)}
        onApply={(p) => {
          setDraft(p)
          setCustomKcal(null)
          setEditing(false)
        }}
      />
      <ServerSheet
        open={serverOpen}
        onClose={() => setServerOpen(false)}
        onSaved={(msg) => {
          setServerOpen(false)
          reload()
          showToast(msg)
        }}
      />
    </div>
  )
}

function draftChanged(a: ProfileT, b: ProfileT) {
  return (['name', 'sex', 'age', 'heightCm', 'weightKg', 'targetKg', 'activity', 'aim', 'macroPreset'] as const).some((k) => a[k] !== b[k]) || a.diets.join() !== b.diets.join()
}

const shortUrl = (u: string | null) => (u ?? '').replace(/^https?:\/\//, '')

function NumberField({ label, value, unit, min, max, step = 1, onChange }: { label: string; value: number; unit: string; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  return (
    <label className="num-field">
      <span>{label}</span>
      <div className="stepper">
        <button type="button" onClick={() => onChange(clamp(value - step))} aria-label={`Decrease ${label}`}>
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => e.target.value !== '' && onChange(Number(e.target.value))}
          onBlur={(e) => onChange(clamp(Number(e.target.value) || min))}
          aria-label={label}
        />
        <button type="button" onClick={() => onChange(clamp(value + step))} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
      <em>{unit}</em>
    </label>
  )
}

function ProfileEditor({ open, profile, onClose, onApply }: { open: boolean; profile: ProfileT; onClose: () => void; onApply: (p: ProfileT) => void }) {
  const [p, setP] = useState(profile)
  useEffect(() => {
    if (open) setP(profile)
  }, [open, profile])
  const set = (patch: Partial<ProfileT>) => setP((x) => ({ ...x, ...patch }))
  const valid = p.age >= 19 && p.age <= 110 && p.heightCm >= 100 && p.heightCm <= 250 && p.weightKg >= 30 && p.weightKg <= 300

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="h2" style={{ margin: '6px 0 14px' }}>
        About you
      </h2>
      <label className="text-field">
        <span>Name</span>
        <input value={p.name} maxLength={80} placeholder="Optional" onChange={(e) => set({ name: e.target.value })} aria-label="Name" />
      </label>
      <div style={{ margin: '12px 0' }}>
        <Segmented
          value={p.sex}
          onChange={(sex) => set({ sex })}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
            { value: 'unspecified', label: 'Not say' },
          ]}
        />
      </div>
      <div className="num-grid">
        <NumberField label="Age" value={p.age} unit="years" min={19} max={110} onChange={(age) => set({ age })} />
        <NumberField label="Height" value={p.heightCm} unit="cm" min={100} max={250} onChange={(heightCm) => set({ heightCm })} />
        <NumberField label="Weight" value={p.weightKg} unit="kg" min={30} max={300} step={0.5} onChange={(weightKg) => set({ weightKg })} />
        <NumberField label="Target" value={p.targetKg ?? p.weightKg} unit="kg" min={30} max={300} step={0.5} onChange={(targetKg) => set({ targetKg })} />
      </div>
      <div className="res-section-title">Activity</div>
      <div className="diet-chips">
        {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => (
          <button key={a} className={`diet ${p.activity === a ? 'on' : ''}`} aria-pressed={p.activity === a} onClick={() => set({ activity: a })}>
            {ACTIVITY_LABEL[a]}
          </button>
        ))}
      </div>
      <button className="btn btn-dark btn-block" style={{ marginTop: 18 }} disabled={!valid} onClick={() => onApply({ ...p, name: p.name.trim() })}>
        Done
      </button>
      <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 10 }}>
        Then tap “Save goals” to recalculate your targets.
      </p>
    </Sheet>
  )
}

function ServerSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (toast: { emoji: string; title: string; body?: string }) => void }) {
  const [url, setUrl] = useState(getServerUrl() ?? '')
  const [state, setState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  useEffect(() => {
    if (open) {
      setUrl(getServerUrl() ?? '')
      setState('idle')
    }
  }, [open])

  const connect = async () => {
    setState('testing')
    const ok = await testServer(url)
    setState(ok ? 'ok' : 'fail')
    if (ok) {
      setServerUrl(url)
      onSaved({ emoji: '🔗', title: 'Connected to server', body: shortUrl(getServerUrl()) })
    }
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="h2" style={{ margin: '6px 0 6px' }}>
        Server
      </h2>
      <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5, margin: '0 0 14px' }}>
        Connect to your NutriLens server for real photo analysis and to keep your log across devices. On the same Wi‑Fi, use your computer’s address, e.g. <b>192.168.1.20:8000</b>.
      </p>
      <label className="text-field">
        <span>Server address</span>
        <input
          value={url}
          placeholder="192.168.1.20:8000"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(e) => {
            setUrl(e.target.value)
            setState('idle')
          }}
          aria-label="Server address"
        />
      </label>
      {state === 'fail' && (
        <p className="field-error" role="alert">
          Couldn’t reach a NutriLens server there. Check the address and that your phone is on the same network.
        </p>
      )}
      <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={!url.trim() || state === 'testing'} onClick={connect}>
        {state === 'testing' ? 'Testing connection…' : 'Test & connect'}
      </button>
      <button
        className="btn btn-ghost btn-block"
        style={{ marginTop: 10 }}
        onClick={() => {
          setServerUrl(null)
          onSaved({ emoji: '📱', title: 'Demo mode', body: 'Your log is stored on this device.' })
        }}
      >
        Use demo mode on this device
      </button>
    </Sheet>
  )
}
