<template>
  <div class="word-detail-page">
    <header class="word-detail-header">
      <el-button type="primary" @click="goBack">
        <el-icon>
          <ArrowLeft />
        </el-icon>
        {{ backLabel }}
      </el-button>
      <h2 class="word-detail-title">单词详情</h2>
    </header>

    <section v-if="entry" class="word-detail-card">
      <div class="word-hero">
        <div>
          <div class="detail-label">单词</div>
          <h1>{{ entry.word }}</h1>
        </div>
        <button class="detail-sound" @click="playWord">
          <svg viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"></path>
          </svg>
        </button>
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">发音</div>
          <div class="detail-phonetic">{{ entry.phonetic || '-' }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">辅助记忆</div>
          <div class="detail-memory">
            <template v-for="(part, index) in memoryParts" :key="`${part}-${index}`">
              <span class="memory-part" :class="`memory-part-${index % 4}`">{{ part }}</span>
              <span v-if="index < memoryParts.length - 1" class="memory-dot">·</span>
            </template>
          </div>
        </div>
        <div class="detail-item detail-meaning-item">
          <div class="detail-label-row">
            <span class="detail-label">中文意思</span>
            <button v-if="entry?.meaning" class="detail-refresh-btn" @click="refreshMeaning" :disabled="refreshing">
              <span v-if="refreshing" class="btn-loading"></span>
              {{ refreshing ? '查询中...' : '完整释义' }}
            </button>
          </div>
          <div class="detail-meaning">{{ entry.meaning || '暂无释义' }}</div>
        </div>
      </div>
    </section>

    <section v-else class="word-detail-card empty-card">
      没有找到这个单词。
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { speak } from '../../api/voice/index.js'
import { useBookStore } from '../../stores/book.js'
import { useVocabularyStore } from '../../stores/vocabulary.js'

const route = useRoute()
const router = useRouter()
const vocabularyStore = useVocabularyStore()
const bookStore = useBookStore()

const word = computed(() => String(route.params.word || '').toLowerCase())
const backLabel = computed(() => '返回')
const entry = computed(() => vocabularyStore.words.find(item => item.word === word.value) || null)
const refreshing = ref(false)
const memoryParts = computed(() => {
  if (entry.value?.memoryParts?.length) return entry.value.memoryParts
  return autoMemoryParts(entry.value?.word || word.value)
})

function goBack() {
  // 优先返回上一级；首次直接打开 detail 页时 fallback 到来源对应页
  if (window.history.length > 1) {
    router.back()
    return
  }
  if (route.query.from === 'test') {
    router.push('/vocabulary/test')
  } else {
    router.push('/vocabulary')
  }
}

function autoMemoryParts(rawWord) {
  const value = String(rawWord || '').trim()
  const compoundMap = {
    everywhere: ['every', 'where'],
    somewhere: ['some', 'where'],
    anywhere: ['any', 'where'],
    nowhere: ['no', 'where']
  }
  if (compoundMap[value.toLowerCase()]) return compoundMap[value.toLowerCase()]
  if (value.length <= 4) return value ? [value] : []
  if (value.length <= 6) return [value.slice(0, 2), value.slice(2)]
  if (value.endsWith('ing') && value.length > 5) return [value.slice(0, -3), 'ing']
  if (value.endsWith('ed') && value.length > 5) return [value.slice(0, -2), 'ed']
  return [value.slice(0, 3), value.slice(3)]
}

async function playWord() {
  const currentEntry = entry.value
  if (!currentEntry?.word) return

  speak(currentEntry.word, 'en-US')
  if (currentEntry.phonetic) return

  try {
    const result = await bookStore.translateWordToChinese(currentEntry.word)
    const phonetic = typeof result === 'object' ? result?.phonetic : ''
    const meaning = typeof result === 'object' ? result?.meaning : ''
    if (phonetic || (!currentEntry.meaning && meaning)) {
      vocabularyStore.updateWord(currentEntry.word, {
        phonetic: phonetic || currentEntry.phonetic || '',
        meaning: currentEntry.meaning || meaning || ''
      })
    }
  } catch {
    // 朗读不受音标补查失败影响
  }
}

async function refreshMeaning() {
  const currentEntry = entry.value
  if (!currentEntry?.word || refreshing.value) return

  refreshing.value = true
  try {
    const result = await bookStore.translateWordToChinese(currentEntry.word)
    const meaning = typeof result === 'object' ? result?.meaning : result
    if (meaning) {
      vocabularyStore.updateWord(currentEntry.word, {
        meaning: String(meaning).trim(),
        phonetic: typeof result === 'object' ? result?.phonetic || currentEntry.phonetic : currentEntry.phonetic
      })
    }
  } catch {
    // 查询失败不做处理
  } finally {
    refreshing.value = false
  }
}
</script>

<style scoped>
.word-detail-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28px;
  background: linear-gradient(135deg, #eef4f1 0%, #f8f7f2 48%, #edf1f8 100%);
}

.word-detail-header,
.word-detail-card {
  max-width: 1500px;
  margin: 0 auto;
}

.word-detail-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.word-detail-title {
  margin: 0;
  color: #16201f;
  font-size: 22px;
  font-weight: 700;
}

.word-detail-card {
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
  overflow: hidden;
}

.word-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 32px;
  border-bottom: 1px solid #edf1ef;
  background: #fbfdfc;
}

.word-hero h1 {
  margin: 4px 0 0;
  color: #101919;
  font-size: 42px;
  line-height: 1.1;
}

.detail-sound {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid #b8d6cb;
  border-radius: 999px;
  background: #eef7f4;
  color: #0c514b;
  cursor: pointer;
}

.detail-sound svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
}

.detail-item {
  padding: 22px 32px;
  border-bottom: 1px solid #edf1ef;
}

.detail-item:nth-child(odd) {
  border-right: 1px solid #edf1ef;
}

.detail-meaning-item {
  grid-column: 1 / -1;
  border-right: 0 !important;
  border-bottom: 0;
}

.detail-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-label {
  color: #63706d;
  font-size: 13px;
  font-weight: 700;
}

.detail-refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid #126b62;
  border-radius: 4px;
  background: transparent;
  color: #126b62;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-refresh-btn:hover:not(:disabled) {
  background: #eef7f4;
}

.detail-refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-loading {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #126b62;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.detail-phonetic {
  margin-top: 8px;
  color: #126b62;
  font-size: 20px;
  font-weight: 800;
}

.detail-memory {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  margin-top: 8px;
  font-size: 30px;
  font-weight: 900;
}

.memory-part-0 {
  color: #1d68b3;
}

.memory-part-1 {
  color: #ff7a00;
}

.memory-part-2 {
  color: #19a974;
}

.memory-part-3 {
  color: #8f4fd8;
}

.memory-dot {
  color: #b8c2bf;
  font-size: 24px;
  font-weight: 700;
}

.detail-meaning {
  margin-top: 8px;
  color: #40504c;
  font-size: 17px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.empty-card {
  padding: 42px;
  color: #8c9996;
  text-align: center;
}

@media (max-width: 720px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-item:nth-child(odd) {
    border-right: 0;
  }
}
</style>
