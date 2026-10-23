import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, Images, Minus, Plus, Search, Sparkles, X, Zap, ZapOff, CameraOff } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state/store'
import { analyzeMealPhoto, foodItem, healthScore, logMeal, searchFoods, type Food, type ScanResult } from '../lib/api'
import { loadImage, openCamera, setTorch, squareJpeg, stopCamera, torchSupported, type CameraState } from '../lib/camera'
import { DEMO_SCAN, MEAL_META, SAMPLE_PHOTO, type MealType } from '../data/mock'
import { NUTRIENT_MAP, VITAMIN_KEYS, MINERAL_KEYS, type NutrientKey } from '../data/nutrients'
import { fmt, itemNutrients, itemsTotal } from '../lib/nutrition'
import { Ring } from '../components/Ring'
import { AnimatedNumber } from '../components/AnimatedNumber'

type Phase = 'camera' | 'analyzing' | 'results'

const STEPS = ['Detecting foods on your plate', 'Estimating portion sizes', 'Calculating 28 nutrients']

function suggestedMealType(): MealType {
  const h = new Date().getHours()
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner'
}

export function ScanFlow() {
  const { scanOpen, closeScan } = useApp()
  return <AnimatePresence>{scanOpen && <ScanInner key="scan" onClose={closeScan} />}</AnimatePresence>
}

