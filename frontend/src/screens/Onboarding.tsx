import { motion } from 'motion/react'
import { useState } from 'react'
import { useApp } from '../state/store'
import { Segmented } from '../components/Segmented'
import { computeGoals, saveProfileAndGoals, startFreshOnDevice, type Activity, type Aim, type Profile, type Sex } from '../lib/api'
import { fmt } from '../lib/nutrition'

/** "About you" onboarding (from App_nut): profile in, daily targets out, previewed as you type. */

const ACTIVITIES: { key: Activity; label: string; desc: string }[] = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Desk job, little exercise' },
  { key: 'light', label: 'Lightly active', desc: 'Light exercise 1–3 days a week' },
  { key: 'moderate', label: 'Moderately active', desc: 'Exercise 3–5 days a week' },
  { key: 'active', label: 'Very active', desc: 'Hard exercise 6–7 days a week' },
  { key: 'athlete', label: 'Athlete', desc: 'Training twice a day' },
]

const GOALS: { key: Aim; label: string; emoji: string }[] = [
  { key: 'lose', label: 'Lose weight', emoji: '🔥' },
  { key: 'maintain', label: 'Maintain', emoji: '⚖️' },
  { key: 'gain', label: 'Build muscle', emoji: '💪' },
]

const LIMITS = { age: [19, 110], height: [100, 250], weight: [30, 300] } as const

export function Onboarding() {
  const { profile, setProfile, setGoals, finishOnboarding, showToast, reload } = useApp()
  const [name, setName] = useState(profile?.name ?? '')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<Sex>('unspecified')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activity, setActivity] = useState<Activity>('sedentary')
  const [aim, setAim] = useState<Aim>('maintain')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const nAge = Number(age)
  const nHeight = Number(height)
  const nWeight = Number(weight)
  const inRange = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi
  const complete = inRange(nAge, LIMITS.age) && inRange(nHeight, LIMITS.height) && inRange(nWeight, LIMITS.weight)

  const draft: Profile = {
    name: name.trim(),
    sex,
    age: nAge,
    heightCm: nHeight,
    weightKg: nWeight,
    targetKg: profile?.targetKg ?? null,
    activity,
    aim,
    macroPreset: 'bodyweight',
    diets: profile?.diets ?? [],
    maintenanceKcal: 0,
  }
  const preview = complete ? computeGoals(draft) : null
  const bmi = complete ? nWeight / (nHeight / 100) ** 2 : null

  const submit = async () => {
    if (!complete) {
      setError(
        !age || !height || !weight
          ? 'Age, height and weight are needed to calculate your targets.'
          : `Please check your numbers: age ${LIMITS.age.join('–')}, height ${LIMITS.height.join('–')} cm, weight ${LIMITS.weight.join('–')} kg.`,
      )
      return
    }
    setError(null)
    setSaving(true)
    try {
      startFreshOnDevice()
      const res = await saveProfileAndGoals(draft, null)
      setProfile(res.profile)
      setGoals(res.goals)
      finishOnboarding()
      reload()
      showToast({ emoji: '🎯', title: 'Your targets are ready', body: `${fmt(res.goals.calories)} kcal · ${res.goals.protein} g protein a day` })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="onboard">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Step 1 of 1</div>
        <h1 className="h1">About you</h1>
        <p className="muted onboard-lede">We use these to work out your daily calorie, macro and micronutrient targets. You can change any of them later under Goals.</p>
      </motion.header>

      <motion.section className="card onboard-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <label className="text-field">
          <span>Name (optional)</span>
          <input value={name} maxLength={80} placeholder="What should we call you?" onChange={(e) => setName(e.target.value)} aria-label="Name" />
        </label>

        <div className="onboard-row">
          <label className="text-field">
            <span>Age</span>
            <input type="number" inputMode="numeric" value={age} placeholder="30" min={19} max={110} onChange={(e) => setAge(e.target.value)} aria-label="Age" />
          </label>
          <label className="text-field">
            <span>Height (cm)</span>
            <input type="number" inputMode="decimal" value={height} placeholder="170" min={100} max={250} onChange={(e) => setHeight(e.target.value)} aria-label="Height" />
          </label>
          <label className="text-field">
            <span>Weight (kg)</span>
            <input type="number" inputMode="decimal" value={weight} placeholder="70" min={30} max={300} step={0.1} onChange={(e) => setWeight(e.target.value)} aria-label="Weight" />
          </label>
        </div>

        <div className="onboard-label">Sex</div>
        <Segmented
          value={sex}
          onChange={setSex}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
            { value: 'unspecified', label: 'Rather not say' },
          ]}
        />

        <div className="onboard-label">Activity level</div>
        <div className="choice-list" role="radiogroup" aria-label="Activity level">
          {ACTIVITIES.map((a) => (
            <button key={a.key} role="radio" aria-checked={activity === a.key} className={`choice ${activity === a.key ? 'on' : ''}`} onClick={() => setActivity(a.key)}>
              <b>{a.label}</b>
              <span>{a.desc}</span>
            </button>
          ))}
        </div>

        <div className="onboard-label">Goal</div>
        <div className="goal-choices" role="radiogroup" aria-label="Goal">
          {GOALS.map((g) => (
            <button key={g.key} role="radio" aria-checked={aim === g.key} className={`goal-choice ${aim === g.key ? 'on' : ''}`} onClick={() => setAim(g.key)}>
              <span>{g.emoji}</span>
              {g.label}
            </button>
          ))}
        </div>
      </motion.section>

      <motion.div className={`target-preview ${preview ? 'ready' : ''}`} aria-live="polite" layout>
        {preview ? (
          <>
            <div className="tp-kcal">
              <b className="num" data-testid="preview-kcal">
                {fmt(preview.calories)}
              </b>
              <span>kcal a day</span>
            </div>
            <div className="tp-macros">
              <span>
                <b className="num">{preview.protein} g</b> protein
              </span>
              <span>
                <b className="num">{preview.carbs} g</b> carbs
              </span>
              <span>
                <b className="num">{preview.fat} g</b> fat
              </span>
              <span>
                <b className="num">{preview.fiber} g</b> fiber
              </span>
            </div>
            {bmi && <div className="tp-bmi">BMI {bmi.toFixed(1)}</div>}
          </>
        ) : (
          <span className="muted">Your targets appear here as you fill in age, height and weight.</span>
        )}
      </motion.div>

      {error && (
        <p className="field-error onboard-error" role="alert">
          {error}
        </p>
      )}
      <motion.button className="btn btn-primary btn-block" whileTap={{ scale: 0.97 }} onClick={submit} disabled={saving}>
        {saving ? 'Calculating…' : 'Calculate my targets'}
      </motion.button>
      <p className="welcome-note" style={{ textAlign: 'center' }}>
        These are a starting point from population formulas, not a prescription. Check with a doctor or dietitian before an aggressive deficit.
      </p>
    </div>
  )
}
