<template>
  <div class="vocab-test-page">
    <header class="test-header">
      <div class="test-title-wrap">
        <el-button type="primary" @click="goBack">
          <el-icon>
            <ArrowLeft />
          </el-icon>
          返回
        </el-button>
        <div>
          <h2 class="test-title">单词测试</h2>
          <p class="test-subtitle">默认词本：{{ defaultBook?.name || '默认生词本' }}</p>
        </div>
      </div>
    </header>

    <section class="test-panel">
      <div class="test-controls">
        <el-select v-model="levelFilter" class="test-control" multiple collapse-tags collapse-tags-tooltip clearable
          placeholder="按水平筛选">
          <el-option v-for="level in VOCABULARY_LEVELS" :key="level.value" :label="level.label" :value="level.value" />
        </el-select>
        <el-select v-model="tagFilter" class="test-control" multiple collapse-tags collapse-tags-tooltip clearable
          placeholder="按标签筛选">
          <el-option v-for="tag in defaultTags" :key="tag.id" :label="tag.name" :value="tag.id" />
        </el-select>
        <el-select v-model="testMode" class="test-control" placeholder="测试方式">
          <el-option label="根据中文意思" value="meaning" />
          <el-option label="根据发音" value="sound" />
        </el-select>
        <el-input-number v-model="testCount" class="test-count" :min="1" :max="Math.max(1, availableWords.length)"
          controls-position="right" />
        <div class="sound-toggle">
          <span class="sound-toggle-label">发音</span>
          <el-switch v-model="showSoundButton" />
        </div>
        <el-button type="primary" :disabled="!availableWords.length" @click="startTest">
          开始测试
        </el-button>
      </div>
      <div class="test-meta">
        当前可测试 {{ availableWords.length }} 个单词，将随机抽取 {{ normalizedTestCount }} 个。
      </div>
    </section>

    <section v-if="!defaultWords.length" class="test-card empty-card">
      默认词本暂无单词，请先添加或导入单词。
    </section>

    <template v-else>
      <section v-if="currentWord && !isFinished" class="test-card question-card">
        <div class="question-progress">
          {{ currentIndex + 1 }} / {{ testQueue.length }}
        </div>
        <div class="question-body">
          <div class="question-label">
            {{ testMode === 'meaning' ? '根据中文意思输入英文单词' : '根据发音输入英文单词' }}
          </div>
          <div v-if="testMode === 'meaning'" class="question-prompt">
            {{ cleanMeaning(currentWord.meaning) || '暂无释义' }}
          </div>
          <div v-else class="question-prompt">
            <span>{{ currentWord.phonetic || '点击播放发音' }}</span>
          </div>
          <div class="answer-row">
            <button v-if="showSoundButton" class="sound-button" @click="playCurrentWord">
              <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"></path>
              </svg>
            </button>
            <el-input ref="answerInputRef" v-model="answerText" size="large" class="answer-input" placeholder="输入单词"
              @keyup.enter="submitAnswer" />
            <div class="answer-buttons">
              <el-button type="primary" size="large" class="answer-submit" @click="submitAnswer">提交</el-button>
              <el-button size="large" class="answer-skip" @click="skipWord">跳过</el-button>
            </div>
          </div>
          <div v-if="showCorrectToast" class="correct-toast">
            <div class="correct-toast-icon">✓</div>
            <div class="correct-toast-text">回答正确</div>
          </div>
        </div>
      </section>

      <section v-else-if="!testQueue.length" class="test-card empty-card">
        请设置筛选条件后开始测试。
      </section>

      <el-dialog v-model="errorDialogVisible" width="560px" :show-close="true" :close-on-click-modal="false"
        custom-class="error-dialog">
        <template #header>
          <span class="error-dialog-title">回答错误</span>
        </template>
        <div class="error-content">
          <div class="error-answer">
            <span class="error-label">你的答案：</span>
            <span class="error-text">{{ errorInfo.answer }}</span>
          </div>
          <div class="correct-info">
            <div class="correct-word-row">
              <span class="correct-word">{{ errorInfo.word }}</span>
              <button class="error-sound-btn" @click="playWord(errorInfo.word)">
                <svg viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"></path>
                </svg>
              </button>
            </div>
            <span v-if="errorInfo.phonetic" class="correct-phonetic">{{ errorInfo.phonetic }}</span>
            <span class="correct-meaning">{{ errorInfo.meaning }}</span>
          </div>
        </div>
        <template #footer>
          <div class="error-footer">
            <el-button type="primary" size="large" @click="handleErrorNext">下一个</el-button>
          </div>
        </template>
      </el-dialog>

      <el-dialog v-model="historyVisible" width="800px" :show-close="true" custom-class="history-dialog">
        <template #header>
          <span class="history-dialog-title">历史测试记录</span>
        </template>
        <div class="history-content" style="max-height: 680px; overflow-y: auto;">
          <div v-if="!historyRecords.length" class="history-empty">暂无历史测试记录</div>
          <div v-for="record in historyRecords" :key="record.id" class="history-record">
            <div class="history-record-header">
              <span class="history-record-time">{{ record.timestamp }}</span>
              <span class="history-record-stats">总计{{ record.total }}题 · 正确{{ record.correct }}题 · 错误{{ record.wrong }}题
                ·
                正确率{{ record.accuracy }}%</span>
            </div>
            <div v-if="record.wrongResults.length" class="history-wrong-list">
              <div v-for="(item, index) in record.wrongResults" :key="`h-${record.id}-${index}`"
                class="history-wrong-item">
                <span class="history-wrong-word">{{ item.word }}</span>
                <button class="history-sound-btn" @click="playWord(item.word)">
                  <svg viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                </button>
                <span v-if="item.phonetic" class="history-wrong-phonetic">{{ item.phonetic }}</span>
                <span class="history-wrong-answer">你的答案：{{ item.answer || '-' }}</span>
                <span class="history-wrong-meaning">{{ item.meaning || '暂无释义' }}</span>
              </div>
            </div>
            <div v-if="record.wrongResults.length" class="history-record-footer">
              <el-button size="small" type="success" @click="restartHistoryTest(record)">重测这些错题</el-button>
            </div>
          </div>
        </div>
      </el-dialog>

      <section v-if="testQueue.length" class="test-card result-card">
        <div class="result-head">
          <div class="result-head-left">
            <span class="result-label">{{ isFinished ? '测试完成' : '实时结果' }}</span>
            <div class="result-main-row">
              <span class="result-item result-item-total">总计{{ testQueue.length }}个</span>
              <span class="result-item result-item-current">当前第{{ currentIndex + 1 }}个</span>
              <span class="result-item result-item-correct">正确{{ correctResults.length }}个</span>
              <span class="result-item result-item-wrong">错误{{ wrongResults.length }}个</span>
              <span class="result-item result-item-accuracy" :class="accuracyColorClass">正确率 {{ accuracyRate }}%</span>
            </div>
          </div>
          <el-button v-if="isFinished" type="primary" @click="restartSameTest">再测一次</el-button>
          <el-button v-if="isFinished && wrongResults.length" type="success" @click="restartWrongTest">重测错题</el-button>
          <el-button v-if="isFinished" type="info" @click="showHistory">历史记录</el-button>
        </div>

        <div class="result-grid">
          <div class="result-block">
            <h4>正确列表</h4>
            <div class="result-scroll-area">
              <div v-if="!correctResults.length" class="result-empty">暂无</div>
              <div v-for="(item, index) in correctResults.slice().reverse()" :key="`ok-${item.word}-${index}`"
                class="result-row is-correct">
                <div class="result-word-line">
                  <div class="result-word-group">
                    <button class="result-word-button" @click="openWordDetail(item.word)">{{ item.word }}</button>
                    <button class="result-sound-btn" @click="playWord(item.word)">
                      <svg viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"></path>
                      </svg>
                    </button>
                  </div>
                  <span class="result-stat">{{ resultStatText(item) }}</span>
                </div>
                <span>{{ item.phonetic || '' }}</span>
                <span>{{ item.meaning || '暂无释义' }}</span>
              </div>
            </div>
          </div>
          <div class="result-block">
            <div class="result-block-header">
              <h4>错误列表</h4>
              <div v-if="wrongResults.length" class="result-actions">
                <el-button size="small" @click="exportWrongWords">导出</el-button>
                <el-button size="small" :loading="exportingWrongPdf" :disabled="exportingWrongPdf"
                  @click="printWrongWords">导出PDF</el-button>
              </div>
            </div>
            <div class="result-scroll-area">
              <div v-if="!wrongResults.length" class="result-empty">暂无</div>
              <div v-for="(item, index) in wrongResults.slice().reverse()" :key="`wrong-${item.word}-${index}`"
                class="result-row is-wrong">
                <div class="result-word-line">
                  <div class="result-word-group">
                    <button class="result-word-button" @click="openWordDetail(item.word)">{{ item.word }}</button>
                    <button class="result-sound-btn" @click="playWord(item.word)">
                      <svg viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"></path>
                      </svg>
                    </button>
                  </div>
                  <span class="result-stat">{{ resultStatText(item) }}</span>
                </div>
                <span>{{ item.phonetic || '' }}</span>
                <span>你的答案：{{ item.answer || '-' }}</span>
                <span>{{ item.meaning || '暂无释义' }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElDialog } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { speak } from '../../api/voice/index.js'
