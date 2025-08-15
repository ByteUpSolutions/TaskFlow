import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/TaskFlow/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Correção: Troque __dirname por process.cwd()
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
})