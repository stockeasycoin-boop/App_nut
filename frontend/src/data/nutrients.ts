export type NutrientKey =
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'sugar'
  | 'satFat'
  | 'omega3'
  | 'cholesterol'
  | 'sodium'
  | 'vitA'
  | 'vitC'
  | 'vitD'
  | 'vitE'
  | 'vitK'
  | 'b1'
  | 'b2'
  | 'b3'
  | 'b6'
  | 'b12'
  | 'folate'
  | 'calcium'
  | 'iron'
  | 'magnesium'
  | 'potassium'
  | 'zinc'
  | 'selenium'
  | 'phosphorus'

export type Nutrients = Partial<Record<NutrientKey, number>>

export type NutrientGroup = 'energy' | 'macro' | 'vitamin' | 'mineral'

export interface NutrientDef {
  key: NutrientKey
  label: string
  short: string
  unit: 'kcal' | 'g' | 'mg' | 'µg'
  group: NutrientGroup
  /** A "limit" nutrient is something to stay under (sodium, sugar…). */
  kind: 'target' | 'limit'
  color: string
  why: string
}

export const NUTRIENTS: NutrientDef[] = [
  { key: 'calories', label: 'Calories', short: 'Cal', unit: 'kcal', group: 'energy', kind: 'target', color: 'var(--c-cal)', why: 'Energy that powers everything you do.' },
  { key: 'protein', label: 'Protein', short: 'Pro', unit: 'g', group: 'macro', kind: 'target', color: 'var(--c-protein)', why: 'Builds and repairs muscle, keeps you full.' },
  { key: 'carbs', label: 'Carbs', short: 'Carb', unit: 'g', group: 'macro', kind: 'target', color: 'var(--c-carbs)', why: 'Your brain and muscles’ preferred fuel.' },
  { key: 'fat', label: 'Fat', short: 'Fat', unit: 'g', group: 'macro', kind: 'target', color: 'var(--c-fat)', why: 'Hormones, brain health and vitamin absorption.' },
  { key: 'fiber', label: 'Fiber', short: 'Fib', unit: 'g', group: 'macro', kind: 'target', color: 'var(--c-fiber)', why: 'Feeds gut bacteria and steadies blood sugar.' },
  { key: 'omega3', label: 'Omega‑3', short: 'Ω‑3', unit: 'g', group: 'macro', kind: 'target', color: 'var(--c-mineral)', why: 'Anti‑inflammatory fats for heart and brain.' },
  { key: 'sugar', label: 'Added sugar', short: 'Sug', unit: 'g', group: 'macro', kind: 'limit', color: 'var(--c-limit)', why: 'Keep it low to avoid energy crashes.' },
  { key: 'satFat', label: 'Saturated fat', short: 'Sat', unit: 'g', group: 'macro', kind: 'limit', color: 'var(--c-limit)', why: 'High intake raises LDL cholesterol.' },
  { key: 'cholesterol', label: 'Cholesterol', short: 'Chol', unit: 'mg', group: 'macro', kind: 'limit', color: 'var(--c-limit)', why: 'Dietary cholesterol, best kept moderate.' },
  { key: 'sodium', label: 'Sodium', short: 'Na', unit: 'mg', group: 'mineral', kind: 'limit', color: 'var(--c-limit)', why: 'Too much raises blood pressure.' },

  { key: 'vitA', label: 'Vitamin A', short: 'A', unit: 'µg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'Vision, skin and immune defence.' },
  { key: 'vitC', label: 'Vitamin C', short: 'C', unit: 'mg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'Antioxidant; helps you absorb iron.' },
  { key: 'vitD', label: 'Vitamin D', short: 'D', unit: 'µg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'Bone strength, mood and immunity.' },
  { key: 'vitE', label: 'Vitamin E', short: 'E', unit: 'mg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'Protects cells from oxidative stress.' },
  { key: 'vitK', label: 'Vitamin K', short: 'K', unit: 'µg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'Blood clotting and bone metabolism.' },
  { key: 'b1', label: 'Thiamin (B1)', short: 'B1', unit: 'mg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'Turns carbs into usable energy.' },
  { key: 'b2', label: 'Riboflavin (B2)', short: 'B2', unit: 'mg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'Energy production and healthy skin.' },
  { key: 'b3', label: 'Niacin (B3)', short: 'B3', unit: 'mg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'Supports metabolism and nerves.' },
  { key: 'b6', label: 'Vitamin B6', short: 'B6', unit: 'mg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'Protein metabolism and neurotransmitters.' },
  { key: 'b12', label: 'Vitamin B12', short: 'B12', unit: 'µg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'Red blood cells and nerve health.' },
  { key: 'folate', label: 'Folate (B9)', short: 'B9', unit: 'µg', group: 'vitamin', kind: 'target', color: 'var(--c-vitamin)', why: 'DNA synthesis and cell growth.' },

  { key: 'calcium', label: 'Calcium', short: 'Ca', unit: 'mg', group: 'mineral', kind: 'target', color: 'var(--c-mineral)', why: 'Bones, teeth and muscle contraction.' },
  { key: 'iron', label: 'Iron', short: 'Fe', unit: 'mg', group: 'mineral', kind: 'target', color: 'var(--c-mineral)', why: 'Carries oxygen in your blood.' },
  { key: 'magnesium', label: 'Magnesium', short: 'Mg', unit: 'mg', group: 'mineral', kind: 'target', color: 'var(--c-mineral)', why: 'Sleep, muscles and 300+ enzymes.' },
  { key: 'potassium', label: 'Potassium', short: 'K', unit: 'mg', group: 'mineral', kind: 'target', color: 'var(--c-mineral)', why: 'Balances fluids and blood pressure.' },
  { key: 'zinc', label: 'Zinc', short: 'Zn', unit: 'mg', group: 'mineral', kind: 'target', color: 'var(--c-mineral)', why: 'Immunity, healing and taste.' },
  { key: 'selenium', label: 'Selenium', short: 'Se', unit: 'µg', group: 'mineral', kind: 'target', color: 'var(--c-mineral)', why: 'Thyroid function and antioxidant defence.' },
  { key: 'phosphorus', label: 'Phosphorus', short: 'P', unit: 'mg', group: 'mineral', kind: 'target', color: 'var(--c-mineral)', why: 'Bone structure and energy storage.' },
]

export const NUTRIENT_MAP = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n])) as Record<NutrientKey, NutrientDef>

export const MACRO_KEYS: NutrientKey[] = ['protein', 'carbs', 'fat', 'fiber']
export const VITAMIN_KEYS = NUTRIENTS.filter((n) => n.group === 'vitamin').map((n) => n.key)
export const MINERAL_KEYS = NUTRIENTS.filter((n) => n.group === 'mineral' && n.kind === 'target').map((n) => n.key)
export const LIMIT_KEYS = NUTRIENTS.filter((n) => n.kind === 'limit').map((n) => n.key)

/** Default daily goals — adult, ~2,100 kcal, RDA-based micronutrients. */
export const DEFAULT_GOALS: Record<NutrientKey, number> = {
  calories: 2100,
  protein: 130,
  carbs: 235,
  fat: 70,
  fiber: 30,
  omega3: 1.6,
  sugar: 50,
  satFat: 20,
  cholesterol: 300,
  sodium: 2300,
  vitA: 900,
  vitC: 90,
  vitD: 15,
  vitE: 15,
  vitK: 120,
  b1: 1.2,
  b2: 1.3,
  b3: 16,
  b6: 1.3,
  b12: 2.4,
  folate: 400,
  calcium: 1000,
  iron: 18,
  magnesium: 400,
  potassium: 3400,
  zinc: 11,
  selenium: 55,
  phosphorus: 700,
}
