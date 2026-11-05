/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Portal público de verificación (HU19–HU21): otro proyecto que la plataforma interna, en el
// puerto de PLATAFORMA_PORTAL_URL (5174), al que apunta el código QR de cada documento.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // xfwd: el backend recibe la IP del visitante en X-Forwarded-For para el límite por IP (HU20).
      '/api/verificacion': { target: 'http://localhost:8080', xfwd: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
