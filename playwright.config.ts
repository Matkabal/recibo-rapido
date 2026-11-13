import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 1,
  use: { baseURL: 'http://127.0.0.1:4173/recibo-rapido/', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1', url: 'http://127.0.0.1:4173/recibo-rapido/', reuseExistingServer: !process.env.CI },
  projects: [{ name: 'Android Chrome', use: { ...devices['Pixel 7'] } }]
})