import { useVocabularyStore } from '../../stores/vocabulary.js'
import { VOCABULARY_LEVELS } from '../../types/index.js'

const router = useRouter()
const vocabularyStore = useVocabularyStore()
const TEST_SESSION_STORAGE_KEY = 'bilingual-reader-vocabulary-test-session'
const TEST_HISTORY_STORAGE_KEY = 'bilingual-reader-vocabulary-test-history'

const levelFilter = ref([])
const tagFilter = ref([])
const testMode = ref('meaning')
const testCount = ref(10)
const testQueue = ref([])
const currentIndex = ref(0)
const answerText = ref('')
const correctResults = ref([])
const wrongResults = ref([])
const isFinished = ref(false)
const answerInputRef = ref(null)
const errorDialogVisible = ref(false)
const errorInfo = ref({ word: '', phonetic: '', meaning: '', answer: '' })
const showCorrectToast = ref(false)
const showSoundButton = ref(true)
const exportingWrongPdf = ref(false)
const historyVisible = ref(false)
const historyRecords = ref([])

const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123
const PDF_PAGE_WIDTH_PT = 595.28
const PDF_PAGE_HEIGHT_PT = 841.89
const WRONG_PAGE_PADDING_X = 37
const WRONG_PAGE_PADDING_Y = 32
const WRONG_PAGE_HEADER_HEIGHT = 44
const WRONG_PAGE_GAP = 14
const WRONG_WORD_FONT = '800 20px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
const WRONG_META_FONT = '600 14px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
const WRONG_ANSWER_FONT = '500 13px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
const WRONG_MEANING_FONT = '500 14px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'

