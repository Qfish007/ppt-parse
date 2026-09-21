import { createRouter, createWebHistory } from 'vue-router'

const HomeView = () => import('../pages/home/home.vue')
const HomeSettingView = () => import('../pages/home/setting.vue')
const BooksView = () => import('../pages/books/books.vue')
const BooksSettingView = () => import('../pages/books/setting.vue')
const VocabularyView = () => import('../pages/vocabulary/vocabulary.vue')
const VocabularySettingsView = () => import('../pages/vocabulary/setting.vue')
const VocabularyDetailView = () => import('../pages/vocabulary/detail.vue')
const VocabularyTestView = () => import('../pages/vocabulary/test.vue')
const VocabularyTestSettingView = () => import('../pages/vocabulary/test_setting.vue')
const VocabularyPrintView = () => import('../pages/vocabulary/print.vue')

// 中文生词本（完全独立于 vocabulary）
const ChineseView = () => import('../pages/chinese/chinese.vue')
const ChineseSettingsView = () => import('../pages/chinese/setting.vue')
const ChinesePrintView = () => import('../pages/chinese/print.vue')
const ChineseDetailView = () => import('../pages/chinese/detail.vue')

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
    path: '/vocabulary/test/setting',
    name: 'VocabularyTestSetting',
    component: VocabularyTestSettingView
  },
  {
    path: '/vocabulary/print',
    name: 'VocabularyPrint',
    component: VocabularyPrintView
  },
  {
    path: '/vocabulary/:word',
    name: 'VocabularyDetail',
    component: VocabularyDetailView
  },
  // 中文生词本（独立路由，独立数据层）
  {
    path: '/chinese',
    name: 'Chinese',
    component: ChineseView
  },
  {
    path: '/chinese/settings',
    name: 'ChineseSettings',
    component: ChineseSettingsView
  },
  {
    path: '/chinese/print',
    name: 'ChinesePrint',
    component: ChinesePrintView
  },
  {
    path: '/chinese/:word',
    name: 'ChineseDetail',
    component: ChineseDetailView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
