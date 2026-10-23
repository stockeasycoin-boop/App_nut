import type { Nutrients } from './nutrients'
import eggToast from '../assets/food/egg-toast.jpg'
import pokeBowl from '../assets/food/poke-bowl.jpg'
import yogurt from '../assets/food/yogurt-parfait.jpg'
import buddhaBowl from '../assets/food/buddha-bowl.jpg'
import salmon from '../assets/food/salmon.jpg'
import spinachSalad from '../assets/food/spinach-salad.jpg'
import thali from '../assets/food/thali.jpg'
import tandoori from '../assets/food/tandoori.jpg'
import quinoa from '../assets/food/quinoa.jpg'
import paneerCurry from '../assets/food/paneer-curry.jpg'
import biryani from '../assets/food/biryani.jpg'

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner'

export interface FoodItem {
  id: string
  name: string
  emoji: string
  /** Grams for portion = 1. */
  grams: number
  /** Nutrients for portion = 1. */
  nutrients: Nutrients
  /** Multiplier the user picked (1 = as detected). */
  portion: number
  confidence?: number
  /** Short label for the photo pin. */
  label?: string
  /** Position of the detection pin on the photo, in % of width/height. */
  pin?: { x: number; y: number }
  /** Reference-database id when the item was added from food search / quick add. */
  foodId?: string
}

export interface Meal {
  id: string
  type: MealType
  name: string
  time: string
  photo?: string
  items: FoodItem[]
  score: number
}

export const MEAL_META: Record<MealType, { label: string; emoji: string; window: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🌅', window: '7 – 10 AM' },
  lunch: { label: 'Lunch', emoji: '☀️', window: '12 – 2 PM' },
  snack: { label: 'Snack', emoji: '🍓', window: 'Anytime' },
  dinner: { label: 'Dinner', emoji: '🌙', window: '7 – 9 PM' },
}

export const PROFILE = {
  name: 'Abhi',
  age: 28,
  sex: 'Male',
  heightCm: 176,
  weightKg: 72,
  targetKg: 68,
  activity: 'Moderately active',
  streak: 12,
}

const item = (id: string, name: string, emoji: string, grams: number, nutrients: Nutrients, extra: Partial<FoodItem> = {}): FoodItem => ({
  id,
  name,
  emoji,
  grams,
  nutrients,
  portion: 1,
  ...extra,
})

export const TODAY_MEALS: Meal[] = [
  {
    id: 'm1',
    type: 'breakfast',
    name: 'Avocado egg toast',
    time: '8:20 AM',
    photo: eggToast,
    score: 82,
    items: [
      item('sourdough', 'Sourdough toast', '🍞', 60, { calories: 156, protein: 6, carbs: 30, fat: 1, fiber: 1.6, sugar: 1, sodium: 300, iron: 1.7, folate: 70, b1: 0.25, b3: 2.4, selenium: 17, calcium: 30, magnesium: 15, potassium: 70, zinc: 0.5, phosphorus: 60 }),
      item('egg', 'Fried egg', '🍳', 50, { calories: 90, protein: 6.3, carbs: 0.4, fat: 7, satFat: 2, cholesterol: 185, vitA: 80, vitD: 1.1, b12: 0.5, b2: 0.23, selenium: 15, folate: 22, sodium: 95, iron: 0.9, zinc: 0.6, calcium: 28, phosphorus: 99, vitE: 0.6, b6: 0.08 }),
      item('avo-mash', 'Smashed avocado', '🥑', 50, { calories: 80, protein: 1, carbs: 4.3, fat: 7.3, satFat: 1, fiber: 3.4, potassium: 243, folate: 40, vitK: 10.5, vitE: 1, vitC: 5, magnesium: 15, b6: 0.13, b3: 0.9 }),
    ],
  },
  {
    id: 'm2',
    type: 'lunch',
    name: 'Salmon poke bowl',
    time: '1:10 PM',
    photo: pokeBowl,
    score: 91,
    items: [
      item('salmon', 'Salmon', '🐟', 110, { calories: 229, protein: 22, fat: 15, satFat: 3, omega3: 2.2, vitD: 12, b12: 3.2, b3: 8.6, b6: 0.7, selenium: 40, potassium: 400, phosphorus: 260, sodium: 60, cholesterol: 60, magnesium: 30, b2: 0.4, b1: 0.25 }),
      item('rice', 'Sushi rice', '🍚', 150, { calories: 195, protein: 3.5, carbs: 43, fat: 0.4, fiber: 0.5, sugar: 3, sodium: 250, b1: 0.03, magnesium: 12, iron: 0.3, zinc: 0.6, selenium: 10, phosphorus: 50 }),
      item('edamame', 'Edamame', '🫛', 50, { calories: 60, protein: 5.5, carbs: 4.5, fat: 2.6, fiber: 2.6, folate: 155, vitK: 13, iron: 1.2, magnesium: 32, potassium: 218, calcium: 32, phosphorus: 85, zinc: 0.7 }),
      item('veg', 'Crunchy veg mix', '🥕', 80, { calories: 25, carbs: 5.5, fiber: 1.8, vitA: 300, vitC: 15, potassium: 160, vitK: 15, calcium: 20 }),
      item('dressing', 'Soy‑sesame dressing', '🥢', 15, { calories: 55, protein: 1, carbs: 3, fat: 4, sugar: 2, sodium: 450 }),
    ],
  },
  {
    id: 'm3',
    type: 'snack',
    name: 'Greek yogurt parfait',
    time: '4:40 PM',
    photo: yogurt,
    score: 78,
    items: [
      item('yogurt', 'Greek yogurt', '🥛', 170, { calories: 100, protein: 17, carbs: 6, fat: 0.7, sugar: 6, calcium: 190, b12: 1.3, b2: 0.47, phosphorus: 230, potassium: 240, zinc: 0.9, selenium: 17, sodium: 60 }),
      item('strawberry', 'Strawberries', '🍓', 80, { calories: 26, carbs: 6, fiber: 1.6, sugar: 4, vitC: 47, folate: 19, potassium: 122 }),
      item('honey', 'Honey drizzle', '🍯', 10, { calories: 30, carbs: 8, sugar: 8 }),
      item('granola', 'Granola', '🥣', 25, { calories: 120, protein: 3, carbs: 16, fat: 5, fiber: 2, sugar: 5, iron: 0.9, magnesium: 40, zinc: 0.8, vitE: 1.5, b1: 0.15 }),
    ],
  },
]

