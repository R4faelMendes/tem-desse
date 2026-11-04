import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'API_')
  const port = Number(process.env.API_PORT ?? env.API_PORT ?? 3001)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT inválida.')
  return {
    plugins: [react()],
    server: { proxy: { '/api': { target: `http://127.0.0.1:${port}` } } },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      // Fluxos com vários diálogos MUI também rodam em máquinas Windows mais lentas.
      testTimeout: 20_000,
      restoreMocks: true,
    },
  }
})