const defaultBook = computed(() => vocabularyStore.getDefaultBook())
const defaultWords = computed(() => defaultBook.value?.words || [])
const defaultTags = computed(() => defaultBook.value?.tags || [])
const availableWords = computed(() => {
  const selectedTags = Array.isArray(tagFilter.value) ? tagFilter.value : []
  return defaultWords.value.filter(entry => {
    const selectedLevels = Array.isArray(levelFilter.value) ? levelFilter.value : []
    const matchLevel = !selectedLevels.length || selectedLevels.includes(entry.level)
    const matchTags = !selectedTags.length || selectedTags.every(tagId => (entry.tagIds || []).includes(tagId))
    return matchLevel && matchTags
  })
})
const normalizedTestCount = computed(() => Math.min(Math.max(Number(testCount.value) || 1, 1), Math.max(availableWords.value.length, 1)))
const currentWord = computed(() => testQueue.value[currentIndex.value] || null)
const accuracyRate = computed(() => {
  const total = correctResults.value.length + wrongResults.value.length
  if (total === 0) return 0
  return Math.round((correctResults.value.length / total) * 100)
})

const accuracyColorClass = computed(() => {
  const rate = accuracyRate.value
  if (rate >= 90) return 'accuracy-excellent'
  if (rate >= 80) return 'accuracy-good'
  if (rate >= 60) return 'accuracy-warning'
  return 'accuracy-danger'
})

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/vocabulary')
  }
}

function openWordDetail(word) {
  saveTestSession()
  router.push({
    path: `/vocabulary/${encodeURIComponent(word)}`,
    query: { from: 'test' }
  })
}

function saveTestSession() {
  const payload = {
    levelFilter: levelFilter.value,
    tagFilter: tagFilter.value,
    testMode: testMode.value,
    testCount: testCount.value,
    testQueue: testQueue.value,
    currentIndex: currentIndex.value,
    answerText: answerText.value,
    correctResults: correctResults.value,
    wrongResults: wrongResults.value,
    isFinished: isFinished.value
  }
  sessionStorage.setItem(TEST_SESSION_STORAGE_KEY, JSON.stringify(payload))
}

async function restoreTestSession() {
  try {
    const payload = JSON.parse(sessionStorage.getItem(TEST_SESSION_STORAGE_KEY) || '{}')
    if (!Array.isArray(payload.testQueue) || !payload.testQueue.length) return
    levelFilter.value = Array.isArray(payload.levelFilter) ? payload.levelFilter : []
    tagFilter.value = Array.isArray(payload.tagFilter) ? payload.tagFilter : []
    testMode.value = payload.testMode === 'sound' ? 'sound' : 'meaning'
    testCount.value = Math.max(1, Number(payload.testCount) || 10)
    testQueue.value = payload.testQueue
    currentIndex.value = Math.max(0, Number(payload.currentIndex) || 0)
    answerText.value = String(payload.answerText || '')
    correctResults.value = Array.isArray(payload.correctResults) ? payload.correctResults : []
    wrongResults.value = Array.isArray(payload.wrongResults) ? payload.wrongResults : []
    isFinished.value = Boolean(payload.isFinished)
    if (!isFinished.value) await focusAnswer()
  } catch {
    sessionStorage.removeItem(TEST_SESSION_STORAGE_KEY)
  }
}

function shuffleWords(words) {
  return [...words].sort(() => Math.random() - 0.5)
}

async function focusAnswer() {
  await nextTick()
  answerInputRef.value?.focus?.()
}

async function startTest() {
  const candidates = availableWords.value
  if (!candidates.length) {
    ElMessage.warning('当前筛选条件下没有可测试单词')
    return
  }
  testQueue.value = shuffleWords(candidates).slice(0, normalizedTestCount.value)
  currentIndex.value = 0
  answerText.value = ''
  correctResults.value = []
  wrongResults.value = []
  isFinished.value = false
  saveTestSession()
  await focusAnswer()
  if (testMode.value === 'sound') playCurrentWord()
}

async function restartSameTest() {
  if (!testQueue.value.length) {
    await startTest()
    return
  }
  currentIndex.value = 0
  answerText.value = ''
  correctResults.value = []
  wrongResults.value = []
  isFinished.value = false
  saveTestSession()
  await focusAnswer()
  if (testMode.value === 'sound') playCurrentWord()
}

