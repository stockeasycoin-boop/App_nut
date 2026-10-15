import { Camera, Leaf, Target } from 'lucide-react'

/** Brand panel shown beside the phone frame on wide screens. */
export function Aside() {
  return (
    <aside className="aside">
      <div className="aside-logo">
        <img src="/favicon.svg" alt="" width={44} height={44} />
        NutriLens
      </div>
      <h1 className="aside-title">
        Snap your plate.
        <br />
        <span>Know every nutrient.</span>
      </h1>
      <p className="aside-copy">AI turns a single photo into calories, macros and 19 vitamins & minerals — then coaches you toward your daily goals.</p>
      <ul className="aside-list">
        <li>
          <Camera size={18} /> Photo → nutrients in ~3 seconds
        </li>
        <li>
          <Target size={18} /> Goals for 28 nutrients, tuned to you
        </li>
        <li>
          <Leaf size={18} /> Smart picks that close your gaps
        </li>
      </ul>
    </aside>
  )
}
