import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    open: false,
    hmr: {
      host: 'localhost',
      port: 3000,
    },
    watch: {
      usePolling: true,
      interval: 100,
      followSymlinks: false,
    },
  },
})