async function restartWrongTest() {
  if (!wrongResults.value.length) {
    ElMessage.warning('没有错题可测试')
    return
  }
  const wrongWords = wrongResults.value.map(item => item.word)
  const candidates = availableWords.value.filter(w => wrongWords.includes(w.word))
  if (!candidates.length) {
    ElMessage.warning('错题单词已不存在于当前词库中')
    return
  }
  testQueue.value = shuffleWords(candidates)
  currentIndex.value = 0
  answerText.value = ''
  correctResults.value = []
  wrongResults.value = []
  isFinished.value = false
  saveTestSession()
  await focusAnswer()
  if (testMode.value === 'sound') playCurrentWord()
}

function playCurrentWord() {
  if (currentWord.value?.word) speak(currentWord.value.word, 'en-US')
}

function cleanMeaning(meaning) {
  if (!meaning) return ''
  return meaning.replace(/\([^)]*[a-zA-Z][^)]*\)/g, '')
    .replace(/（[^（）]*[a-zA-Z][^（）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^（）]*）/g, '')
    .replace(/[a-zA-Z][a-zA-Z0-9_.-]*\s*[a-zA-Z]*/g, '')
    .replace(/\s+/g, '')
    .replace(/\(\s*\)|（\s*）/g, '')
    .replace(/^[\s·•\.·\-—_:：,，;；、。！？]+/, '')
    .replace(/；+/g, '；')
    .replace(/；$/, '')
}

function playWord(word) {
  if (word) speak(word, 'en-US')
}

function resultStatText(item) {
  return `${Number(item.testCorrectCount) || 0}/${Number(item.testTotalCount) || 0}`
}

