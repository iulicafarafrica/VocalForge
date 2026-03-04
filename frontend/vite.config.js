import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const fileCache = new Map()

const changeLogger = () => ({
  name: 'change-logger',
  handleHotUpdate({ file, timestamp }) {
    // Ignora changes.log
    if (file.endsWith('changes.log')) return

    const time = new Date(timestamp).toLocaleString('ro-RO')
    const rel = path.relative(process.cwd(), file)

    try {
      const newContent = fs.readFileSync(file, 'utf-8').split('\n')
      const oldContent = fileCache.get(file) || []

      const changedLines = []
      const maxLen = Math.max(oldContent.length, newContent.length)

      for (let i = 0; i < maxLen; i++) {
        const oldLine = oldContent[i] ?? ''
        const newLine = newContent[i] ?? ''
        if (oldLine !== newLine) {
          changedLines.push(`  Linia ${i + 1}: ${newLine.trim()}`)
        }
      }

      fileCache.set(file, newContent)

      if (changedLines.length > 0) {
        const entry = `[${time}] ${rel}\n${changedLines.join('\n')}\n\n`
        fs.appendFileSync('changes.log', entry)
        console.log(`[HMR] ${rel}`)
        changedLines.forEach(l => console.log(l))
      }
    } catch (e) {}
  },
  buildStart() {
    const srcDir = path.resolve(process.cwd(), 'src')
    const loadDir = (dir) => {
      if (!fs.existsSync(dir)) return
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          loadDir(full)
        } else if (/\.(jsx?|tsx?|css)$/.test(entry.name)) {
          try {
            fileCache.set(full, fs.readFileSync(full, 'utf-8').split('\n'))
          } catch (e) {}
        }
      }
    }
    loadDir(srcDir)
  }
})

export default defineConfig({
  plugins: [
    react(),
    changeLogger(),
  ],
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
      ignored: ['**/changes.log', '**/node_modules/**', '**/.git/**'],
    },
  },
})
