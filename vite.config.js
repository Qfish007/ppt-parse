import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/tts': {
        target: 'http://127.0.0.1:4173',
        changeOrigin: true
      },
      '/iciba': {
        target: 'http://127.0.0.1:4173',
        changeOrigin: true
      },
      '/youdao': {
        target: 'http://127.0.0.1:4173',
        changeOrigin: true
      }
    }
  }
})
