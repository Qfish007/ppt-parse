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
        <div class="word-hero-left">
          <h1>{{ entry.word }}</h1>
          <div class="word-hero-phonetic">{{ entry.phonetic || '-' }}</div>
          <div class="word-hero-memory">
            <template v-if="memoryParts.length">
              <template v-for="(part, index) in memoryParts" :key="`${part}-${index}`">
                <span class="memory-part" :class="`memory-part-${index % 4}`">{{ part }}</span>
                <span v-if="index < memoryParts.length - 1" class="memory-dot">·</span>
              </template>
            </template>
            <span v-else class="memory-empty">-</span>
          </div>
          <div v-if="entry.tagIds?.length" class="word-hero-tags">
            <span v-for="tag in entryTags" :key="tag.id" class="word-tag">{{ tag.name }}</span>
          </div>
        </div>
        <div class="word-hero-right">
          <div class="word-hero-actions">
            <button class="detail-action-btn" @click="loadAllDetail" :disabled="refreshing" title="刷新">
              <svg viewBox="0 0 24 24">
                <path
                  d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </button>
            <button class="detail-action-btn" @click="openEditDialog" title="编辑">
              <svg viewBox="0 0 24 24">
                <path
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </button>
          </div>
          <button class="detail-sound" @click="playWord" title="播放">
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label-row">
            <span class="detail-label">中文意思</span>
          </div>
          <div class="detail-meaning">{{ entry.meaning || '暂无释义' }}</div>
        </div>

        <div class="detail-item detail-phrases-item">
          <div class="detail-label-row" @click="togglePhrases">
            <span class="detail-label">短语</span>
            <button v-if="wordDetail.phrases?.length" class="detail-collapse-btn">
              <svg :class="{ 'collapsed': collapsedPhrases }" viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
          <div v-if="loadingDetail" class="detail-loading">加载中...</div>
          <div v-else-if="wordDetail.phrases?.length" class="detail-phrases-list">
            <div v-for="(item, index) in (collapsedPhrases ? wordDetail.phrases.slice(0, 3) : wordDetail.phrases)"
              :key="`phrase-${index}`" class="detail-phrase-item">
              <span class="phrase-number">{{ index + 1 }}</span>
              <div class="phrase-content">
                <div class="phrase-row">
                  <span class="phrase-text">
                    <template v-for="(part, pIndex) in parseEnglishText(item.phrase)"
                      :key="`phrase-${index}-${pIndex}`">
                      <span v-if="part.type === 'word'" class="clickable-word"
                        @click="onWordClick($event, part.text)">{{ part.text }}</span>
                      <span v-else>{{ part.text }}</span>
                    </template>
                  </span>
                  <button class="phrase-sound-btn" @click="playPhrase(item.phrase)">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"></path>
                    </svg>
                  </button>
                </div>
                <span class="phrase-meaning">{{ item.meaning }}</span>
              </div>
            </div>
          </div>
          <div v-else-if="loadedDetail && !wordDetail.phrases?.length" class="detail-empty">暂无短语</div>
        </div>

        <div class="detail-item detail-sentences-item">
          <div class="detail-label-row" @click="toggleSentences">
            <span class="detail-label">双语例句</span>
            <button v-if="wordDetail.sentences?.length" class="detail-collapse-btn">
              <svg :class="{ 'collapsed': collapsedSentences }" viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
          <div v-if="loadingDetail" class="detail-loading">加载中...</div>
          <div v-else-if="wordDetail.sentences?.length" class="detail-sentences-list">
            <div v-for="(item, index) in (collapsedSentences ? wordDetail.sentences.slice(0, 3) : wordDetail.sentences)"
              :key="`sentence-${index}`" class="detail-sentence-item">
              <span class="sentence-number">{{ index + 1 }}</span>
              <div class="sentence-content">
                <div class="sentence-row">
                  <span class="sentence-en">
                    <template v-for="(part, pIndex) in parseEnglishText(item.english)"
                      :key="`sentence-${index}-${pIndex}`">
                      <span v-if="part.type === 'word'" class="clickable-word"
                        @click="onWordClick($event, part.text)">{{ part.text }}</span>
                      <span v-else>{{ part.text }}</span>
                    </template>
                  </span>
                  <button class="sentence-sound-btn" @click="playSentence(item.english)">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"></path>
                    </svg>
                  </button>
                </div>
                <span class="sentence-zh">{{ item.chinese }}</span>
              </div>
            </div>
          </div>
          <div v-else-if="loadedDetail && !wordDetail.sentences?.length" class="detail-empty">暂无例句</div>
        </div>
      </div>
    </section>

    <section v-else class="word-detail-card empty-card">
      没有找到这个单词。
    </section>

    <WordPopup :visible="wordPopup.visible" :word="wordPopup.word" :phonetic="wordPopup.phonetic"
      :meaning="wordPopup.meaning" :translating="wordPopup.translating" :style="wordPopup.style" @close="closePopup"
      @speak="(word) => speak(word, 'en-US')" @translate="translatePopupWord" @add="addPopupWordToVocabulary" />

    <WordEditDialog :visible="editDialogVisible" :word="entry?.word" @close="closeEditDialog" @saved="onWordSaved" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { speak } from '../../api/voice/index.js'