/** What the vision model "returns" for the demo photo. */
export const DEMO_SCAN = {
  photo: buddhaBowl,
  name: 'Rainbow Buddha bowl',
  confidence: 0.94,
  score: 93,
  items: [
    item('avocado', 'Avocado', '🥑', 100, { calories: 160, protein: 2, carbs: 9, fat: 15, satFat: 2.1, fiber: 7, vitA: 7, vitC: 10, vitE: 2.1, vitK: 21, folate: 81, potassium: 485, magnesium: 29, iron: 0.6, calcium: 12, zinc: 0.6, sodium: 7, b6: 0.26, b3: 1.7 }, { label: 'Avocado', confidence: 0.98, pin: { x: 40, y: 72 } }),
    item('chickpeas', 'Chickpeas', '🫘', 80, { calories: 131, protein: 7, carbs: 22, fat: 2, fiber: 6, folate: 138, iron: 2.3, magnesium: 38, zinc: 1.2, potassium: 233, calcium: 39, sodium: 6, b6: 0.11, phosphorus: 135, selenium: 3 }, { label: 'Chickpeas', confidence: 0.95, pin: { x: 54, y: 50 } }),
    item('sweet-potato', 'Roasted sweet potato', '🍠', 120, { calories: 108, protein: 2, carbs: 25, fat: 0.2, fiber: 4, sugar: 0, vitA: 1150, vitC: 23, potassium: 570, magnesium: 32, calcium: 46, iron: 0.8, b6: 0.35, b1: 0.1, phosphorus: 65 }, { label: 'Sweet potato', confidence: 0.93, pin: { x: 80, y: 58 } }),
    item('tomato', 'Cherry tomatoes', '🍅', 90, { calories: 16, protein: 0.8, carbs: 3.5, fat: 0.2, fiber: 1.1, vitA: 38, vitC: 12, potassium: 213, vitK: 7 }, { label: 'Tomatoes', confidence: 0.99, pin: { x: 36, y: 42 } }),
    item('cabbage', 'Red cabbage', '🥬', 50, { calories: 15, protein: 0.7, carbs: 3.7, fiber: 1, vitC: 28, vitK: 19, vitA: 3, potassium: 122 }, { label: 'Red cabbage', confidence: 0.96, pin: { x: 83, y: 34 } }),
    item('pepper', 'Yellow bell pepper', '🫑', 60, { calories: 16, protein: 0.6, carbs: 3.8, fiber: 0.5, vitC: 110, vitA: 6, b6: 0.1, potassium: 127 }, { label: 'Bell pepper', confidence: 0.92, pin: { x: 20, y: 20 } }),
    item('tahini', 'Tahini dressing', '🥄', 20, { calories: 120, protein: 3.4, carbs: 4, fat: 10.8, satFat: 1.5, fiber: 1, calcium: 85, iron: 1.2, magnesium: 19, zinc: 0.9, sodium: 150, b1: 0.24, phosphorus: 150, selenium: 6 }, { label: 'Tahini', confidence: 0.81, pin: { x: 63, y: 37 } }),
    item('greens', 'Lettuce & microgreens', '🌱', 70, { calories: 14, protein: 1.2, carbs: 2.5, fiber: 1.6, vitA: 230, vitK: 95, folate: 80, vitC: 12, iron: 0.6, calcium: 25 }, { label: 'Greens', confidence: 0.9, pin: { x: 68, y: 16 } }),
  ],
}

