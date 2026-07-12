import { createRouter, createWebHistory } from 'vue-router'

const HomeView = () => import('../pages/home/home.vue')
const HomeSettingView = () => import('../pages/home/setting.vue')
const BooksView = () => import('../pages/books/books.vue')
const BooksSettingView = () => import('../pages/books/setting.vue')
const VocabularyView = () => import('../pages/vocabulary/vocabulary.vue')
const VocabularySettingsView = () => import('../pages/vocabulary/settings.vue')
const VocabularyDetailView = () => import('../pages/vocabulary/detail.vue')
const VocabularyTestView = () => import('../pages/vocabulary/test.vue')

const routes = [
  // 根路径 → 新主页面 home
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/home/setting',
    name: 'HomeSetting',
    component: HomeSettingView
  },
  // 书籍页：原 /main → /books（同时保留 /main 旧路由做兼容跳转）
  {
    path: '/main',
    redirect: '/books/001'
  },
  {
    path: '/main/:index',
    redirect: (to) => `/books/${to.params.index}`
  },
  {
    path: '/books',
    redirect: '/books/001'
  },
  {
    path: '/books/:index',
    name: 'Books',
    component: BooksView
  },
  // 书籍设置：原 pages/setting/setting.vue 移动到 books/setting.vue；路径 /books/setting；旧 /setting 兼容跳转
  {
    path: '/setting',
    redirect: '/books/setting'
  },
  {
    path: '/books/setting',
    name: 'BooksSetting',
    component: BooksSettingView
  },
  // 生词本
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