import { useBookStore } from '../../stores/book.js'
import { useVocabularyStore } from '../../stores/vocabulary.js'
import WordPopup from '../../components/WordPopup.vue'
import WordEditDialog from '../../components/WordEditDialog.vue'

const route = useRoute()
const router = useRouter()
const vocabularyStore = useVocabularyStore()
const bookStore = useBookStore()

const word = computed(() => String(route.params.word || '').toLowerCase())
const backLabel = computed(() => '返回')
const entry = computed(() => vocabularyStore.words.find(item => item.word === word.value) || null)
const refreshing = ref(false)
const loadingDetail = ref(false)
const loadedDetail = ref(false)
const wordDetail = ref({ phrases: [], sentences: [] })
const collapsedPhrases = ref(true)
const collapsedSentences = ref(true)

const wordPopup = reactive({
  visible: false,
  word: '',
  phonetic: '',
  meaning: '',
  translating: false,
  style: {},
  _anchorRect: null
})

function normalizePhonetic(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.startsWith('/') ? text : `/${text}/`
}

function onWordClick(event, word) {
  const cleanWord = String(word || '').trim()
  const rect = event.target.getBoundingClientRect()
  wordPopup._anchorRect = rect
  wordPopup.word = cleanWord
  const entry = vocabularyStore.words.find(w => w.word === cleanWord)
  wordPopup.phonetic = normalizePhonetic(entry?.phonetic || bookStore.lookupWordPhonetic?.(cleanWord))
  wordPopup.meaning = entry?.meaning || bookStore.lookupWord(cleanWord) || '暂无释义'
  wordPopup.translating = false
  wordPopup.visible = true

  requestAnimationFrame(() => {
    const popupEl = document.querySelector('.word-popup')
    if (!popupEl) return
    const popupRect = popupEl.getBoundingClientRect()
    const top = Math.min(window.innerHeight - popupRect.height - 12, rect.bottom + 10)
    const left = Math.min(window.innerWidth - popupRect.width - 12, Math.max(12, rect.left + rect.width / 2 - popupRect.width / 2))
    wordPopup.style = {
      top: Math.max(12, top) + 'px',
      left: left + 'px'
    }
  })
}

function closePopup() {
  wordPopup.visible = false
}

async function translatePopupWord() {
  const word = wordPopup.word
  if (!word) return
  wordPopup.translating = true
  wordPopup.meaning = '正在查询中文释义...'

  try {
    const translated = await bookStore.translateWordToChinese(word)
    const meaning = typeof translated === 'string' ? translated : translated?.meaning
    const phonetic = typeof translated === 'object' ? translated?.phonetic : ''
    if (!meaning) throw new Error('empty translation')
    bookStore.saveWordMeaning(word, meaning, phonetic)
    wordPopup.meaning = meaning
    wordPopup.phonetic = normalizePhonetic(phonetic || wordPopup.phonetic)
  } catch {
    wordPopup.meaning = '翻译失败。请确认已通过本地服务打开页面，或稍后再试。'
  } finally {
    wordPopup.translating = false
  }
}

function addPopupWordToVocabulary() {
  const word = wordPopup.word
  if (!word) return
  vocabularyStore.addWord({
    word,
    meaning: wordPopup.meaning || '暂无释义',
    phonetic: wordPopup.phonetic.replace(/\//g, '') || ''
  })
  closePopup()
}

function handleClickOutside(e) {
  if (wordPopup.visible && !e.target.closest('.word-popup') && !e.target.closest('.clickable-word')) {
    closePopup()
  }
}

function togglePhrases() {
  if (wordDetail.value.phrases?.length) {
    collapsedPhrases.value = !collapsedPhrases.value
  }
}

function toggleSentences() {
  if (wordDetail.value.sentences?.length) {
    collapsedSentences.value = !collapsedSentences.value
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  if (entry.value?.word) {
    loadAllDetail()
  }
})

watch(entry, (newEntry) => {
  if (newEntry?.word) {
    loadAllDetail()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
})

const memoryParts = computed(() => {
  if (entry.value?.memoryParts?.length) return entry.value.memoryParts
  return autoMemoryParts(entry.value?.word || word.value)
})

const entryTags = computed(() => {
  if (!entry.value?.tagIds?.length) return []
  return vocabularyStore.tags.filter(tag => entry.value.tagIds.includes(tag.id))
})

const editDialogVisible = ref(false)

function openEditDialog() {
  editDialogVisible.value = true
}

function closeEditDialog() {
  editDialogVisible.value = false
}

function onWordSaved() {
  const currentEntry = vocabularyStore.words.find(w => w.word === word.value)
  if (currentEntry) {
    entry.value = currentEntry
  }
  closeEditDialog()
}

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
  if (!value) return []
  if (value.includes('(') || value.includes(')')) return []
  if (value.includes(' ') || value.includes('/')) return []
  const compoundMap = {
    everywhere: ['every', 'where'],
    somewhere: ['some', 'where'],
    anywhere: ['any', 'where'],
    nowhere: ['no', 'where']
  }
  if (compoundMap[value.toLowerCase()]) return compoundMap[value.toLowerCase()]
  if (value.length <= 4) return [value]
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
  if (!currentEntry?.word) return
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
  }
}

