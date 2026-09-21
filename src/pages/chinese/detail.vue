<template>
  <div class="cn-detail-page">
    <header class="cn-detail-header">
      <el-button type="primary" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2 class="cn-detail-header-title">中文词条详情</h2>
    </header>

    <div v-if="pageLoading" class="cn-detail-loading">
      <el-icon class="is-loading cn-detail-loading-icon"><Loading /></el-icon>
      <span>正在加载词条…</span>
    </div>

    <template v-else-if="entry">
      <!-- 词条头部：大字 + 拼音 + 发音 + 刷新 -->
      <section class="cn-card cn-hero">
        <div class="cn-hero-main">
          <div class="cn-hero-word-row">
            <h1 class="cn-hero-word">{{ entry.word }}</h1>
            <button class="cn-hero-play" :disabled="refreshing" @click="playWord" title="播放发音">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            </button>
            <button class="cn-hero-refresh" :disabled="refreshing" @click="refreshFromHanyu" title="重新从百度汉语抓取">
              <svg viewBox="0 0 24 24" width="18" height="18" :class="{ 'is-spinning': refreshing }">
                <path
                  d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                  fill="currentColor" />
              </svg>
            </button>
          </div>
          <div class="cn-hero-pinyin">
            <span class="cn-hero-pinyin-label">拼音</span>
            <span class="cn-hero-pinyin-text">{{ entry.pinyin || '暂无拼音' }}</span>
          </div>
          <div class="cn-hero-tags">
            <span class="cn-hero-field-label">标签</span>
            <el-tag v-for="tag in entryTags" :key="tag.id" size="small" effect="plain" class="cn-hero-tag">
              {{ tag.name }}
            </el-tag>
            <span v-if="!entryTags.length" class="cn-hero-empty-inline">未设置</span>
          </div>
        </div>

        <!-- 可编辑区：掌握水平 / 标签 / 备注 -->
        <div class="cn-hero-edit">
          <div class="cn-edit-field">
            <label class="cn-edit-label">掌握水平</label>
            <el-select v-model="editLevel" popper-class="cn-level-popper" :class="['cn-edit-level', levelClass(editLevel)]">
              <el-option v-for="level in CHINESE_LEVELS" :key="level.value" :class="levelClass(level.value)"
                :label="level.label" :value="level.value" />
            </el-select>
          </div>
          <div class="cn-edit-field">
            <label class="cn-edit-label">词条标签</label>
            <el-select v-model="editTagIds" multiple collapse-tags collapse-tags-tooltip placeholder="选择标签">
              <el-option v-for="tag in chineseStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
            </el-select>
          </div>
          <div class="cn-edit-field cn-edit-field-note">
            <label class="cn-edit-label">备注</label>
            <el-input v-model="editNote" type="textarea" :rows="2" placeholder="记录笔记、易错点等" />
          </div>
          <div class="cn-edit-actions">
            <el-button type="primary" :loading="saving" @click="saveEdit">保存修改</el-button>
          </div>
        </div>
      </section>

      <!-- 百度汉语全字段 -->
      <div v-if="refreshing" class="cn-fetch-hint">
        <el-icon class="is-loading"><Loading /></el-icon>
        正在从百度汉语抓取最新数据，请稍候…
      </div>

      <section class="cn-detail-grid">
        <div class="cn-card cn-section cn-section-meaning">
          <div class="cn-section-title">基本释义</div>
          <div class="cn-section-content cn-meaning-text">{{ entry.meaning || '暂无基本释义，可点击右上角刷新按钮重新抓取。' }}</div>
        </div>

        <div class="cn-card cn-section">
          <div class="cn-section-title">组词</div>
          <div class="cn-section-content">
            <div v-if="cihuiList.length" class="cn-chip-list">
              <span v-for="(item, i) in cihuiList" :key="`ch-${i}`" class="cn-chip">{{ item }}</span>
            </div>
            <span v-else class="cn-section-empty">暂无组词</span>
          </div>
        </div>

        <div class="cn-card cn-section cn-section-liju">
          <div class="cn-section-title">例句</div>
          <div class="cn-section-content">
            <div v-if="lijuList.length" class="cn-liju-list">
              <div v-for="(item, i) in lijuList" :key="`lj-${i}`" class="cn-liju-item">
                <span class="cn-liju-index">{{ i + 1 }}</span>
                <span class="cn-liju-text">{{ item }}</span>
                <button class="cn-liju-play" title="朗读例句" @click="playText(item)">
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path d="M8 5v14l11-7z" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
            <span v-else class="cn-section-empty">暂无例句</span>
          </div>
        </div>

        <div v-if="entry.idiomStory" class="cn-card cn-section cn-section-story">
          <div class="cn-section-title">成语故事</div>
          <div class="cn-section-content cn-paragraph">{{ entry.idiomStory }}</div>
        </div>

        <div v-if="entry.synonyms || entry.antonyms" class="cn-card cn-section cn-section-syn">
          <div class="cn-section-title">近反义词</div>
          <div class="cn-section-content cn-syn-grid">
            <div class="cn-syn-row">
              <span class="cn-syn-label cn-syn-label-syn">近义词</span>
              <span class="cn-syn-text">{{ entry.synonyms || '—' }}</span>
            </div>
            <div class="cn-syn-row">
              <span class="cn-syn-label cn-syn-label-ant">反义词</span>
              <span class="cn-syn-text">{{ entry.antonyms || '—' }}</span>
            </div>
          </div>
        </div>

        <div v-if="entry.sameMeaningDiffForm" class="cn-card cn-section">
          <div class="cn-section-title">同义异形</div>
          <div class="cn-section-content cn-paragraph">{{ entry.sameMeaningDiffForm }}</div>
        </div>

        <div v-if="entry.chuchu || entry.yinzhen" class="cn-card cn-section cn-section-source">
          <div v-if="entry.chuchu" class="cn-source-block">
            <div class="cn-section-title cn-section-title-sm">出处</div>
            <div class="cn-section-content cn-paragraph">{{ entry.chuchu }}</div>
          </div>
          <div v-if="entry.yinzhen" class="cn-source-block">
            <div class="cn-section-title cn-section-title-sm">引证</div>
            <div class="cn-section-content cn-paragraph">{{ entry.yinzhen }}</div>
          </div>
        </div>
      </section>
    </template>

    <section v-else class="cn-card cn-detail-missing">
      <p>没有找到词条「{{ word }}」。</p>
      <p class="cn-detail-missing-hint">它可能已被删除。请返回中文生词本列表重新选择。</p>
      <el-button type="primary" @click="goBack">返回</el-button>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Loading } from '@element-plus/icons-vue'
