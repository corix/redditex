import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        onboardingPatreon: resolve(__dirname, 'onboarding-patreon/index.html'),
        messagingGhost: resolve(__dirname, 'messaging-ghost/index.html'),
        appendix: resolve(__dirname, 'appendix/index.html'),
        feeCalculator: resolve(__dirname, 'appendix/fee-calculator/index.html'),
        redditex: resolve(__dirname, 'appendix/redditizer/index.html'),
        changelog: resolve(__dirname, 'changelog/index.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
