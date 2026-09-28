import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import router from './router'
import { ensureReady } from './db/sqlite.js'
import { migrateFromLocalStorage } from './db/migration.js'

async function initApp() {
    try {
        await ensureReady()
        await migrateFromLocalStorage()
    } catch (error) {
        console.error('Database initialization failed:', error)
    }

    const app = createApp(App)
    app.use(ElementPlus, { locale: zhCn })
    app.use(router)
    app.mount('#app')
}

initApp()
