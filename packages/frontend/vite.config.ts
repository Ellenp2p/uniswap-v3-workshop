import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/uniswap-v3-workshop/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
      alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@uniswap-v3/core': fileURLToPath(new URL('../src', import.meta.url)),
    },
  },
}))