function ScanInner({ onClose }: { onClose: () => void }) {
  const { showToast } = useApp()
  const [phase, setPhase] = useState<Phase>('camera')
  const [photo, setPhoto] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [step, setStep] = useState(0)
  const [cam, setCam] = useState<CameraState>('starting')
  const [torch, setTorchOn] = useState(false)
  const [canTorch, setCanTorch] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Live viewfinder while in the camera phase.
  useEffect(() => {
    if (phase !== 'camera') return
    let cancelled = false
    setCam('starting')
    openCamera()
      .then((stream) => {
        if (cancelled) return stopCamera(stream)
        streamRef.current = stream
        setCanTorch(torchSupported(stream))
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          v.play().catch(() => {})
        }
        setCam('live')
      })
      .catch(() => !cancelled && setCam('unavailable'))
    return () => {
      cancelled = true
      stopCamera(streamRef.current)
      streamRef.current = null
      setTorchOn(false)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'analyzing') return
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length)), 1100)
    return () => clearInterval(t)
  }, [phase])

  const analyse = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    setPhoto(url)
    setPhase('analyzing')
    setStep(0)
    analyzeMealPhoto(blob, url)
      .then((r) => {
        setResult(r)
        setPhase('results')
      })
      .catch((e: Error) => {
        setPhase('camera')
        setPhoto(null)
        showToast({ emoji: '📷', title: 'Couldn’t analyse that photo', body: e.message })
      })
  }

  const fromImageUrl = async (url: string) => {
    try {
      analyse(await squareJpeg(await loadImage(url)))
    } catch (e) {
      showToast({ emoji: '📷', title: 'Couldn’t open that image', body: (e as Error).message })
    }
  }

  const shutter = async () => {
    const v = videoRef.current
    if (cam === 'live' && v && v.videoWidth) {
      try {
        return analyse(await squareJpeg(v))
      } catch {
        /* fall through to the system camera */
      }
    }
    fileRef.current?.click()
  }

  const toggleTorch = () => {
    const next = !torch
    setTorch(streamRef.current, next)
      .then(() => setTorchOn(next))
      .catch(() => setCanTorch(false))
  }

  return (
    <motion.div
      className="scan"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Photo / viewfinder */}
      <motion.div
        className="scan-photo-wrap"
        animate={phase === 'results' ? { height: '44%' } : { height: '100%' }}
        transition={{ type: 'spring', stiffness: 160, damping: 26 }}
      >
        {photo && <img src={photo} alt="" className="scan-bg" aria-hidden />}
        <div className="scan-frame">
          {phase === 'camera' ? (
            <>
              <video ref={videoRef} className="scan-video" playsInline muted autoPlay aria-label="Camera preview" />
              {cam === 'unavailable' && (
                <div className="cam-off">
                  <CameraOff size={30} />
                  <b>Camera preview isn’t available</b>
                  <span>Tap the shutter to take a photo, or pick one from your gallery.</span>
                </div>
              )}
              <Viewfinder />
            </>
          ) : (
            photo && (
              <motion.img
                src={photo}
                alt="Your meal"
                className="scan-photo"
                initial={{ scale: 1.04 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            )
          )}
          {phase === 'analyzing' && <ScanBeam />}
          {phase === 'results' && result && <Pins result={result} />}
        </div>
        <div className="scan-vignette" />

        <div className="scan-top">
          <button className="glass-btn" onClick={onClose} aria-label="Close">
            {phase === 'results' ? <ChevronLeft size={22} /> : <X size={22} />}
          </button>
          {phase === 'camera' && (
            <span className="scan-hint">
              <Sparkles size={14} /> Fit the whole plate in frame
            </span>
          )}
          {phase === 'camera' && canTorch ? (
            <button className="glass-btn" aria-label={torch ? 'Turn flash off' : 'Turn flash on'} aria-pressed={torch} onClick={toggleTorch}>
              {torch ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
            </button>
          ) : (
            <span style={{ width: 44 }} />
          )}
        </div>
      </motion.div>

      {/* Camera controls */}
      <AnimatePresence>
        {phase === 'camera' && (
          <motion.div className="scan-controls" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
            <div className="scan-modes">
              <span className="on">Meal photo</span>
            </div>
            <div className="scan-buttons">
              <div className="cam-side">
                <button className="glass-btn lg" onClick={() => galleryRef.current?.click()} aria-label="Choose from gallery">
                  <Images size={22} />
                </button>
                <span>Gallery</span>
              </div>
              <motion.button className="shutter" whileTap={{ scale: 0.9 }} onClick={shutter} aria-label="Take photo">
                <span />
              </motion.button>
              <div className="cam-side">
                <button className="glass-btn lg sample-btn" onClick={() => fromImageUrl(SAMPLE_PHOTO)} aria-label="Try a sample meal">
                  <img src={SAMPLE_PHOTO} alt="" />
                </button>
                <span>Sample</span>
              </div>
            </div>
            {/* System camera (used when the live preview isn't available). */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              data-testid="camera-input"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) fromImageUrl(URL.createObjectURL(f))
              }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              hidden
              data-testid="gallery-input"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) fromImageUrl(URL.createObjectURL(f))
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyzing card */}
      <AnimatePresence>
        {phase === 'analyzing' && (
          <motion.div className="analyze-card" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
            <div className="analyze-title">
              <span className="analyze-orb">
                <Sparkles size={18} />
              </span>
              <div>
                <b>Analyzing your meal</b>
                <span>Usually takes a few seconds</span>
              </div>
            </div>
            <ul className="analyze-steps">
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>
                  <span className="step-dot">{i < step ? <Check size={13} strokeWidth={3.2} /> : null}</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>{phase === 'results' && result && <Results result={result} onDone={onClose} />}</AnimatePresence>
    </motion.div>
  )
}

function Viewfinder() {
  return (
    <div className="viewfinder">
      {['tl', 'tr', 'bl', 'br'].map((c) => (
        <motion.i
          key={c}
          className={`corner ${c}`}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function ScanBeam() {
  return (
    <>
      <div className="scan-grid" />
      <motion.div className="scan-beam" initial={{ top: '8%' }} animate={{ top: ['8%', '88%', '8%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
      {DEMO_SCAN.items.slice(0, 6).map((it, i) => (
        <motion.span
          key={it.id}
          className="scan-spark"
          style={{ left: `${it.pin!.x}%`, top: `${it.pin!.y}%` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 0.8], opacity: [0, 1, 0.7] }}
          transition={{ delay: 0.5 + i * 0.35, duration: 0.6 }}
        />
      ))}
    </>
  )
}

function Pins({ result }: { result: ScanResult }) {
  return (
    <>
      {result.items
        .filter((i) => i.pin)
        .slice(0, 6)
        .map((it, i) => (
          <span
            key={it.id}
            className={`pin-anchor ${it.pin!.x > 70 ? 'pin-r' : it.pin!.x < 30 ? 'pin-l' : ''}`}
            style={{ left: `${it.pin!.x}%`, top: `${it.pin!.y}%` }}
          >
            <motion.span
              className="pin"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35 + i * 0.08, type: 'spring', stiffness: 420, damping: 20 }}
            >
              <span className="pin-emoji">{it.emoji}</span>
              {it.label ?? it.name}
            </motion.span>
          </span>
        ))}
    </>
  )
}

const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} & ${xs[xs.length - 1]}`)

const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]

function Results({ result, onDone }: { result: ScanResult; onDone: () => void }) {
  const { totals, goals, addMeal, replaceMeal, removeMeal, setTab, showToast, celebrate } = useApp()
  const [items, setItems] = useState(result.items)
  const [mealType, setMealType] = useState<MealType>(suggestedMealType)
  const [searching, setSearching] = useState(false)
  const total = useMemo(() => itemsTotal(items), [items])
  const score = items.length ? healthScore(total) : 0

  const step = (id: string, dir: 1 | -1) =>
    setItems((list) =>
      list.map((it) => {
        if (it.id !== id) return it
        const idx = PORTIONS.indexOf(it.portion)
        const next = PORTIONS[Math.max(0, Math.min(PORTIONS.length - 1, (idx === -1 ? 2 : idx) + dir))]
        return { ...it, portion: next }
      }),
    )
  const remove = (id: string) => setItems((l) => l.filter((i) => i.id !== id))

  const highlights = useMemo(() => {
    return [...VITAMIN_KEYS, ...MINERAL_KEYS, 'fiber' as NutrientKey]
      .map((k) => ({ k, pct: (total[k] ?? 0) / goals[k] }))
      .filter((h) => h.pct >= 0.1)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6)
  }, [total, goals])

  const kcal = total.calories ?? 0
  const after = (totals.calories ?? 0) + kcal

  const log = () => {
    if (!items.length) return
    // Optimistic: show the meal immediately, then swap in the saved copy.
    const draft = {
      id: `draft-${Date.now()}`,
      type: mealType,
      name: result.name,
      time: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toUpperCase(),
      photo: result.photo,
      score,
      items,
    }
    addMeal(draft)
    const newlyMet = (['protein', 'fiber', 'vitC', 'vitA', 'iron', 'magnesium', 'calcium', 'vitD'] as NutrientKey[]).filter(
      (k) => (totals[k] ?? 0) < goals[k] && (totals[k] ?? 0) + (total[k] ?? 0) >= goals[k],
    )
    const left = Math.round(goals.calories - after)
    const type = mealType
    setTab('today')
    onDone()
    logMeal(draft, result.analysisId)
      .then((saved) => {
        replaceMeal(draft.id, saved)
        if (newlyMet.length) celebrate()
        showToast({
          emoji: '🎉',
          title: `${MEAL_META[type].label} logged · ${fmt(kcal)} kcal`,
          body: newlyMet.length
            ? `${listJoin(newlyMet.map((k) => NUTRIENT_MAP[k].label))} goal${newlyMet.length > 1 ? 's' : ''} reached · ${fmt(Math.max(0, left))} kcal left`
            : left >= 0
              ? `${fmt(left)} kcal left today`
              : `${fmt(-left)} kcal over today’s goal`,
        })
      })
      .catch((e: Error) => {
        removeMeal(draft.id)
        showToast({ emoji: '⚠️', title: 'Meal not saved', body: e.message })
      })
  }

  const macros: { k: NutrientKey; c: string }[] = [
    { k: 'protein', c: 'var(--c-protein)' },
    { k: 'carbs', c: 'var(--c-carbs)' },
    { k: 'fat', c: 'var(--c-fat)' },
    { k: 'fiber', c: 'var(--c-fiber)' },
  ]
  const before = Math.min(1, (totals.calories ?? 0) / goals.calories)

  return (
    <motion.div className="results" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 200, damping: 28, delay: 0.05 }}>
      <div className="sheet-grip" />
      <div className="results-body">
        {result.demo && (
          <div className="demo-note" role="note">
            <b>Demo result.</b> Without a server this always shows a sample analysis. Add your server under Goals → Server for real photo analysis.
          </div>
        )}
        <div className="res-head">
          <div style={{ minWidth: 0 }}>
            <span className="ai-chip">
              <Sparkles size={12} /> {Math.round(result.confidence * 100)}% match · {items.length} item{items.length === 1 ? '' : 's'}
            </span>
            <h2 className="h1 res-title">{result.name}</h2>
          </div>
          <div className="score" aria-label={`Health score ${score} out of 100`}>
            <Ring size={58} stroke={6} progress={score / 100} gradient={['#4ad991', '#0f9d63']}>
              <b className="num">{score}</b>
            </Ring>
            <span>Health</span>
          </div>
        </div>

        <div className="res-kcal-row">
          <div className="res-kcal">
            <span className="num" data-testid="result-kcal">
              <AnimatedNumber value={Math.round(kcal)} duration={0.6} />
            </span>
            <small>kcal</small>
          </div>
          <div className="res-macros">
            {macros.map((m) => (
              <div key={m.k}>
                <b className="num">
                  <AnimatedNumber value={Math.round(total[m.k] ?? 0)} duration={0.6} />g
                </b>
                <span>
                  <i style={{ background: m.c }} />
                  {NUTRIENT_MAP[m.k].label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Day impact */}
        <div className="impact">
          <div className="impact-label">
            <span>After this meal</span>
            <b className="num">
              {fmt(after)} / {fmt(goals.calories)} kcal
            </b>
          </div>
          <div className="impact-bar">
            <motion.span className="impact-before" initial={{ width: 0 }} animate={{ width: `${before * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
            <motion.span className="impact-add" initial={{ width: 0 }} animate={{ width: `${Math.min(1 - before, kcal / goals.calories) * 100}%` }} transition={{ duration: 0.8, delay: 0.8 }} />
          </div>
        </div>

        {/* Highlights */}
        {highlights.length > 0 && (
          <>
            <div className="res-section-title">Rich in</div>
            <div className="hl-row">
              {highlights.map(({ k, pct }) => (
                <span key={k} className="hl">
                  <b className="num">{Math.round(pct * 100)}%</b> {NUTRIENT_MAP[k].label.replace('Vitamin ', 'Vit ')}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Items */}
        <div className="res-section-title">
          Detected items <span className="muted">· tap ± to adjust portion</span>
        </div>
        <div className="items">
          <AnimatePresence initial={false}>
            {items.map((it) => {
              const n = itemNutrients(it)
              return (
                <motion.div key={it.id} className="item" layout exit={{ opacity: 0, x: -40, height: 0, marginBottom: -8 }} data-testid="result-item">
                  <span className="item-emoji">{it.emoji}</span>
                  <div className="item-body">
                    <b>{it.name}</b>
                    <span>
                      {Math.round(it.grams * it.portion)} g · <b className="num">{fmt(n.calories ?? 0)}</b> kcal
                      {it.confidence !== undefined && it.confidence < 0.85 && <em className="unsure"> · check me</em>}
                    </span>
                  </div>
                  <div className="stepper">
                    <button onClick={() => (it.portion === PORTIONS[0] ? remove(it.id) : step(it.id, -1))} aria-label={it.portion === PORTIONS[0] ? `Remove ${it.name}` : `Less ${it.name}`}>
                      {it.portion === PORTIONS[0] ? <X size={15} /> : <Minus size={15} />}
                    </button>
                    <span className="num">{it.portion}×</span>
                    <button onClick={() => step(it.id, 1)} aria-label={`More ${it.name}`} disabled={it.portion === PORTIONS[PORTIONS.length - 1]}>
                      <Plus size={15} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <button className="item-add" onClick={() => setSearching(true)}>
            <Plus size={16} /> Add something we missed
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="res-footer">
        <div className="meal-types" role="radiogroup" aria-label="Meal">
          {(Object.keys(MEAL_META) as MealType[]).map((t) => (
            <button key={t} role="radio" aria-checked={t === mealType} className={t === mealType ? 'on' : ''} onClick={() => setMealType(t)}>
              {t === mealType && <motion.span layoutId="mt-pill" className="mt-pill" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
              <span>{MEAL_META[t].label}</span>
            </button>
          ))}
        </div>
        <motion.button className="btn btn-primary btn-block log-btn" whileTap={{ scale: 0.97 }} onClick={log} disabled={!items.length}>
          <Check size={20} strokeWidth={2.8} />
          {items.length ? `Log ${MEAL_META[mealType].label.toLowerCase()} · ${fmt(kcal)} kcal` : 'Add at least one item'}
        </motion.button>
      </div>

      <AnimatePresence>
        {searching && (
          <FoodSearch
            onClose={() => setSearching(false)}
            onPick={(food) => {
              setItems((l) => [...l, foodItem(food)])
              setSearching(false)
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function FoodSearch({ onPick, onClose, title = 'Add a food' }: { onPick: (f: Food) => void; onClose: () => void; title?: string }) {
  const [q, setQ] = useState('')
  const [foods, setFoods] = useState<Food[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    const t = setTimeout(() => {
      searchFoods(q)
        .then((f) => live && (setFoods(f), setError(null)))
        .catch((e: Error) => live && setError(e.message))
    }, 180)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q])

  return (
    <motion.div className="food-search" role="dialog" aria-label={title} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
      <div className="fs-head">
        <b>{title}</b>
        <button className="icon-btn" onClick={onClose} aria-label="Close search">
          <X size={18} />
        </button>
      </div>
      <label className="fs-input">
        <Search size={18} />
        <input autoFocus placeholder="Search dal, roti, paneer, salmon…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search foods" />
      </label>
      <div className="fs-list">
        {error && <p className="fs-empty">{error}</p>}
        {!error && foods?.length === 0 && <p className="fs-empty">No match for “{q}”. Try a simpler name.</p>}
        {foods?.map((f) => (
          <button key={f.id} className="fs-row" onClick={() => onPick(f)}>
            <span className="item-emoji">{f.emoji}</span>
            <span className="fs-name">
              <b>{f.name}</b>
              <span>
                {f.servingG} g · {fmt(((f.per100g.calories ?? 0) * f.servingG) / 100)} kcal
              </span>
            </span>
            <Plus size={18} className="fs-plus" />
          </button>
        ))}
      </div>
    </motion.div>
  )
}