function exportWrongWords() {
  if (!wrongResults.value.length) return
  const content = wrongResults.value.map(item => {
    const cleanMean = cleanMeaning(item.meaning) || '暂无释义'
    return `${item.word} : ${cleanMean}`
  }).join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `错误单词_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

function printWrongWords() {
  if (!wrongResults.value.length) return
  exportingWrongPdf.value = true
  try {
    const items = wrongResults.value.slice().reverse()
    const pages = paginateWrongWordPages(items)
    const jpegPages = pages.map((page, index) => renderWrongWordPageToJpeg(page, index, pages.length))
    const pdfBlob = buildImagePdf(jpegPages)
    downloadBlob(pdfBlob, `错误单词_${new Date().toISOString().slice(0, 10)}.pdf`)
    ElMessage.success(`已导出 ${pages.length} 页 PDF`)
  } catch (error) {
    ElMessage.error('导出 PDF 失败：' + (error.message || error))
  } finally {
    exportingWrongPdf.value = false
  }
}

function paginateWrongWordPages(items) {
  const measureCanvas = document.createElement('canvas')
  const ctx = measureCanvas.getContext('2d')
  const contentWidth = A4_WIDTH_PX - WRONG_PAGE_PADDING_X * 2
  const bodyTop = WRONG_PAGE_PADDING_Y + WRONG_PAGE_HEADER_HEIGHT
  const bodyBottom = WRONG_PAGE_PADDING_Y
  const availableHeight = A4_HEIGHT_PX - bodyTop - bodyBottom
  const pages = []
  let currentPage = []
  let usedHeight = 0

  for (const item of items) {
    const itemHeight = estimateWrongItemHeight(item, contentWidth, ctx)
    if (currentPage.length && usedHeight + itemHeight > availableHeight) {
      pages.push(currentPage)
      currentPage = []
      usedHeight = 0
    }
    currentPage.push(item)
    usedHeight += itemHeight + WRONG_PAGE_GAP
  }

  if (currentPage.length) pages.push(currentPage)
  return pages
}

function estimateWrongItemHeight(item, contentWidth, ctx) {
  ctx.font = WRONG_WORD_FONT
  const wordHeight = 24
  const statWidth = 58
  const wordWidth = contentWidth - statWidth - 12
  const wordLines = wrapLines(item.word || '', wordWidth, ctx, 1).length || 1
  ctx.font = WRONG_META_FONT
  const phoneticHeight = (item.phonetic ? 18 : 0)
  ctx.font = WRONG_ANSWER_FONT
  const answerHeight = 18
  ctx.font = WRONG_MEANING_FONT
  const meaning = cleanMeaning(item.meaning) || '暂无释义'
  const meaningLines = wrapLines(meaning, contentWidth, ctx, 4).length || 1
  const meaningHeight = meaningLines * 18
  return Math.max(wordHeight * wordLines, 24) + phoneticHeight + answerHeight + meaningHeight + 20
}

function renderWrongWordPageToJpeg(pageItems, pageIndex, totalPages) {
  const scale = Math.max(2, window.devicePixelRatio || 1)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(A4_WIDTH_PX * scale)
  canvas.height = Math.round(A4_HEIGHT_PX * scale)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX)

  const contentWidth = A4_WIDTH_PX - WRONG_PAGE_PADDING_X * 2
  const bodyTop = WRONG_PAGE_PADDING_Y + WRONG_PAGE_HEADER_HEIGHT
  let y = bodyTop

  ctx.textBaseline = 'top'
  ctx.fillStyle = '#111827'
  ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText('错误单词列表', WRONG_PAGE_PADDING_X, WRONG_PAGE_PADDING_Y)
  ctx.fillStyle = '#6b7280'
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
  const pageNo = `第 ${pageIndex + 1} / ${totalPages} 页`
  ctx.fillText(pageNo, WRONG_PAGE_PADDING_X + contentWidth - ctx.measureText(pageNo).width, WRONG_PAGE_PADDING_Y + 1)
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(WRONG_PAGE_PADDING_X, bodyTop - 12)
  ctx.lineTo(WRONG_PAGE_PADDING_X + contentWidth, bodyTop - 12)
  ctx.stroke()

  pageItems.forEach((item) => {
    const statWidth = 58
    const gap = 12
    const wordWidth = contentWidth - statWidth - gap
    const meaning = cleanMeaning(item.meaning) || '暂无释义'

    ctx.fillStyle = '#ef4444'
    ctx.font = WRONG_WORD_FONT
    const wordLines = wrapLines(item.word || '', wordWidth, ctx, 1)
    drawLines(ctx, wordLines, WRONG_PAGE_PADDING_X, y, 24)

    ctx.fillStyle = '#9ca3af'
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
    const statText = `${Number(item.testCorrectCount) || 0}/${Number(item.testTotalCount) || 0}`
    ctx.fillText(statText, WRONG_PAGE_PADDING_X + contentWidth - ctx.measureText(statText).width, y + 6)

    let lineY = y + 28
    if (item.phonetic) {
      ctx.fillStyle = '#6b7280'
      ctx.font = WRONG_META_FONT
      drawLines(ctx, [item.phonetic], WRONG_PAGE_PADDING_X, lineY, 18)
      lineY += 20
    }

    ctx.fillStyle = '#dc2626'
    ctx.font = WRONG_ANSWER_FONT
    drawLines(ctx, [`你的答案：${item.answer || '-'}`], WRONG_PAGE_PADDING_X, lineY, 17)
    lineY += 20

    ctx.fillStyle = '#333'
    ctx.font = WRONG_MEANING_FONT
    const meaningLines = wrapLines(meaning, contentWidth, ctx, 4)
    drawLines(ctx, meaningLines.length ? meaningLines : ['暂无释义'], WRONG_PAGE_PADDING_X, lineY, 18)
    lineY += Math.max(meaningLines.length, 1) * 18 + 10

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(WRONG_PAGE_PADDING_X, lineY)
    ctx.lineTo(WRONG_PAGE_PADDING_X + contentWidth, lineY)
    ctx.stroke()

    y = lineY + 12
  })

  return {
    width: canvas.width,
    height: canvas.height,
    bytes: base64ToBytes(canvas.toDataURL('image/jpeg', 0.96).split(',')[1])
  }
}

function wrapLines(text, maxWidth, ctx, maxLines = 1) {
  const source = String(text || '')
  if (!source) return []
  const lines = []
  let current = ''
  for (const char of source) {
    const next = current + char
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next
      continue
    }
    lines.push(current)
    current = char
    if (lines.length >= maxLines) break
  }
  if (lines.length < maxLines && current) lines.push(current)
  if (lines.length > maxLines) lines.length = maxLines
  const joined = lines.join('')
  if (lines.length && source.length > joined.length) {
    lines[lines.length - 1] = ellipsizeLine(lines[lines.length - 1], maxWidth, ctx)
  }
  return lines
}

function ellipsizeLine(text, maxWidth, ctx) {
  let line = String(text || '')
  while (line && ctx.measureText(`${line}…`).width > maxWidth) {
    line = line.slice(0, -1)
  }
  return `${line}…`
}

function drawLines(ctx, lines, x, y, lineHeight) {
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight)
  })
}

function base64ToBytes(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function buildImagePdf(images) {
  const encoder = new TextEncoder()
  const parts = []
  const offsets = [0]
  let length = 0
  const addText = (text) => {
    const bytes = encoder.encode(text)
    parts.push(bytes)
    length += bytes.length
  }
  const addBytes = (bytes) => {
    parts.push(bytes)
    length += bytes.length
  }
  const addObject = (id, writer) => {
    offsets[id] = length
    addText(`${id} 0 obj\n`)
    writer()
    addText('\nendobj\n')
  }

  addBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))
  addObject(1, () => addText('<< /Type /Catalog /Pages 2 0 R >>'))
  addObject(2, () => {
    const kids = images.map((_, index) => `${3 + index * 3} 0 R`).join(' ')
    addText(`<< /Type /Pages /Kids [${kids}] /Count ${images.length} >>`)
  })

  images.forEach((image, index) => {
    const pageObjectId = 3 + index * 3
    const contentObjectId = pageObjectId + 1
    const imageObjectId = pageObjectId + 2
    const imageName = `Im${index + 1}`
    const content = `q\n${PDF_PAGE_WIDTH_PT} 0 0 ${PDF_PAGE_HEIGHT_PT} 0 0 cm\n/${imageName} Do\nQ`

    addObject(pageObjectId, () => {
      addText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH_PT} ${PDF_PAGE_HEIGHT_PT}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /${imageName} ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`)
    })
    addObject(contentObjectId, () => {
      addText(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`)
    })
    addObject(imageObjectId, () => {
      addText(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`)
      addBytes(image.bytes)
      addText('\nendstream')
    })
  })

  const xrefStart = length
  addText(`xref\n0 ${offsets.length}\n`)
  addText('0000000000 65535 f \n')
  for (let i = 1; i < offsets.length; i += 1) {
    addText(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  }
  addText(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)

  return new Blob(parts, { type: 'application/pdf' })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function goNextQuestion() {
  answerText.value = ''
  currentIndex.value += 1
  if (currentIndex.value >= testQueue.value.length) {
    isFinished.value = true
    saveTestSession()
    saveTestHistory()
    return
  }
  saveTestSession()
  await focusAnswer()
  if (testMode.value === 'sound') playCurrentWord()
}

function saveTestHistory() {
  if (!wrongResults.value.length && !correctResults.value.length) return
  const record = {
    id: Date.now().toString(),
    timestamp: new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-'),
    total: testQueue.value.length,
    correct: correctResults.value.length,
    wrong: wrongResults.value.length,
    accuracy: accuracyRate.value,
    wrongResults: wrongResults.value.map(item => ({
      word: item.word,
      phonetic: item.phonetic || '',
      meaning: item.meaning || '',
      answer: item.answer || ''
    }))
  }
  try {
    const history = JSON.parse(localStorage.getItem(TEST_HISTORY_STORAGE_KEY) || '[]')
    history.unshift(record)
    if (history.length > 50) history.pop()
    localStorage.setItem(TEST_HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch (e) {
    console.error('保存测试历史失败:', e)
  }
}

function loadTestHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(TEST_HISTORY_STORAGE_KEY) || '[]')
    historyRecords.value = Array.isArray(history) ? history : []
  } catch (e) {
    console.error('加载测试历史失败:', e)
    historyRecords.value = []
  }
}

