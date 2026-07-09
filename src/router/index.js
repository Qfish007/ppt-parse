import { createRouter, createWebHistory } from 'vue-router'

const MainView = () => import('../pages/main/main.vue')
const SettingView = () => import('../pages/setting/setting.vue')
const VocabularyView = () => import('../pages/vocabulary/vocabulary.vue')
const VocabularySettingsView = () => import('../pages/vocabulary/settings.vue')
const VocabularyDetailView = () => import('../pages/vocabulary/detail.vue')
const VocabularyTestView = () => import('../pages/vocabulary/test.vue')

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
  },
  {
    path: '/vocabulary/settings',
    name: 'VocabularySettings',
    component: VocabularySettingsView
  },
  {
    path: '/vocabulary/test',
    name: 'VocabularyTest',
    component: VocabularyTestView
  },
  {
    path: '/vocabulary/:word',
    name: 'VocabularyDetail',
    component: VocabularyDetailView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