/** Foods the "smart pick" card can recommend, with the nutrients each is rich in. */
export const SUGGESTIONS = [
  { name: 'Grilled salmon', photo: salmon, boosts: ['vitD', 'omega3', 'b12', 'protein', 'selenium'] as const },
  { name: 'Spinach & pomegranate', photo: spinachSalad, boosts: ['iron', 'folate', 'vitK', 'vitA', 'magnesium'] as const },
  { name: 'Quinoa power plate', photo: quinoa, boosts: ['fiber', 'magnesium', 'iron', 'phosphorus', 'zinc'] as const },
  { name: 'Greek yogurt bowl', photo: yogurt, boosts: ['calcium', 'protein', 'b12', 'b2', 'potassium'] as const },
  { name: 'Buddha bowl', photo: buddhaBowl, boosts: ['fiber', 'vitC', 'vitA', 'potassium', 'folate'] as const },
  { name: 'Tandoori chicken', photo: tandoori, boosts: ['protein', 'b3', 'selenium', 'zinc', 'b6'] as const },
]

/** One-tap "usuals" — each maps to a reference-database food and portion. */
export const QUICK_ADD = [
  { foodId: 'dal', name: 'Dal (1 bowl)', photo: thali, grams: 200 },
  { foodId: 'tandoori-chicken', name: 'Tandoori chicken', photo: tandoori, grams: 150 },
  { foodId: 'paneer-curry', name: 'Paneer curry', photo: paneerCurry, grams: 200 },
  { foodId: 'chicken-biryani', name: 'Chicken biryani', photo: biryani, grams: 300 },
]

export const SAMPLE_PHOTO = buddhaBowl

/** Last 7 days (oldest → today). Today’s values are computed live. */
export const WEEK_HISTORY = [
  { day: 'Fri', calories: 1980, protein: 112, carbs: 214, fat: 66, fiber: 27, micro: 74 },
  { day: 'Sat', calories: 2240, protein: 98, carbs: 260, fat: 82, fiber: 22, micro: 61 },
  { day: 'Sun', calories: 2410, protein: 90, carbs: 288, fat: 91, fiber: 18, micro: 55 },
  { day: 'Mon', calories: 1870, protein: 118, carbs: 190, fat: 64, fiber: 31, micro: 82 },
  { day: 'Tue', calories: 2060, protein: 124, carbs: 221, fat: 69, fiber: 29, micro: 79 },
  { day: 'Wed', calories: 2120, protein: 116, carbs: 228, fat: 72, fiber: 33, micro: 86 },
]

/** % of goal per nutrient over the last 14 days — drives the heatmap. */
export const NUTRIENT_HEATMAP: { key: string; label: string; values: number[] }[] = [
  { key: 'protein', label: 'Protein', values: [92, 81, 75, 98, 103, 97, 88, 96, 82, 75, 98, 103, 97, 55] },
  { key: 'fiber', label: 'Fiber', values: [70, 64, 60, 88, 90, 104, 77, 90, 73, 60, 103, 97, 110, 45] },
  { key: 'vitD', label: 'Vit D', values: [30, 22, 41, 88, 35, 28, 90, 45, 18, 30, 95, 40, 36, 87] },
  { key: 'iron', label: 'Iron', values: [55, 48, 62, 70, 58, 66, 52, 61, 49, 57, 72, 64, 68, 41] },
  { key: 'vitC', label: 'Vit C', values: [120, 98, 140, 160, 110, 132, 101, 150, 88, 115, 180, 140, 126, 92] },
  { key: 'calcium', label: 'Calcium', values: [80, 66, 72, 91, 85, 78, 70, 88, 69, 73, 94, 82, 79, 40] },
  { key: 'magnesium', label: 'Magnes.', values: [62, 58, 50, 77, 81, 74, 60, 70, 55, 52, 84, 78, 80, 48] },
  { key: 'b12', label: 'B12', values: [140, 90, 70, 180, 160, 150, 110, 170, 95, 75, 190, 165, 150, 208] },
]