function showHistory() {
  loadTestHistory()
  historyVisible.value = true
}

async function restartHistoryTest(record) {
  if (!record.wrongResults.length) return
  const wrongWords = record.wrongResults.map(item => item.word)
  const candidates = availableWords.value.filter(w => wrongWords.includes(w.word))
  if (!candidates.length) {
    ElMessage.warning('错题单词已不存在于当前词库中')
    return
  }
  historyVisible.value = false
  testQueue.value = shuffleWords(candidates)
  currentIndex.value = 0
  answerText.value = ''
  correctResults.value = []
  wrongResults.value = []
  isFinished.value = false
  saveTestSession()
  await focusAnswer()
  if (testMode.value === 'sound') playCurrentWord()
}

async function handleErrorNext() {
  errorDialogVisible.value = false
  await goNextQuestion()
}

async function handleErrorClose() {
  errorDialogVisible.value = false
  await goNextQuestion()
}

async function skipWord() {
  const entry = currentWord.value
  if (!entry) return
  const updatedEntry = await vocabularyStore.recordTestResult(entry.word, false, 'default') || entry
  const result = {
    word: updatedEntry.word,
    meaning: updatedEntry.meaning,
    phonetic: updatedEntry.phonetic,
    testTotalCount: updatedEntry.testTotalCount,
    testCorrectCount: updatedEntry.testCorrectCount,
    answer: '跳过'
  }
  wrongResults.value.push(result)
  goNextQuestion()
}

async function submitAnswer() {
  const entry = currentWord.value
  if (!entry) return
  const answer = answerText.value.trim().toLowerCase()
  if (!answer) {
    ElMessage.warning('请输入单词')
    return
  }
  const normalizedWord = entry.word.toLowerCase().replace(/\s*\([^)]+\)/g, '')
  const isCorrect = answer === entry.word.toLowerCase() || answer === normalizedWord
  const updatedEntry = await vocabularyStore.recordTestResult(entry.word, isCorrect, 'default') || entry
  const result = {
    word: updatedEntry.word,
    meaning: updatedEntry.meaning,
    phonetic: updatedEntry.phonetic,
    testTotalCount: updatedEntry.testTotalCount,
    testCorrectCount: updatedEntry.testCorrectCount,
    answer
  }
  if (isCorrect) {
    correctResults.value.push(result)
    showCorrectToast.value = true
    setTimeout(() => {
      showCorrectToast.value = false
      goNextQuestion()
    }, 1200)
  } else {
    wrongResults.value.push(result)
    errorInfo.value = {
      word: entry.word,
      phonetic: entry.phonetic || '',
      meaning: cleanMeaning(entry.meaning) || '暂无释义',
      answer: answer
    }
    errorDialogVisible.value = true
  }
}

onMounted(() => {
  restoreTestSession()
})
</script>

<style scoped>
.vocab-test-page {
  /* 测试页对齐 token：修改时只改这里 */
  --test-max: 1200px;
  --test-border: 1px;

  min-height: 100vh;
  box-sizing: border-box;
  padding: 28px;
  /* 视觉衬垫：与页面其他区域保持一致的呼吸感 */
  background: linear-gradient(135deg, #eef4f1 0%, #f8f7f2 48%, #edf1f8 100%);
}

/* ===== 三块容器共享 EXACT 相同宽度规则：任意视口外盒宽必然一致 ===== */
.test-header,
.test-panel,
.test-card {
  width: 100% !important;
  max-width: var(--test-max) !important;
  margin-left: auto !important;
  margin-right: auto !important;
  box-sizing: border-box !important;
}

.test-header {
  margin-bottom: 18px;
  padding: 0 !important;
  /* header 无外框卡片：返回按钮贴 header 外盒边，使按钮边缘 == panel/card 的外卡边缘 */
}

.test-title-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
}

