import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.nutrilens',
  appName: 'NutriLens',
  webDir: 'dist',
  server: {
    // Serve the app over http://localhost so it can call a NutriLens server on the
    // local network (http) without mixed-content blocking.
    androidScheme: 'http',
    cleartext: true,
  },
  android: {
    backgroundColor: '#f5f3ee',
  },
  plugins: {
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover' },
  },
}

export default config
