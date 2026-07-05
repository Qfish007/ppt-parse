import { createRouter, createWebHistory } from 'vue-router'

const MainView = () => import('../pages/main/main.vue')
const SettingView = () => import('../pages/setting/setting.vue')

const routes = [
  {
    path: '/',
    redirect: '/main'
  },
  {
    path: '/main',
    name: 'Main',
    component: MainView
  },
  {
    path: '/setting',
    name: 'Setting',
    component: SettingView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
