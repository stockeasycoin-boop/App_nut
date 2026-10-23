import { defineConfig } from '@playwright/test'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname)
const DATA = path.join(ROOT, '.e2e-data')
export const API = 'http://127.0.0.1:8010'
export const APP = 'http://127.0.0.1:5180'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  use: {
    baseURL: APP,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    permissions: ['camera'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // A fake rear camera that films the sample meal photo.
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${path.join(ROOT, 'e2e/fixtures/camera.mjpeg')}`,
      ],
    },
  },
  webServer: [
    {
      // Real backend with the mock recognizer and a fresh database for every run.
      command: `rm -rf "${DATA}" && mkdir -p "${DATA}" && ../backend/.venv/bin/uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 8010`,
      url: `${API}/health`,
      env: {
        NUTRILENS_VISION_PROVIDER: 'mock',
        NUTRILENS_DATABASE_URL: `sqlite:///${DATA}/e2e.db`,
        NUTRILENS_MEDIA_DIR: `${DATA}/media`,
      },
      reuseExistingServer: false,
    },
    {
      // Front end without VITE_API_URL: tests choose server or demo mode themselves.
      command: 'npx vite --host 127.0.0.1 --port 5180 --strictPort',
      url: APP,
      env: { VITE_API_URL: '' },
      reuseExistingServer: false,
    },
  ],
})
