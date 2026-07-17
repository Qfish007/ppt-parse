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
            {{ currentWord.meaning || '暂无释义' }}
          </div>
          <div v-else class="sound-prompt">
            <button class="sound-button" @click="playCurrentWord">
              <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"></path>
              </svg>
            </button>
            <span>{{ currentWord.phonetic || '点击播放发音' }}</span>
          </div>
          <div class="answer-row">
            <el-input ref="answerInputRef" v-model="answerText" size="large" class="answer-input" placeholder="输入单词"
              @keyup.enter="submitAnswer" />
            <el-button type="primary" size="large" class="answer-submit" @click="submitAnswer">提交</el-button>
          </div>
        </div>
      </section>

      <section v-else-if="!testQueue.length" class="test-card empty-card">
        请设置筛选条件后开始测试。
      </section>

      <section v-if="testQueue.length" class="test-card result-card">
        <div class="result-head">
          <div>
            <div class="result-label">{{ isFinished ? '测试完成' : '实时结果' }}</div>
            <h3>{{ correctResults.length }} / {{ testQueue.length }}</h3>
          </div>
          <el-button v-if="isFinished" type="primary" @click="restartSameTest">再测一次</el-button>
        </div>

        <div class="result-grid">
          <div class="result-block">
            <h4>正确列表</h4>
            <div v-if="!correctResults.length" class="result-empty">暂无</div>
            <div v-for="(item, index) in correctResults" :key="`ok-${item.word}-${index}`"
              class="result-row is-correct">
              <div class="result-word-line">
                <button class="result-word-button" @click="openWordDetail(item.word)">{{ item.word }}</button>
                <span class="result-stat">{{ resultStatText(item) }}</span>
              </div>
              <span>{{ item.meaning || '暂无释义' }}</span>
            </div>
          </div>
          <div class="result-block">
            <h4>错误列表</h4>
            <div v-if="!wrongResults.length" class="result-empty">暂无</div>
            <div v-for="(item, index) in wrongResults" :key="`wrong-${item.word}-${index}`" class="result-row is-wrong">
              <div class="result-word-line">
                <button class="result-word-button" @click="openWordDetail(item.word)">{{ item.word }}</button>
                <span class="result-stat">{{ resultStatText(item) }}</span>
              </div>
              <span>你的答案：{{ item.answer || '-' }}</span>
              <span>{{ item.meaning || '暂无释义' }}</span>
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
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { speak } from '../../api/voice/index.js'
import { useVocabularyStore } from '../../stores/vocabulary.js'
import { VOCABULARY_LEVELS } from '../../types/index.js'

const router = useRouter()
const vocabularyStore = useVocabularyStore()
const TEST_SESSION_STORAGE_KEY = 'bilingual-reader-vocabulary-test-session'

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

function playCurrentWord() {
  if (currentWord.value?.word) speak(currentWord.value.word, 'en-US')
}

function resultStatText(item) {
  return `${Number(item.testCorrectCount) || 0}/${Number(item.testTotalCount) || 0}`
}

async function goNextQuestion() {
  answerText.value = ''
  currentIndex.value += 1
  if (currentIndex.value >= testQueue.value.length) {
    isFinished.value = true
    saveTestSession()
    return
  }
  saveTestSession()
  await focusAnswer()
  if (testMode.value === 'sound') playCurrentWord()
}

async function submitAnswer() {
  const entry = currentWord.value
  if (!entry) return
  const answer = answerText.value.trim().toLowerCase()
  if (!answer) {
    ElMessage.warning('请输入单词')
    return
  }
  const isCorrect = answer === entry.word
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
  } else {
    wrongResults.value.push(result)
  }
  goNextQuestion()
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
  max-width: 680px;
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
  width: 54px;
  height: 54px;
  border: 1px solid #b8d6cb;
  border-radius: 999px;
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
  /* ---------------- 用户需求：按钮另起一行（单列）+ 水平居中 ---------------- */
  display: grid;
  grid-template-columns: 1fr;
  row-gap: 18px;
  column-gap: 0;
  /* 不对所有项用 justify-items:center，否则 input 宽度会塌陷（撑不满行）。
   * 改由：input 占满整列（默认行为），按钮单独 justify-self:center。*/
}

/* ---------------- 红框 answer-row: 字体 30px（用户需求） ---------------- */
/* 30px 字号同步把 wrapper 高度/内边距调大，避免字母上沿下沿被裁切 */
.answer-input :deep(.el-input__wrapper) {
  font-size: 30px;
  padding: 10px 16px;
  min-height: 56px;
  box-shadow: var(--el-input-border-color, #dcdfe6) 0 0 0 1px inset;
  border-radius: 8px;
}

.answer-input :deep(.el-input__inner) {
  font-size: 30px;
  line-height: 36px;
  height: 36px;
  /* ---------------- 用户需求：输入框内输入的文字水平居中 ---------------- */
  text-align: center;
}

.answer-input :deep(.el-input__inner::placeholder) {
  font-size: 30px;
  color: #a8b1ad;
  /* ---------------- 用户需求：placeholder 文字也水平居中 ---------------- */
  text-align: center;
}

/* 提交按钮字号 30px，同步把高度和内边距调高与 input 对齐（~56px）
 * 注意：answer-submit 类直接绑在 ElButton 的根 button 上（见 DOM classList=el-button..answer-submit）
 *       Vue scoped 的 ".answer-submit :deep(.el-button)" 写的是"子元素匹配"，自己不会是自己的子元素 → 失效
 *       因此这里用 :global(.answer-submit.el-button) 命中根元素自身 */
:global(.answer-submit.el-button) {
  font-size: 30px;
  font-weight: 800;
  padding: 10px 36px;
  min-height: 56px;
  line-height: 36px;
  border-radius: 8px;
  /* ---------------- 用户需求：按钮另起一行，该行内水平居中 ---------------- */
  /* answer-row 是 grid，用 justify-self 把按钮子项在自己的格子里水平居中（input 仍满行，互不影响） */
  justify-self: center;
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.result-label {
  color: #63706d;
  font-size: 13px;
  font-weight: 800;
}

.result-head h3 {
  margin: 4px 0 0;
  color: #16201f;
  font-size: 34px;
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
  justify-content: space-between;
  gap: 10px;
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

  .answer-row,
  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
