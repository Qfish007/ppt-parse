import { createRouter, createWebHistory } from 'vue-router'

const MainView = () => import('../pages/main/main.vue')
const SettingView = () => import('../pages/setting/setting.vue')
const VocabularyView = () => import('../pages/vocabulary/vocabulary.vue')

const routes = [
  {
    path: '/',
    redirect: '/main/001'
  },
  {
    path: '/main',
    redirect: '/main/001'
  },
  {
    path: '/main/:index',
    name: 'Main',
    component: MainView
  },
  {
    path: '/setting',
    name: 'Setting',
    component: SettingView
  },
  {
    path: '/vocabulary',
    name: 'Vocabulary',
    component: VocabularyView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