.test-title {
  margin: 0;
  color: #16201f;
  font-size: 22px;
  font-weight: 800;
}

.test-subtitle {
  margin: 4px 0 0;
  color: #63706d;
  font-size: 13px;
  font-weight: 700;
}

.test-panel,
.test-card {
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
}

.test-panel {
  padding: 14px;
  margin-bottom: 14px;
}

.test-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.test-control {
  width: 190px;
}

.test-count {
  width: 130px;
}

.sound-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sound-toggle-label {
  color: #63706d;
  font-size: 14px;
  font-weight: 700;
}

.test-meta {
  margin-top: 10px;
  color: #63706d;
  font-size: 13px;
  font-weight: 700;
}

.test-card {
  padding: 28px;
}

.empty-card {
  color: #8c9996;
  text-align: center;
}

.question-card {
  position: relative;
  min-height: 320px;
}

.result-card {
  margin-top: 14px;
}

.question-progress {
  position: absolute;
  top: 18px;
  right: 22px;
  color: #8c9996;
  font-size: 13px;
  font-weight: 800;
}

.question-body {
  display: grid;
  gap: 22px;
  max-width: 90%;
  margin: 40px auto 0;
  text-align: center;
}

.question-label {
  color: #63706d;
  font-size: 14px;
  font-weight: 800;
}

.question-prompt {
  color: #16201f;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.5;
}

.sound-prompt-center {
  display: flex;
  justify-content: center;
}

.sound-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #126b62;
  font-size: 22px;
  font-weight: 800;
}

.sound-button {
  display: grid;
  place-items: center;
  width: 78px;
  height: 78px;
  border: 1px solid #b8d6cb;
  border-radius: 50%;
  background: #eef7f4;
  color: #0c514b;
  cursor: pointer;
}

.sound-button svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.answer-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.answer-input {
  flex: 1;
}

.answer-buttons {
  display: flex;
  gap: 14px;
  flex-shrink: 0;
}

/* ---------------- 红框 answer-row: 字体 30px（用户需求） ---------------- */
/* 30px 字号同步把 wrapper 高度/内边距调大，避免字母上沿下沿被裁切 */
.answer-input :deep(.el-input__wrapper) {
  font-size: 34px;
  padding: 14px 16px;
  height: 78px;
  box-sizing: border-box;
  box-shadow: var(--el-input-border-color, #dcdfe6) 0 0 0 1px inset;
  border-radius: 8px;
  transition: box-shadow 0.3s ease;
}

.answer-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px #2f6feb, 0 0 20px rgba(47, 111, 235, 0.35), inset 0 0 0 1px #2f6feb;
}

.answer-input :deep(.el-input__inner) {
  font-size: 34px;
  line-height: 1;
  height: auto;
  padding: 0;
  /* ---------------- 用户需求：输入框内输入的文字水平居中 ---------------- */
  text-align: center;
}

.answer-input :deep(.el-input__inner::placeholder) {
  font-size: 34px;
  color: #a8b1ad;
  /* ---------------- 用户需求：placeholder 文字也水平居中 ---------------- */
  text-align: center;
}

:global(.answer-skip.el-button),
:global(.answer-submit.el-button) {
  font-size: 30px;
  font-weight: 800;
  padding: 0 36px;
  height: 78px;
  line-height: 78px;
  border: none;
  border-radius: 0;
  box-sizing: border-box;
}

:global(.answer-skip.el-button):hover,
:global(.answer-skip.el-button):focus,
:global(.answer-submit.el-button):hover,
:global(.answer-submit.el-button):focus {
  border: none;
  border-radius: 0;
}

:global(.answer-submit.el-button) {
  background: #2f6feb;
  color: #fff;
}

:global(.answer-submit.el-button):hover {
  background: #2563eb;
}

:global(.answer-skip.el-button) {
  background: #f0f0f0;
  color: #333;
}

:global(.answer-skip.el-button):hover {
  background: #e0e0e0;
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.result-head-left {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
}

.result-label {
  color: #63706d;
  font-size: 18px;
  font-weight: 800;
}

.result-main-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.result-item {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
}

.result-item-total {
  background: #eef4f1;
  color: #16201f;
}

.result-item-current {
  background: #eef1f8;
  color: #2f6feb;
}

.result-item-correct {
  background: #effaf5;
  color: #19a974;
}

.result-item-wrong {
  background: #fff1f1;
  color: #e5484d;
}

.result-item-accuracy {
  font-weight: 800;
}

.result-item-accuracy.accuracy-excellent {
  background: #effaf5;
  color: #2d8a4e;
}

.result-item-accuracy.accuracy-good {
  background: #eef1f8;
  color: #2f6feb;
}

.result-item-accuracy.accuracy-warning {
  background: #fffbeb;
  color: #d97706;
}

.result-item-accuracy.accuracy-danger {
  background: #fff1f1;
  color: #dc2626;
}

.accuracy-excellent {
  color: #2d8a4e;
}

.accuracy-good {
  color: #2f6feb;
}

.accuracy-warning {
  color: #d97706;
}

.accuracy-danger {
  color: #dc2626;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.result-block {
  min-width: 0;
  padding: 14px;
  border: 1px solid #edf1ef;
  border-radius: 8px;
  background: #fbfdfc;
}

.result-block h4 {
  margin: 0 0 12px;
  color: #16201f;
}

.result-row {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-top: 1px solid #edf1ef;
  color: #40504c;
  font-size: 14px;
}

.result-word-button {
  width: fit-content;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  font-weight: 800;
  text-align: left;
}

.result-word-button:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.result-word-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-word-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.result-stat {
  margin-left: auto;
}

.result-sound-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #f0f0f0;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.result-sound-btn:hover {
  background: #2f6feb;
}

