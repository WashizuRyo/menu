import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: mode !== 'test',
      routeFileIgnorePattern: '\\.test\\.',
    }),
    react(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
}))
