/**
 * API client. Every call is currently served by mock data so the front end
 * can be developed independently; swap the bodies for `fetch` calls once the
 * backend (see docs/ARCHITECTURE.md) is live. Shapes match the planned REST
 * contract.
 */
import { DEMO_SCAN, type FoodItem } from '../data/mock'

export interface ScanResult {
  name: string
  photo: string
  confidence: number
  score: number
  items: FoodItem[]
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** POST /v1/meals/analyze (multipart image) → detected foods with nutrients. */
export async function analyzeMealPhoto(photoUrl?: string): Promise<ScanResult> {
  await wait(3600)
  return {
    ...DEMO_SCAN,
    photo: photoUrl ?? DEMO_SCAN.photo,
    items: DEMO_SCAN.items.map((i) => ({ ...i })),
  }
}