import { useChineseStore } from '../../stores/chinese.js'
import { CHINESE_LEVELS } from '../../types/index.js'
import { fetchHanyuDetail, playChineseAudio } from '../../api/hanyu/index.js'

const route = useRoute()
const router = useRouter()
const chineseStore = useChineseStore({ lazy: true })

const pageLoading = ref(true)
const refreshing = ref(false)
const saving = ref(false)

const word = computed(() => String(route.params.word || ''))

const entry = computed(() =>
  chineseStore.words.find(item => item.word === word.value) || null
)

const entryTags = computed(() => {
  if (!entry.value?.tagIds?.length) return []
  return chineseStore.tags.filter(tag => entry.value.tagIds.includes(tag.id))
})

// 编辑态
const editLevel = ref('unknown')
const editTagIds = ref([])
const editNote = ref('')

watch(entry, (val) => {
  if (val) {
    editLevel.value = val.level
    editTagIds.value = [...(val.tagIds || [])]
    editNote.value = val.note || ''
  }
}, { immediate: true })

const cihuiList = computed(() =>
  String(entry.value?.cihui || '')
    .split(/[、；;]+/)
    .map(s => s.trim())
    .filter(Boolean)
)

const lijuList = computed(() =>
  String(entry.value?.liju || '')
    .split(/\r?\n+/)
    .map(s => s.trim())
    .filter(Boolean)
)

