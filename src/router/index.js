import { createRouter, createWebHistory } from 'vue-router'

const HomeView = () => import('../pages/home/home.vue')
const HomeSettingView = () => import('../pages/home/setting.vue')
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

const LotteryView = () => import('../pages/lottery/lottery.vue')
const LotterySettingsView = () => import('../pages/lottery/setting.vue')

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
  },
  {
    path: '/lottery',
    name: 'Lottery',
    component: LotteryView
  },
  {
    path: '/lottery/settings',
    name: 'LotterySettings',
    component: LotterySettingsView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
