import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,   // fail instead of silently switching to 3001
    open: false,        // browser opened by START_ALL.bat instead
  }
})