function levelClass(level) {
  return `level-${level || 'unknown'}`
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/chinese')
  }
}

async function playWord() {
  if (!entry.value?.word) return
  await playChineseAudio(entry.value.word)
}

async function playText(text) {
  await playChineseAudio(text)
}

async function saveEdit() {
  if (!entry.value?.word) return
  saving.value = true
  try {
    await chineseStore.updateWord(entry.value.word, {
      level: editLevel.value,
      tagIds: [...editTagIds.value],
      note: editNote.value
    })
    ElMessage.success('已保存修改')
  } finally {
    saving.value = false
  }
}

async function refreshFromHanyu() {
  if (!entry.value?.word || refreshing.value) return
  refreshing.value = true
  try {
    const data = await fetchHanyuDetail(entry.value.word, { force: true })
    if (!data) {
      ElMessage.warning('百度汉语暂未收录该词，字段保持原样')
      return
    }
    await chineseStore.updateWord(entry.value.word, {
      pinyin: data.pinyin || '',
      meaning: data.meaning || '',
      cihui: data.cihui || '',
      liju: data.liju || '',
      idiomStory: data.idiomStory || '',
      synonyms: data.synonyms || '',
      antonyms: data.antonyms || '',
      sameMeaningDiffForm: data.sameMeaningDiffForm || '',
      chuchu: data.chuchu || '',
      yinzhen: data.yinzhen || ''
    })
    await chineseStore.setHanyuCache({ word: entry.value.word, ...data })
    ElMessage.success('已从百度汉语更新词条数据')
  } catch (err) {
    ElMessage.error(`抓取失败：${err.message || '请稍后重试'}`)
  } finally {
    refreshing.value = false
  }
}

;(async function init() {
  await chineseStore.ensureLoaded()
  pageLoading.value = false
})()
</script>

<style scoped>
.cn-detail-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24px 28px 80px;
  background: linear-gradient(135deg, #fef6ec 0%, #f8f5f0 48%, #fdf4ea 100%);
  color: #1c1408;
}

.cn-detail-header,
.cn-card {
  max-width: 1080px;
  margin-left: auto;
  margin-right: auto;
}

.cn-detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.cn-detail-header-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

.cn-detail-loading,
.cn-fetch-hint {
  max-width: 1080px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  background: #fff7ee;
  border: 1px solid #f0d8b8;
  border-radius: 12px;
  color: #b8480f;
  font-size: 14px;
}

.cn-detail-loading {
  justify-content: center;
  margin-top: 80px;
  font-size: 15px;
  color: #8b6645;
  background: transparent;
  border: none;
}

.cn-detail-loading-icon {
  font-size: 22px;
}

.cn-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #f4e2cc;
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(184, 72, 15, 0.07);
  padding: 22px 26px;
  margin-bottom: 16px;
}

/* ===== 头部词条区 ===== */
.cn-hero {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 28px;
}

.cn-hero-main {
  min-width: 0;
}

.cn-hero-word-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.cn-hero-word {
  margin: 0;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 52px;
  font-weight: 800;
  line-height: 1.1;
  color: #1c1408;
  word-break: break-all;
}