.result-sound-btn svg {
  width: 14px;
  height: 14px;
  fill: #666;
}

.result-sound-btn:hover svg {
  fill: #fff;
}

.result-stat {
  flex: none;
  padding: 3px 8px;
  border-radius: 999px;
  background: #eef4f1;
  color: #40504c;
  font-size: 12px;
  font-weight: 800;
}

.result-row.is-correct .result-word-button {
  color: #19a974;
}

.result-row.is-correct .result-stat {
  background: #effaf5;
  color: #19a974;
}

.result-row.is-wrong .result-word-button {
  color: #e5484d;
}

.result-row.is-wrong .result-stat {
  background: #fff1f1;
  color: #e5484d;
}

.result-empty {
  color: #8c9996;
  font-size: 13px;
}

.result-scroll-area {
  max-height: 600px;
  overflow-y: auto;
}

.result-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.result-actions {
  display: flex;
  gap: 8px;
}

:global(.correct-notification) {
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(25, 169, 116, 0.3);
}

:global(.correct-notification .el-notification__title) {
  color: #19a974;
  font-weight: 800;
}

:global(.error-dialog) {
  border-radius: 12px;
}

:global(.error-dialog .el-dialog__header) {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 12px;
}

.error-dialog-title {
  color: #dc2626;
  font-size: 24px;
  font-weight: 800;
}

:global(.history-dialog) {
  border-radius: 12px;
  max-height: 800px;
}

:global(.history-dialog .el-dialog__header) {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 12px;
}

.history-dialog-title {
  color: #333;
  font-size: 24px;
  font-weight: 800;
}

:global(.history-dialog .el-dialog__body) {
  padding: 16px 24px;
  margin: 0;
}

.history-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.history-record {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

.history-record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-record-time {
  font-size: 14px;
  color: #666;
  font-weight: 600;
}

.history-record-stats {
  font-size: 14px;
  color: #999;
}

.history-wrong-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-wrong-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  border-left: 3px solid #dc2626;
}

.history-wrong-word {
  font-size: 16px;
  font-weight: 700;
  color: #dc2626;
}

.history-wrong-phonetic {
  font-size: 14px;
  color: #999;
}

.history-wrong-answer {
  font-size: 14px;
  color: #666;
}

.history-wrong-meaning {
  font-size: 14px;
  color: #333;
  flex: 1;
}

.history-sound-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: #eef7f4;
  color: #0c514b;
  cursor: pointer;
  padding: 0;
}

.history-sound-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.history-sound-btn:hover {
  background: #d4e8e1;
}

.history-record-footer {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

:global(.error-dialog .el-dialog__body) {
  padding: 24px 24px 16px;
}

:global(.error-dialog .el-dialog__footer) {
  padding: 16px 24px 24px;
  border-top: 0;
}

.error-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-answer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff5f5;
  border-radius: 8px;
}

.error-label {
  color: #999;
  font-size: 14px;
}

.error-text {
  color: #dc2626;
  font-size: 18px;
  font-weight: 800;
}

.correct-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.correct-word-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.correct-word {
  color: #19a974;
  font-size: 32px;
  font-weight: 800;
}

.error-sound-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid #b8d6cb;
  border-radius: 50%;
  background: #eef7f4;
  color: #0c514b;
  cursor: pointer;
  transition: all 0.2s;
}

.error-sound-btn:hover {
  background: #19a974;
}

.error-sound-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.error-sound-btn:hover svg {
  fill: #fff;
}

.correct-phonetic {
  color: #666;
  font-size: 16px;
}

.correct-meaning {
  color: #333;
  font-size: 16px;
  line-height: 1.6;
}

.error-footer {
  display: flex;
  justify-content: flex-end;
}

.correct-toast {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 48px;
  background: rgba(25, 169, 116, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(25, 169, 116, 0.4);
  animation: toastFadeIn 0.2s ease-out;
  z-index: 1000;
}

.correct-toast-icon {
  font-size: 48px;
  color: #fff;
  margin-bottom: 8px;
}

.correct-toast-text {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
}

@keyframes toastFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }

  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@media (max-width: 720px) {

  .test-title-wrap,
  .result-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .test-control,
  .test-count {
    width: 100%;
  }

  .answer-row {
    flex-direction: column;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
