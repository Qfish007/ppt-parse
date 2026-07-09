<template>
  <div class="vocab-page">
    <header class="vocab-header">
      <div class="vocab-title-wrap">
        <el-button type="primary" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回主页面
        </el-button>
        <h2 class="vocab-title">生词本</h2>
      </div>
      <div class="vocab-actions">
        <el-button @click="triggerImport">导入</el-button>
        <el-button type="primary" @click="exportWords">导出</el-button>
      </div>
    </header>

    <section class="vocab-toolbar">
      <el-input
        v-model="searchText"
        clearable
        placeholder="搜索单词或中文意思"
        class="vocab-search"
      />
      <el-select v-model="levelFilter" class="vocab-filter">
        <el-option label="全部掌握水平" value="all" />
        <el-option
          v-for="level in VOCABULARY_LEVELS"
          :key="level.value"
          :label="level.label"
          :value="level.value"
        />
      </el-select>
      <el-segmented
        v-model="sortMode"
        :options="sortOptions"
        class="vocab-sort"
      />
    </section>

    <section class="vocab-list">
      <div class="vocab-list-head">
        <span>单词</span>
        <span>发音</span>
        <span>中文意思</span>
        <span class="vocab-level-head">掌握水平</span>
        <span class="vocab-action-head">操作</span>
      </div>

      <div v-if="!filteredWords.length" class="vocab-empty">
        暂无生词。
      </div>

      <div
        v-for="entry in filteredWords"
        :key="entry.word"
        class="vocab-row"
      >
        <strong class="vocab-word">{{ entry.word }}</strong>
        <div class="vocab-pronunciation">
          <button class="vocab-sound" @click="speak(entry.word, 'en-US')">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
          </button>
          <span>{{ entry.phonetic || '-' }}</span>
        </div>
        <div class="vocab-meaning">{{ entry.meaning || '暂无释义' }}</div>
        <div class="vocab-level">
          <span class="vocab-level-label">{{ levelLabel(entry.level) }}</span>
          <el-select
            class="vocab-level-select"
            :model-value="entry.level"
            size="small"
            @change="value => updateLevel(entry.word, value)"
          >
            <el-option
              v-for="level in VOCABULARY_LEVELS"
              :key="level.value"
              :label="level.label"
              :value="level.value"
            />
          </el-select>
        </div>
        <div class="vocab-action">
          <el-button text type="danger" @click="removeWord(entry.word)">移除</el-button>
        </div>
      </div>
    </section>

    <input
      ref="importInputRef"
      type="file"
      accept="application/json,.json"
      class="hidden-input"
      @change="handleImport"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { speak } from '../../api/voice/index.js'
import { useProjectsStore } from '../../stores/projects.js'
import { useVocabularyStore, VOCABULARY_LEVELS } from '../../stores/vocabulary.js'

const router = useRouter()
const projectsStore = useProjectsStore()
const vocabularyStore = useVocabularyStore()

const searchText = ref('')
const levelFilter = ref('all')
const sortMode = ref('alphabet')
const importInputRef = ref(null)

const sortOptions = [
  { label: '字母排序', value: 'alphabet' },
  { label: '添加时间', value: 'createdAt' }
]

const filteredWords = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  let words = vocabularyStore.words.filter(entry => {
    const matchKeyword = !keyword
      || entry.word.includes(keyword)
      || String(entry.meaning || '').toLowerCase().includes(keyword)
    const matchLevel = levelFilter.value === 'all' || entry.level === levelFilter.value
    return matchKeyword && matchLevel
  })

  if (sortMode.value === 'createdAt') {
    words = [...words].sort((a, b) => b.createdAt - a.createdAt)
  } else {
    words = [...words].sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }))
  }
  return words
})

function goBack() {
  const active = projectsStore.getActiveProject()
  router.push(`/main/${active?.index || '001'}`)
}

function levelLabel(level) {
  return VOCABULARY_LEVELS.find(item => item.value === level)?.label || '不认识'
}

