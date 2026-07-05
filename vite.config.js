import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'
import { apiMiddleware } from './server/api.js'

const ROOT = process.cwd()

// 确保默认项目的静态资源目录存在
function ensureDefaultDirs() {
  const dirs = [
    path.join(ROOT, 'static', 'demo001', 'images'),
    path.join(ROOT, 'parse', 'ocr', 'demo001')
  ]
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

ensureDefaultDirs()

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'api-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          try {
            await apiMiddleware(req, res, next)
          } catch (err) {
            console.error('API Error:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(ROOT, './src')
    }
  }
})
