import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // 5174, not 5173: the internal client owns 5173 on dev machines.
    port: 5174,
    proxy: {
      // Forwarded WITHOUT rewriting: the customer API sets setGlobalPrefix('api'),
      // so /api/health really is the server route. Same convention as internal.
      '/api': { target: 'http://localhost:3001', changeOrigin: true, ws: true },
    },
  },
})
