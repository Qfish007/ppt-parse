<template>
  <div class="home-page">
    <header class="home-header">
      <div class="home-header-left"></div>
      <div class="home-header-center">
        <h1 class="home-title">双语逐页朗读器</h1>
        <p class="home-subtitle">请选择要进入的功能</p>
      </div>
      <button class="home-setting-btn" @click="goSetting" title="全局设置">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round">
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </header>

    <section class="home-cards">
      <article class="home-card" @click="goVocabulary">
        <div class="home-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <path d="M10 8h6M10 12h6M10 16h3" />
          </svg>
        </div>
        <div class="home-card-body">
          <h2 class="home-card-title">生词本</h2>
          <p class="home-card-desc">管理单词、记录学习进度、随时测试记忆</p>
          <span class="home-card-action">进入生词本 →</span>
        </div>
      </article>

      <article class="home-card home-card--books" @click="goBooks">
        <div class="home-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div class="home-card-body">
          <h2 class="home-card-title">我的书籍</h2>
          <p class="home-card-desc">上传书籍、逐页朗读、中英对照学习</p>
          <span class="home-card-action">进入书籍 →</span>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useProjectsStore } from '../../stores/projects.js'

const router = useRouter()
const projectsStore = useProjectsStore()

function goVocabulary() {
  router.push('/vocabulary')
}

function goBooks() {
  const active = projectsStore.getActiveProject()
  const first = (projectsStore.projects && projectsStore.projects[0]) || null
  const target = active?.index || first?.index || '001'
  router.push(`/books/${target}`)
}

function goSetting() {
  router.push('/home/setting')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 48px 28px;
  background: linear-gradient(135deg, #eef4f1 0%, #f8f7f2 48%, #edf1f8 100%);
}

.home-header {
  max-width: 1080px;
  margin: 0 auto 36px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.home-header-center {
  flex: 1;
  text-align: center;
}

.home-title {
  margin: 0 0 10px;
  font-size: 38px;
  font-weight: 900;
  color: #16201f;
  letter-spacing: 0.3px;
}

.home-subtitle {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #63706d;
}

.home-setting-btn {
  cursor: pointer;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  color: #63706d;
  display: grid;
  place-items: center;
  transition: all 160ms ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.home-setting-btn:hover {
  background: #fff;
  color: #16201f;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.home-setting-btn svg {
  width: 22px;
  height: 22px;
}

.home-cards {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.home-card {
  cursor: pointer;
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding: 28px;
  border: 1px solid #d7dfdc;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.08);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.home-card:hover {
  transform: translateY(-3px);
  border-color: #8abcb1;
  box-shadow: 0 24px 60px rgba(22, 32, 31, 0.14);
}

.home-card-icon {
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #eef7f4;
  color: #0c514b;
}

.home-card-icon svg {
  width: 28px;
  height: 28px;
}

.home-card--books .home-card-icon {
  background: #eef1f8;
  color: #304b7d;
}

.home-card-body {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 6px;
}

.home-card-title {
  margin: 0;
  color: #16201f;
  font-size: 26px;
  font-weight: 900;
}

.home-card-desc {
  margin: 0;
  color: #63706d;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.6;
}

.home-card-action {
  margin-top: 10px;
  display: inline-block;
  width: fit-content;
  padding: 6px 14px;
  border-radius: 999px;
  background: #19a974;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
}

.home-card--books .home-card-action {
  background: #4c6ef5;
}

@media (max-width: 720px) {
  .home-cards {
    grid-template-columns: 1fr;
  }

  .home-title {
    font-size: 28px;
  }
}
</style>