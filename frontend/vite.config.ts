import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildId = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    react(),
    {
      name: 'emit-app-runtime-asset',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'app-runtime.json',
          source: JSON.stringify({ buildId }, null, 2),
        })
      },
    },
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