.cn-hero-play,
.cn-hero-refresh {
  display: grid;
  place-items: center;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.cn-hero-play {
  width: 44px;
  height: 44px;
  border: 1px solid #e5b07f;
  background: #fbe6d4;
  color: #b8480f;
}

.cn-hero-play:hover {
  background: #f4c79d;
}

.cn-hero-refresh {
  width: 34px;
  height: 34px;
  border: 1px solid #e8d4bd;
  background: #fff;
  color: #9b7558;
}

.cn-hero-refresh:hover {
  border-color: #d97706;
  color: #d97706;
}

.cn-hero-refresh:disabled,
.cn-hero-play:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.is-spinning {
  animation: cn-spin 1s linear infinite;
}

@keyframes cn-spin {
  to {
    transform: rotate(360deg);
  }
}

.cn-hero-pinyin {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 12px;
}

.cn-hero-pinyin-label,
.cn-hero-field-label {
  font-size: 13px;
  font-weight: 700;
  color: #a0795a;
}

.cn-hero-pinyin-text {
  font-size: 22px;
  font-weight: 700;
  color: #b8480f;
  letter-spacing: 1px;
}

.cn-hero-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.cn-hero-tag {
  border-color: #e5b07f;
  color: #b8480f;
  background: #fef6ec;
}

.cn-hero-empty-inline {
  font-size: 13px;
  color: #c5a88e;
}

/* ===== 编辑区 ===== */
.cn-hero-edit {
  border-left: 1px solid #f7e8d6;
  padding-left: 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cn-edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cn-edit-label {
  font-size: 12px;
  font-weight: 700;
  color: #7a563a;
}

.cn-edit-field :deep(.el-select) {
  width: 100%;
}

.cn-edit-actions {
  display: flex;
  justify-content: flex-end;
}

.cn-edit-level.level-unknown :deep(.el-select__wrapper) {
  color: #f56c6c;
}

.cn-edit-level.level-learning :deep(.el-select__wrapper) {
  color: #409eff;
}

.cn-edit-level.level-mastered :deep(.el-select__wrapper) {
  color: #e6a23c;
}

.cn-edit-level.level-familiar :deep(.el-select__wrapper) {
  color: #67c23a;
}

/* ===== 详情字段区 ===== */
.cn-detail-grid {
  max-width: 1080px;
  margin: 0 auto;
}

.cn-section-title {
  position: relative;
  padding-left: 12px;
  font-size: 16px;
  font-weight: 800;
  color: #1c1408;
  margin-bottom: 14px;
}

.cn-section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 4px;
  border-radius: 2px;
  background: linear-gradient(180deg, #d97706, #f4c79d);
}

.cn-section-title-sm {
  font-size: 14px;
  margin-bottom: 8px;
}

.cn-section-content {
  font-size: 15px;
  line-height: 1.8;
  color: #4a3320;
}

.cn-meaning-text {
  font-size: 16px;
  white-space: pre-wrap;
}

.cn-paragraph {
  white-space: pre-wrap;
}

.cn-section-empty {
  color: #c5a88e;
  font-size: 14px;
}

.cn-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cn-chip {
  padding: 4px 14px;
  border-radius: 999px;
  background: #fef6ec;
  border: 1px solid #f0d8b8;
  color: #b8480f;
  font-size: 14px;
  font-weight: 600;
}

.cn-liju-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cn-liju-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  background: #fff9f2;
  border-radius: 10px;
}

.cn-liju-index {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: #fbe6d4;
  color: #b8480f;
  font-size: 12px;
  font-weight: 800;
  margin-top: 2px;
}

.cn-liju-text {
  flex: 1;
  line-height: 1.7;
}

.cn-liju-play {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #e5b07f;
  border-radius: 50%;
  background: #fff;
  color: #b8480f;
  cursor: pointer;
}

.cn-liju-play:hover {
  background: #fbe6d4;
}

.cn-syn-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cn-syn-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.cn-syn-label {
  flex-shrink: 0;
  width: 56px;
  text-align: center;
  padding: 2px 0;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

.cn-syn-label-syn {
  background: rgba(103, 194, 58, 0.14);
  color: #529b2e;
}

.cn-syn-label-ant {
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
}

.cn-syn-text {
  flex: 1;
  line-height: 1.7;
}

.cn-source-block + .cn-source-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #f0d8b8;
}

.cn-detail-missing {
  text-align: center;
  padding: 60px 26px;
}

.cn-detail-missing p {
  font-size: 16px;
  color: #4a3320;
}

.cn-detail-missing-hint {
  font-size: 13px !important;
  color: #a0795a !important;
  margin-bottom: 20px;
}

@media (max-width: 860px) {
  .cn-hero {
    grid-template-columns: 1fr;
  }

  .cn-hero-edit {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid #f7e8d6;
    padding-top: 20px;
  }
}
</style>
