import { motion } from 'motion/react'
import { Camera, Leaf, Target } from 'lucide-react'
import { useApp } from '../state/store'
import { SAMPLE_PHOTO } from '../data/mock'
import { Ring } from '../components/Ring'

/** First-run login screen (from App_nut): one button, no account, nothing leaves the device. */
export function Welcome() {
  const { signIn, serverMode } = useApp()
  return (
    <div className="welcome">
      <motion.div className="welcome-art" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <img src={SAMPLE_PHOTO} alt="" className="welcome-photo" />
        <div className="welcome-rings">
          <Ring size={128} stroke={11} progress={0.72} gradient={['#ffa24d', '#ff3d7f']} track="rgba(255,255,255,.18)" delay={0.4}>
            <div className="welcome-ring-inner">
              <Ring size={88} stroke={9} progress={0.58} gradient={['#7b88ff', '#4a5af0']} track="rgba(255,255,255,.18)" delay={0.55}>
                <Ring size={52} stroke={8} progress={0.86} gradient={['#4fe09a', '#0fa75e']} track="rgba(255,255,255,.18)" delay={0.7} />
              </Ring>
            </div>
          </Ring>
        </div>
      </motion.div>

      <motion.div className="welcome-body" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
        <div className="welcome-brand">
          <img src="./favicon.svg" alt="" width={34} height={34} />
          NutriLens
        </div>
        <h1 className="welcome-title">
          Snap your plate.
          <br />
          <span>Know every nutrient.</span>
        </h1>
        <ul className="welcome-points">
          <li>
            <Camera size={17} /> Calories, macros & 19 vitamins and minerals from one photo
          </li>
          <li>
            <Target size={17} /> Daily targets worked out from your body
          </li>
          <li>
            <Leaf size={17} /> Suggestions that close today’s gaps
          </li>
        </ul>
        <motion.button className="btn btn-primary btn-block" whileTap={{ scale: 0.97 }} onClick={signIn}>
          Log in
        </motion.button>
        <p className="welcome-note">{serverMode ? 'No account needed. Your log is kept on your NutriLens server.' : 'No account needed. Everything stays on this device.'}</p>
      </motion.div>
    </div>
  )
}
