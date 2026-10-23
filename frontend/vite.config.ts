import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // Relative asset paths so the same build works inside the Android app.
  base: './',
  server: {
    // The reference food database lives in backend/app/data and is shared with demo mode.
    fs: { allow: ['..'] },
  },
})