async function loadWordDetail() {
  const currentEntry = entry.value
  if (!currentEntry?.word) return

  loadingDetail.value = true
  try {
    const response = await fetch(`/youdao/detail?word=${encodeURIComponent(currentEntry.word)}`)
    if (response.ok) {
      const data = await response.json()
      if (data?.code === 1 && data.data) {
        wordDetail.value = {
          phrases: data.data.phrases || [],
          sentences: data.data.sentences || []
        }
      }
    }
  } catch {
    // 查询失败不做处理
  } finally {
    loadedDetail.value = true
    loadingDetail.value = false
  }
}

async function loadAllDetail() {
  refreshing.value = true
  loadingDetail.value = true
  await refreshMeaning()
  await loadWordDetail()
  refreshing.value = false
}

function playPhrase(text) {
  speak(text, 'en-US')
}

function playSentence(text) {
  speak(text, 'en-US')
}

function parseEnglishText(text) {
  const parts = []
  const words = String(text || '').split(/(\b[a-zA-Z]+(?:[-'][a-zA-Z]+)?\b)/g)
  for (const part of words) {
    if (/^[a-zA-Z]+(?:[-'][a-zA-Z]+)?$/.test(part)) {
      parts.push({ type: 'word', text: part })
    } else {
      parts.push({ type: 'text', text: part })
    }
  }
  return parts
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
  max-width: 1200px;
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
  gap: 24px;
  padding: 32px;
  border-bottom: 1px solid #edf1ef;
  background: #fbfdfc;
}

.word-hero-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.word-hero h1 {
  margin: 0;
  color: #101919;
  font-size: 48px;
  font-weight: 800;
  line-height: 1;
}

.word-hero-phonetic {
  color: #126b62;
  font-family: "Trebuchet MS", Arial, sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.word-hero-memory {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #40504c;
  font-size: 15px;
}

.word-hero-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.word-tag {
  padding: 4px 12px;
  border-radius: 20px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 13px;
  font-weight: 500;
}

.word-hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
}

.word-hero-actions {
  display: flex;
  gap: 12px;
}

.detail-sound {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid #b8d6cb;
  border-radius: 999px;
  background: #eef7f4;
  color: #0c514b;
  cursor: pointer;
}

.detail-action-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: white;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-action-btn:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.detail-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.detail-action-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.detail-sound svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

.detail-item {
  padding: 24px 32px;
  border-bottom: 1px solid #edf1ef;
}

.detail-item:last-child {
  border-bottom: 0;
}

.detail-row-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  cursor: pointer;
}

.detail-label {
  color: #63706d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.detail-collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #d7dfdc;
  border-radius: 6px;
  background: #f8fdfb;
  color: #63706d;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.detail-collapse-btn:hover {
  border-color: #126b62;
  background: #eef7f4;
  color: #126b62;
}

.detail-collapse-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.2s;
}

.detail-collapse-btn svg.collapsed {
  transform: rotate(-90deg);
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
  color: #40504c;
  font-size: 17px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.detail-phrases-item,
.detail-sentences-item {
  grid-column: 1 / -1;
  border-right: 0 !important;
}

.detail-loading {
  margin-top: 8px;
  color: #8c9996;
  font-size: 14px;
}

.detail-empty {
  margin-top: 8px;
  color: #8c9996;
  font-size: 14px;
}

.detail-phrases-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.detail-phrase-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fdfb;
  border-radius: 6px;
}

.phrase-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef7f4;
  color: #0c514b;
  font-size: 14px;
  font-weight: 700;
  border-radius: 6px;
  flex-shrink: 0;
}

.phrase-content {
  flex: 1;
}

.phrase-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phrase-text {
  color: #1d68b3;
  font-size: 18px;
  font-weight: 600;
}

.phrase-sound-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #b8d6cb;
  border-radius: 50%;
  background: #eef7f4;
  color: #0c514b;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.phrase-sound-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.phrase-meaning {
  display: block;
  color: #40504c;
  font-size: 16px;
  line-height: 1.6;
  margin-top: 6px;
}

.detail-sentences-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.detail-sentence-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #f8fdfb;
  border-radius: 6px;
}

.sentence-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef7f4;
  color: #0c514b;
  font-size: 14px;
  font-weight: 700;
  border-radius: 6px;
  flex-shrink: 0;
}

.sentence-content {
  flex: 1;
}

.sentence-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sentence-en {
  margin: 0;
  color: #101919;
  font-size: 18px;
  line-height: 1.6;
}

.clickable-word {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: #126b62;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
  color: #126b62;
}

.clickable-word:hover {
  text-decoration-thickness: 2px;
}

.sentence-sound-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #b8d6cb;
  border-radius: 50%;
  background: #eef7f4;
  color: #0c514b;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.sentence-sound-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.sentence-zh {
  display: block;
  margin: 6px 0 0;
  color: #63706d;
  font-size: 16px;
  line-height: 1.6;
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
