import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        redditizer: resolve(__dirname, 'redditizer/index.html'),
        ghostFees: resolve(__dirname, 'ghost-fees/index.html'),
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