function updateLevel(word, level) {
  vocabularyStore.updateLevel(word, level)
}

async function removeWord(word) {
  try {
    await ElMessageBox.confirm(`确定从生词本移除「${word}」吗？`, '提示', {
      confirmButtonText: '移除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    vocabularyStore.removeWord(word)
    ElMessage.success('已移除')
  } catch {
    // 用户取消
  }
}

function exportWords() {
  const payload = {
    schema: 'bilingual-reader-vocabulary',
    version: 1,
    exportedAt: new Date().toISOString(),
    words: vocabularyStore.words
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '生词本.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('已导出生词本')
}

function triggerImport() {
  importInputRef.value?.click()
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || '{}')))
      } catch {
        reject(new Error('导入文件不是有效的 JSON'))
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    const payload = await readJsonFile(file)
    const words = Array.isArray(payload)
      ? payload
      : (payload.schema === 'bilingual-reader-vocabulary' ? payload.words : null)
    if (!Array.isArray(words)) throw new Error('不支持的生词本文件')
    const count = vocabularyStore.importWords(words)
    ElMessage.success(`已导入 ${count} 个单词`)
  } catch (error) {
    ElMessage.error(`导入失败：${error.message || '请检查文件后重试'}`)
  }
}
</script>

<style scoped>
.vocab-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28px;
  background: linear-gradient(135deg, #eef4f1 0%, #f8f7f2 48%, #edf1f8 100%);
}

.vocab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1180px;
  margin: 0 auto 18px;
}

.vocab-title-wrap,
.vocab-actions,
.vocab-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vocab-title {
  margin: 0;
  color: #16201f;
  font-size: 22px;
  font-weight: 700;
}

.vocab-toolbar {
  max-width: 1180px;
  margin: 0 auto 12px;
  padding: 14px;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
}

.vocab-search {
  flex: 1;
  min-width: 220px;
}

.vocab-filter {
  width: 170px;
}

.vocab-sort {
  flex-shrink: 0;
}

.vocab-list {
  max-width: 1180px;
  margin: 0 auto;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
}

.vocab-list-head,
.vocab-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(150px, 1fr) minmax(260px, 2fr) 150px 86px;
  align-items: center;
  gap: 12px;
}

.vocab-list-head {
  padding: 12px 16px;
  color: #63706d;
  font-size: 12px;
  font-weight: 700;
  background: #f0f4f3;
}

.vocab-row {
  min-height: 58px;
  padding: 10px 16px;
  border-top: 1px solid #edf1ef;
}

.vocab-row:hover {
  background: #fbfdfc;
}

.vocab-word {
  color: #101919;
  font-size: 18px;
  font-weight: 800;
}

.vocab-pronunciation {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #126b62;
  font-size: 14px;
  font-weight: 700;
}

.vocab-sound {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #b8d6cb;
  border-radius: 999px;
  background: #eef7f4;
  color: #0c514b;
  cursor: pointer;
}

.vocab-sound svg {
  width: 13px;
  height: 13px;
  fill: currentColor;
}

.vocab-meaning {
  color: #40504c;
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-wrap;
}

.vocab-action-head,
.vocab-action {
  text-align: center;
}

.vocab-level-head {
  text-align: center;
}

.vocab-action {
  display: flex;
  justify-content: center;
}

.vocab-level {
  position: relative;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.vocab-level-label {
  color: #63706d;
  font-size: 13px;
  font-weight: 700;
}

.vocab-level-select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}

.vocab-row:hover .vocab-level-select {
  opacity: 1;
  pointer-events: auto;
}

.vocab-row:hover .vocab-level-label {
  opacity: 0;
}

.vocab-empty {
  padding: 42px 16px;
  color: #8c9996;
  text-align: center;
}

.hidden-input {
  display: none;
}

@media (max-width: 900px) {
  .vocab-header,
  .vocab-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .vocab-list {
    overflow-x: auto;
  }

  .vocab-list-head,
  .vocab-row {
    min-width: 820px;
  }
}
</style>
