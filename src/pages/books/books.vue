<template>
  <div class="main-page">
    <TopBar :hidden="isToolbarHidden" :column-toggle-label="columnToggleLabel" :show-back="true"
      @go-vocabulary="goVocabulary" @go-setting="goSetting" @go-back="goBack"
      @cycle-column-visibility="cycleColumnVisibility" @hide="isToolbarHidden = true" />

    <div class="main-workspace">
      <Menu :hidden="isProjectColumnHidden" :width="projectPanelWidth" />

      <div v-if="!isProjectColumnHidden && !isIndexColumnHidden" class="resize-handle-project"
        @mousedown="startResizeProject">
        <div class="resize-bar"></div>
      </div>

      <MenuSub v-model:page-input-val="pageInputVal" :hidden="isIndexColumnHidden" :width="sidebarWidth"
        :is-default-book="projectsStore.activeProjectId === 'default-book'" :book="bookStore.book"
        :current-index="bookStore.currentIndex" @go-to-page="goToPage" @select-page="selectPage" />

      <div v-if="!isIndexColumnHidden && !isPreviewColumnHidden" class="resize-handle-left"
        @mousedown="startResizeLeft">
        <div class="resize-bar"></div>
      </div>

      <Body :hidden="isPreviewColumnHidden" :flex="centerFlex" :current-page="currentPage"
        :display-groups="displayGroups" :is-trans-project="isTransProject" :is-user-project-page="isUserProjectPage"
        :is-ocr-parsing="isOcrParsing" :ocr-message="ocrMessage" :ordered-line="orderedLine"
        @parse-current-image-ocr="parseCurrentImageOcr" />

      <div v-if="!isPreviewColumnHidden" class="resize-handle-right" @mousedown="startResizeRight">
        <div class="resize-bar"></div>
      </div>

      <BodyParse ref="bodyParseRef" :flex="rightFlex" :is-toolbar-hidden="isToolbarHidden" :current-page="currentPage"
        :page-count="bookStore.book?.pages?.length || 0" :current-index="bookStore.currentIndex"
        :body-font-size="bodyFontSize" :display-groups="displayGroups" :is-trans-project="isTransProject"
        :word-popup="wordPopup" :ordered-line="orderedLine" :tokenize="tokenize" :is-readable="isReadable"
        :should-add-space="shouldAddSpace" :is-heading="isHeading" @show-toolbar="isToolbarHidden = false"
        @prev-page="prevPage" @next-page="nextPage" @read-current-page="readCurrentPage" @stop="handleStop"
        @speak-en="speak($event, 'en-US')" @speak-zh="speakChinese($event)" @word-click="onWordClick"
        @first-lang-edit="onFirstLangEdit" @chinese-edit="onChineseEdit" @translate-word="translateWord"
        @add-word="addWordToVocabulary" @close-popup="closePopup" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useBookStore } from '../../stores/book.js'
import { useProjectsStore } from '../../stores/projects.js'
import { useVocabularyStore } from '../../stores/vocabulary.js'
import { useSettingsStore } from '../../stores/settings.js'
import { speak, stopSpeech, speakEnglishQueue, speakChinese, setSpeechConfig } from '../../api/voice/index.js'
import { translateWithIciba } from '../../api/voice/iciba.js'
import { md5 } from '../../api/voice/youdao.js'
import { recognizeText } from '../../utils/ocr.js'
import {
  isTranslationProject,
  displayLineOrder,
} from '../../utils/translation.js'
import TopBar from '../../components/book/TopBar.vue'
import Menu from '../../components/book/Menu.vue'
import MenuSub from '../../components/book/MenuSub.vue'
import Body from '../../components/book/Body.vue'
import BodyParse from '../../components/book/BodyParse.vue'

const bookStore = useBookStore()
const projectsStore = useProjectsStore()
const vocabularyStore = useVocabularyStore()
const settingsStore = useSettingsStore()
const route = useRoute()
const router = useRouter()

function normalizeBodyFontSize(size) {
  return Math.min(Math.max(Number(size) || 18, 14), 60)
}

const bodyFontSize = ref(18)

function goSetting() {
  router.push('/books/setting')
}

function goBack() {
  // 优先返回上一级；若历史栈为空（首次打开或直接通过 URL 进入）则 fallback 到首页
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/home')
  }
}

function goVocabulary() {
  router.push('/vocabulary')
}

// ============ 页面数据 ============

const pageInputVal = ref(1)
const bodyParseRef = ref(null)
const hiddenColumnStep = ref(0)
const isToolbarHidden = ref(false)

const isProjectColumnHidden = computed(() => hiddenColumnStep.value >= 1)
const isIndexColumnHidden = computed(() => hiddenColumnStep.value >= 2)
const isPreviewColumnHidden = computed(() => hiddenColumnStep.value >= 3)
const columnToggleLabel = computed(() => {
  const labels = ['隐藏第1栏', '隐藏第1,2栏', '隐藏第1,2,3栏', '显示全部栏']
  return labels[hiddenColumnStep.value] || labels[0]
})

function cycleColumnVisibility() {
  hiddenColumnStep.value = (hiddenColumnStep.value + 1) % 4
}

const currentPage = computed(() => {
  return bookStore.book?.pages?.[bookStore.currentIndex] || null
})

const displayGroups = computed(() => {
  const page = currentPage.value
  if (!page?.lines?.length) return []
  return bookStore.groupLines(page.lines)
})

// ============ 翻译类型：当前项目类型 & 辅助 ============
const activeProjectType = computed(() => {
  const project = projectsStore.getActiveProject()
  return project?.type || 'default'
})
const isTransProject = computed(() => isTranslationProject(activeProjectType.value))

/** 取一行的显示顺序 [第一文本, 第一语言, 第二文本, 第二语言] */
function orderedLine(groupOrLine) {
  const line = groupOrLine?.sourceLines?.length
    ? { en: groupOrLine.en, zh: groupOrLine.zh }
    : (groupOrLine || {})
  return displayLineOrder(activeProjectType.value, line)
}

async function syncActiveProject(projectId = projectsStore.activeProjectId) {
  const project = projectsStore.projects.find(p => p.id === projectId) || projectsStore.getActiveProject()
  stopSpeech()
  closePopup()
  isOcrParsing.value = false

  if (!project || project.id === 'default-book') {
    await bookStore.loadBook()
    bookStore.currentIndex = 0
    pageInputVal.value = 1
    scrollContentToTop()
    return
  }

  if (project.parsedData?.pages?.length) {
    bookStore.book = bookStore.normalizeBook(project.parsedData)
    bookStore.currentIndex = 0
    pageInputVal.value = 1
    scrollContentToTop()
    return
  }

  if (project.type === 'image' && project.files?.length) {
    const imageBook = {
      title: project.name,
      pages: project.files.map((file, index) => ({
        page: index + 1,
        image: file.path || file.dataUrl || '',
        lines: file.lines || [],
        parsed: !!file.lines?.length
      }))
    }
    bookStore.book = bookStore.normalizeBook(imageBook)
  } else {
    bookStore.book = null
  }
  bookStore.currentIndex = 0
  pageInputVal.value = 1
  scrollContentToTop()
}

async function syncProjectFromRoute(index = route.params.index) {
  const routeIndex = String(index || '001').padStart(3, '0')
  const project = projectsStore.projects.find(item => item.index === routeIndex)

  if (!project) {
    await router.replace('/books/001')
    return
  }

  if (projectsStore.activeProjectId !== project.id) {
    projectsStore.setActiveProject(project.id)
  }

  await syncActiveProject(project.id)
}

async function saveBookToProject() {
  const project = projectsStore.getActiveProject()
  if (!project || project.id === 'default-book' || !bookStore.book) return

  await projectsStore.updateProject(project.id, {
    parsedData: {
      title: bookStore.book.title,
      pages: bookStore.book.pages
    },
    pageCount: bookStore.book.pages?.length || 0,
    status: bookStore.book.pages?.length ? 'ready' : 'empty'
  })
}

watch(() => [bookStore.book, bookStore.currentIndex], async () => {
  if (bookStore.book) {
    await saveBookToProject()
  }
}, { deep: true })

// ============ 用户项目 OCR ============

const isUserProjectPage = computed(() => {
  return projectsStore.activeProjectId !== 'default-book' && !!currentPage.value?.image
})

const isOcrParsing = ref(false)
const ocrMessage = ref('')

function cleanupOcrLine(line) {
  return String(line || '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([("])\s+/g, '$1')
    .replace(/\s+([)”"'])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function lineHasChinese(text) {
  return /[\u4e00-\u9fff]/.test(text)
}

function lineLooksLikeOcrTitle(text, index) {
  const value = cleanupOcrLine(text)
  if (index > 1 || !value) return false
  if (/[.!?。！？]$/.test(value)) return false
  const words = value.match(/[A-Za-z0-9]+/g) || []
  const chineseCount = (value.match(/[\u4e00-\u9fff]/g) || []).length
  return value.length <= 48 && (words.length <= 8 || chineseCount <= 16)
}

function lineEndsSentence(text) {
  return /[.!?。！？]["'”’)]?$/.test(cleanupOcrLine(text))
}

function shouldStartNewOcrParagraph(currentText, nextLine) {
  const next = cleanupOcrLine(nextLine)
  if (!next) return false
  if (!lineEndsSentence(currentText)) return false
  if (lineHasChinese(currentText) || lineHasChinese(next)) return true
  if (cleanupOcrLine(currentText).length > 120 && /^(more|nowadays|today|however|therefore|finally|first|second|third)\b/i.test(next)) return true
  return false
}

function normalizeTesseractParagraph(paragraph, paragraphIndex) {
  const lines = String(paragraph || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => cleanupOcrLine(line))
    .filter(Boolean)

  if (!lines.length) return []
  if (lineLooksLikeOcrTitle(lines[0], paragraphIndex)) {
    const body = cleanupOcrLine(lines.slice(1).join(' '))
    return body ? [lines[0], body] : [lines[0]]
  }

  return [cleanupOcrLine(lines.join(' '))]
}

function splitOcrTextIntoParagraphs(text, tesseractParagraphs = []) {
  const paragraphsFromOcr = (Array.isArray(tesseractParagraphs) ? tesseractParagraphs : [])
    .flatMap((paragraph, index) => normalizeTesseractParagraph(paragraph, index))
    .filter(Boolean)

  if (paragraphsFromOcr.length > 0) {
    return paragraphsFromOcr
  }

  const rawLines = String(text || '').replace(/\r/g, '').split('\n')
  const paragraphs = []
  let current = ''

  function pushCurrent() {
    const value = cleanupOcrLine(current)
    if (value) paragraphs.push(value)
    current = ''
  }

  rawLines.forEach((rawLine, index) => {
    const line = cleanupOcrLine(rawLine)
    if (!line) {
      pushCurrent()
      return
    }

    if (lineLooksLikeOcrTitle(line, index)) {
      pushCurrent()
      paragraphs.push(line)
      return
    }

    if (!current) {
      current = line
      return
    }

    if (shouldStartNewOcrParagraph(current, line)) {
      pushCurrent()
      current = line
      return
    }

    current = `${current} ${line}`
  })

  pushCurrent()
  return paragraphs
}

function ocrParagraphsToLines(text, tesseractParagraphs = []) {
  return splitOcrTextIntoParagraphs(text, tesseractParagraphs).map(paragraph => {
    const zh = (paragraph.match(/[\u4e00-\u9fff]/g) || []).length
    const en = (paragraph.match(/[a-zA-Z]/g) || []).length
    return zh > en
      ? { en: '', zh: paragraph, breakAfter: true }
      : { en: paragraph, zh: '', breakAfter: true }
  })
}

async function translateOcrLines(lines) {
  const englishLines = lines.filter(line => line.en?.trim() && !line.zh?.trim())
  if (!englishLines.length) return lines

  const translations = await translateWithIciba(
    englishLines.map(line => line.en),
    'en',
    'zh',
    md5
  )

  englishLines.forEach((line, index) => {
    const translated = String(translations[index] || '').trim()
    if (translated) line.zh = translated
  })
  return lines
}

async function parseCurrentImageOcr() {
  const page = currentPage.value
  if (!page?.image) return

  isOcrParsing.value = true
  ocrMessage.value = '识别中...'
  try {
    const ocrResult = await recognizeText(page.image)
    const lines = ocrParagraphsToLines(ocrResult.text, ocrResult.paragraphs)
    ocrMessage.value = '翻译中...'
    await translateOcrLines(lines)

    // 更新 bookStore 中当前页的 lines
    if (bookStore.book?.pages?.[bookStore.currentIndex]) {
      bookStore.book.pages[bookStore.currentIndex] = {
        ...bookStore.book.pages[bookStore.currentIndex],
        lines
      }
    }

    // 同步更新 projectsStore 中的 parsedData
    const project = projectsStore.getActiveProject()
    if (project) {
      const parsedData = project.parsedData?.pages?.length
        ? project.parsedData
        : bookStore.book
      const nextPages = (parsedData?.pages || []).map((item, index) => (
        index === bookStore.currentIndex
          ? { ...item, lines, parsed: true }
          : item
      ))
      projectsStore.updateProject(project.id, {
        parsedData: {
          title: parsedData?.title || project.name,
          pages: nextPages
        },
        status: 'ready',
        pageCount: nextPages.length
      })
      const updatedProject = projectsStore.getActiveProject()
      if (updatedProject?.parsedData) {
        bookStore.book = bookStore.normalizeBook(updatedProject.parsedData)
      }
    }

    const updatedProject = projectsStore.getActiveProject()
    if (updatedProject?.files?.[bookStore.currentIndex]) {
      const files = updatedProject.files.map((file, index) => (
        index === bookStore.currentIndex
          ? { ...file, lines }
          : file
      ))
      projectsStore.updateProject(updatedProject.id, { files })
    }

    // 保存解析结果到后端
    try {
      if (updatedProject?.index) {
        await fetch('/api/parse/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: updatedProject.index, result: bookStore.book })
        })
      }
    } catch (e) { /* ignore */ }

    ElMessage.success('OCR 识别和翻译完成')
  } catch (error) {
    ElMessage.error('OCR 识别/翻译失败: ' + error.message)
  } finally {
    isOcrParsing.value = false
    ocrMessage.value = ''
  }
}

// ============ 页面导航 ============

function selectPage(index) {
  bookStore.currentIndex = index
  pageInputVal.value = index + 1
  scrollContentToTop()
}

function goToPage(val) {
  if (val == null || !Number.isFinite(val)) return
  const idx = Math.min(Math.max(val - 1, 0), (bookStore.book?.pages?.length || 1) - 1)
  selectPage(idx)
}

function prevPage() {
  if (bookStore.currentIndex > 0) {
    bookStore.currentIndex--
    pageInputVal.value = bookStore.currentIndex + 1
    scrollContentToTop()
  }
}

function nextPage() {
  if (bookStore.currentIndex < (bookStore.book?.pages?.length || 1) - 1) {
    bookStore.currentIndex++
    pageInputVal.value = bookStore.currentIndex + 1
    scrollContentToTop()
  }
}

function scrollContentToTop() {
  bodyParseRef.value?.scrollToTop()
}

// ============ 朗读 ============

function readCurrentPage() {
  const page = currentPage.value
  if (!page) return
  // 需求 #3：顶部「朗读」按钮只播放英文，不播放中文
  const items = displayGroups.value
    .map(g => String(g?.en || '').trim())
    .filter(Boolean)
  if (!items.length) {
    ElMessage.warning('当前页没有可朗读的英文内容')
    return
  }
  speakEnglishQueue(items)
}

function handleStop() {
  stopSpeech()
}

// ============ 分词与辅助函数 ============

function tokenize(text) {
  return bookStore.tokenize(text)
}

function isReadable(part) {
  return /[A-Za-z0-9]/.test(part)
}

function shouldAddSpace(text, tokenIndex) {
  if (tokenIndex <= 0) return false
  const tokens = tokenize(text)
  if (tokenIndex >= tokens.length) return false
  const part = tokens[tokenIndex]
  const prev = tokens[tokenIndex - 1]
  return isReadable(part) && !/["'\u201C\u201D\u2018\u2019(]/.test(prev)
}

function isHeading(text) {
  const value = String(text || '').trim()
  return value.length <= 34 && !/[.!?。！？]$/.test(value)
}

// ============ 中文编辑 / 通用编辑 ============

function onChineseEdit(event, group) {
  const text = event.target.innerText.trim()
  if (group.sourceLines.length === 1) {
    group.sourceLines[0].zh = text
  } else {
    group.sourceLines.forEach((line, i) => {
      line.zh = i === 0 ? text : ''
    })
  }
  bookStore.saveEdits()
  saveBookToProject()
}

/**
 * 通用编辑回调：翻译类型项目中，用户可能编辑中文或英文的任意一边
 * @param {Event} event
 * @param {Object} group  displayGroup 对象（含 .sourceLines / .en / .zh）
 * @param {'en'|'zh'} field  被编辑的字段
 */
function onFirstLangEdit(event, group, field) {
  const text = event.target.innerText.trim()
  if (!field) return
  if (group.sourceLines.length === 1) {
    group.sourceLines[0][field] = text
  } else {
    group.sourceLines.forEach((line, i) => {
      line[field] = i === 0 ? text : ''
    })
  }
  bookStore.saveEdits()
  saveBookToProject()
}

// ============ 单词弹窗 ============

const wordPopup = reactive({
  visible: false,
  word: '',
  phonetic: '',
  meaning: '',
  style: {},
  translating: false,
  _anchorRect: null
})

const COMMON_PHONETICS = {
  side: '/saɪd/'
}

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
  wordPopup.phonetic = normalizePhonetic(bookStore.lookupWordPhonetic?.(cleanWord) || COMMON_PHONETICS[cleanWord.toLowerCase()])
  wordPopup.meaning = bookStore.lookupWord(cleanWord)
  wordPopup.translating = false
  wordPopup.visible = true

  // 计算位置（在 nextTick 后）
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

  // 自动播放发音
  speak(cleanWord, 'en-US')

  // 自动翻译未翻译的词
  if (wordPopup.meaning === bookStore.WORD_FALLBACK_MEANING) {
    translateWord()
  }
}

function closePopup() {
  wordPopup.visible = false
}

async function translateWord() {
  const word = wordPopup.word
  if (!word) return
  wordPopup.translating = true
  wordPopup.meaning = '正在查询中文释义...'

  try {
    const settings = settingsStore.voiceProvider || 'youdao'
    const translated = await bookStore.translateWordToChinese(word, settings)
    const meaning = typeof translated === 'string' ? translated : translated?.meaning
    const phonetic = typeof translated === 'object' ? translated?.phonetic : ''
    if (!meaning) throw new Error('empty translation')
    bookStore.saveWordMeaning(word, meaning, phonetic)
    wordPopup.meaning = meaning
    wordPopup.phonetic = normalizePhonetic(phonetic || wordPopup.phonetic || COMMON_PHONETICS[word.toLowerCase()])
  } catch {
    wordPopup.meaning = '翻译失败。请确认已通过本地服务打开页面，或稍后再试。'
  } finally {
    wordPopup.translating = false
  }
}

function isUsableMeaning(meaning) {
  const value = String(meaning || '').trim()
  return value
    && value !== bookStore.WORD_FALLBACK_MEANING
    && !value.startsWith('正在')
    && !value.startsWith('翻译失败')
}

async function addWordToVocabulary() {
  const word = wordPopup.word
  if (!word) return

  if (!isUsableMeaning(wordPopup.meaning)) {
    await translateWord()
  }

  vocabularyStore.addWord({
    word,
    phonetic: wordPopup.phonetic,
    meaning: isUsableMeaning(wordPopup.meaning) ? wordPopup.meaning : ''
  }, 'default')
  ElMessage.success(`已加入生词本：${word}`)
}

// 点击弹窗外关闭
function handleClickOutside(e) {
  if (wordPopup.visible && !e.target.closest('.word-popup') && !e.target.closest('.word')) {
    closePopup()
  }
}

function refreshBodyFontSize() {
  bodyFontSize.value = settingsStore.bodyFontSize
}

// ============ 拖拽调整宽度 ============

const projectPanelWidth = ref(220)
const sidebarWidth = ref(200)
const centerFlex = ref(1)
const rightFlex = ref(1)

let isResizingProject = false
let isResizingLeft = false
let isResizingRight = false
let startX = 0
let startProjectWidth = 0
let startSidebarWidth = 0
let startCenterFlex = 0
let startRightFlex = 0

function startResizeProject(e) {
  isResizingProject = true
  startX = e.clientX
  startProjectWidth = projectPanelWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function startResizeLeft(e) {
  isResizingLeft = true
  startX = e.clientX
  startSidebarWidth = sidebarWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function startResizeRight(e) {
  isResizingRight = true
  startX = e.clientX
  startCenterFlex = centerFlex.value
  startRightFlex = rightFlex.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleMouseMove(e) {
  if (isResizingProject) {
    const diff = e.clientX - startX
    const newWidth = Math.max(160, Math.min(350, startProjectWidth + diff))
    projectPanelWidth.value = newWidth
  }
  if (isResizingLeft) {
    const diff = e.clientX - startX
    const newWidth = Math.max(120, Math.min(400, startSidebarWidth + diff))
    sidebarWidth.value = newWidth
  }
  if (isResizingRight) {
    const containerWidth = window.innerWidth - projectPanelWidth.value - sidebarWidth.value - 12 // 12 = 三根分隔条宽度
    const diff = e.clientX - startX
    const totalFlex = startCenterFlex + startRightFlex
    const ratio = diff / containerWidth * totalFlex
    centerFlex.value = Math.max(0.2, startCenterFlex + ratio)
    rightFlex.value = Math.max(0.2, startRightFlex - ratio)
  }
}

function handleMouseUp() {
  isResizingProject = false
  isResizingLeft = false
  isResizingRight = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// ============ 键盘事件 ============

function handleKeydown(e) {
  if (e.key === 'Escape') closePopup()
}

// ============ 生命周期 ============

onMounted(async () => {
  await settingsStore.load()
  setSpeechConfig(settingsStore.speechRate, settingsStore.voiceProvider)
  bodyFontSize.value = settingsStore.bodyFontSize
  await projectsStore.loadProjects()
  await syncProjectFromRoute()
  pageInputVal.value = bookStore.currentIndex + 1
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('focus', refreshBodyFontSize)
  window.addEventListener('storage', refreshBodyFontSize)
})

watch(() => route.params.index, (index) => {
  syncProjectFromRoute(index)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('focus', refreshBodyFontSize)
  window.removeEventListener('storage', refreshBodyFontSize)
  stopSpeech()
})
</script>

<style>
.main-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #eef4f1 0%, #f8f7f2 48%, #edf1f8 100%);
}

.top-toolbar {
  flex-shrink: 0;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 14px;
  border-bottom: 1px solid #d7dfdc;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(18px);
}

.top-toolbar :deep(.el-button) {
  margin-left: 0;
}

.top-toolbar-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.top-toolbar-spacer {
  flex: 1;
}

.main-workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  width: 100%;
  overflow: hidden;
}

/* ============ 项目面板 ============ */
.project-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-right: 1px solid #d7dfdc;
}

/* ============ 项目栏分隔条 ============ */
.resize-handle-project {
  flex-shrink: 0;
  width: 4px;
  cursor: col-resize;
  position: relative;
  background: transparent;
  z-index: 5;
  transition: background 0.2s;
}

.resize-handle-project:hover,
.resize-handle-project:active {
  background: rgba(18, 107, 98, 0.2);
}

/* ============ 详情面板（第二列 - 用户项目） ============ */
.detail-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-right: 1px solid #d7dfdc;
}

/* ============ 原有侧边栏（第二列 - 默认书籍） ============ */
.sidebar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 16px 16px 24px;
  border-right: 1px solid #d7dfdc;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(18px);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.brand-title {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  color: #16201f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.field {
  margin-bottom: 12px;
  font-size: 12px;
  color: #63706d;
}

.field>span {
  display: block;
  margin-bottom: 4px;
}

.page-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 2px 24px 0;
}

.page-list::-webkit-scrollbar {
  width: 4px;
}

.page-list::-webkit-scrollbar-thumb {
  background: #c9d5d1;
  border-radius: 2px;
}

.page-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 8px;
  border: 1px solid #d7dfdc;
  border-radius: 6px;
  background: #fff;
  color: #63706d;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.page-link:hover {
  border-color: #126b62;
  color: #126b62;
}

.page-link.active {
  border-color: #126b62;
  color: #0c514b;
  background: #e8f2ef;
  font-weight: 600;
}

/* ============ 拖拽分隔条 ============ */
.resize-handle-left,
.resize-handle-right {
  flex-shrink: 0;
  width: 4px;
  cursor: col-resize;
  position: relative;
  background: transparent;
  z-index: 5;
  transition: background 0.2s;
}

.resize-handle-left:hover,
.resize-handle-right:hover,
.resize-handle-left:active,
.resize-handle-right:active {
  background: rgba(18, 107, 98, 0.2);
}

.resize-bar {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 40px;
  background: #c9d5d1;
  border-radius: 1px;
  transition: height 0.2s;
}

.resize-handle-project:hover .resize-bar,
.resize-handle-left:hover .resize-bar,
.resize-handle-right:hover .resize-bar,
.resize-handle-project:active .resize-bar,
.resize-handle-left:active .resize-bar,
.resize-handle-right:active .resize-bar {
  height: 60px;
  background: #126b62;
}

/* ============ 中间面板 ============ */
.panel-center {
  overflow: auto;
  padding: 16px;
  min-width: 0;
}

.panel-center::-webkit-scrollbar {
  width: 6px;
}

.panel-center::-webkit-scrollbar-thumb {
  background: #c9d5d1;
  border-radius: 3px;
}

.image-panel {
  max-height: calc(100vh - 32px);
  overflow: hidden;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.12);
}

.image-panel img {
  display: block;
  width: 100%;
  max-height: calc(100vh - 118px);
  object-fit: contain;
}

.image-ocr-action {
  display: flex;
  justify-content: center;
  padding: 8px 0;
  background: rgba(255, 255, 255, 0.9);
  border-top: 1px solid #e3e9e6;
}

.page-text-center {
  padding: 20px;
  background: #fff;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.12);
}

.study-header-center {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e3e9e6;
  color: #63706d;
  font-size: 13px;
}

.study-header-center strong {
  color: #0c514b;
  font-size: 16px;
}

.text-block {
  margin-bottom: 16px;
}

.text-en {
  margin: 0 0 6px;
  font-family: "Comic Sans MS", "Trebuchet MS", ui-rounded, system-ui, sans-serif;
  font-size: 18px;
  font-weight: 650;
  color: #101919;
  line-height: 1.78;
}

.text-zh {
  margin: 0;
  font-family: "Kaiti SC", "STKaiti", "KaiTi", "Songti SC", serif;
  font-size: 16px;
  color: #17211f;
  line-height: 1.72;
}

.empty-state {
  padding: 24px;
  color: #63706d;
  text-align: center;
  line-height: 1.7;
}

/* ============ 右侧朗读面板 ============ */
.panel-right {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  padding: 16px 16px 16px 8px;
}

.reader-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 8px;
  border: 1px solid #d7dfdc;
}

.reader-header-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
  color: #63706d;
  font-size: 13px;
}

.reader-header-info strong {
  color: #0c514b;
  font-size: 16px;
}

.reader-actions {
  display: flex;
  gap: 6px;
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  background: #fffdfa;
  border: 1px solid #cdd9d4;
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.12);
}

.page-content::-webkit-scrollbar {
  width: 6px;
}

.page-content::-webkit-scrollbar-thumb {
  background: #c9d5d1;
  border-radius: 3px;
}

/* ============ 学习块 ============ */
.study-block {
  position: relative;
  padding: 0 0 22px 0;
}

.heading-block {
  padding-bottom: 16px;
}

.study-block+.study-block {
  padding-top: 2px;
}

/* 旧 study-actions 列布局已废弃（按钮已嵌入对应语言的行内） */
.study-actions {
  display: none;
}

/* 编号：absolute 固定在左上角 */
.study-number {
  position: absolute;
  top: calc(var(--reader-body-font-size, 18px) * 0.28);
  left: 0;
  width: calc(var(--reader-body-font-size, 18px) * 1.55);
  text-align: center;
  color: #8c9996;
  font-size: clamp(11px, calc(var(--reader-body-font-size, 18px) * 0.62), 24px);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  z-index: 1;
  pointer-events: none;
}

/* 每种语言自成一行：左侧播放按钮 + 右侧文本，首行自然对齐 */
.study-lang-row {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: calc(var(--reader-body-font-size, 18px) * 0.46);
  padding-left: calc(var(--reader-body-font-size, 18px) * 1.78);
  margin-bottom: calc(var(--reader-body-font-size, 18px) * 0.44);
  box-sizing: border-box;
  width: 100%;
}

.study-lang-row:last-child {
  margin-bottom: 0;
}

.study-lang-row>.mini-play {
  flex-shrink: 0;
  margin-top: calc(var(--reader-body-font-size, 18px) * 0.28);
}

.study-lang-row>.english,
.study-lang-row>.chinese {
  flex: 1;
  min-width: 0;
  margin: 0 !important;
  /* 覆盖 .english/.chinese 自带的 margin-bottom:6px / 10px */
}

.mini-play {
  display: grid;
  place-items: center;
  width: clamp(26px, calc(var(--reader-body-font-size, 18px) * 1.45), 54px);
  height: clamp(26px, calc(var(--reader-body-font-size, 18px) * 1.45), 54px);
  border: 1px solid #c9d5d1;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  color: inherit;
}

.mini-play.en {
  color: #0c514b;
  background: #eef7f4;
  border-color: #b8d6cb;
}

.mini-play.en:hover {
  background: #d4ede5;
  border-color: #126b62;
}

.mini-play.zh {
  color: #8a4b12;
  background: #fff2e3;
  border-color: #f1c99c;
}

.mini-play.zh:hover {
  background: #ffd9ab;
  border-color: #d8872f;
}

.mini-play svg {
  width: clamp(12px, calc(var(--reader-body-font-size, 18px) * 0.68), 26px);
  height: clamp(12px, calc(var(--reader-body-font-size, 18px) * 0.68), 26px);
  fill: currentColor;
}

.english {
  display: block;
  margin: 0 0 6px;
  color: #101919;
  font-family: "Comic Sans MS", "Trebuchet MS", ui-rounded, system-ui, sans-serif;
  font-size: var(--reader-body-font-size, 18px);
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.78;
}

.paragraph-text {
  white-space: normal;
}

.lesson-title {
  margin-bottom: 6px;
  color: #d34b1f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: var(--reader-title-font-size, 30px);
  font-weight: 800;
  line-height: 1.15;
}

.word {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  border: 0;
  border-radius: 4px;
  padding: 0 2px;
  color: inherit;
  background: transparent;
  cursor: default;
  font: inherit;
  transition: background 0.1s;
}

.word.readable {
  cursor: pointer;
}

.word.readable:hover {
  background: #e9f0ff;
  color: #1d4d8f;
}

.word.readable:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.space {
  display: inline-block;
  width: calc(var(--reader-body-font-size, 18px) * 0.3);
}

.chinese {
  min-height: 26px;
  margin: 0 0 6px;
  color: #17211f;
  font-family: "Kaiti SC", "STKaiti", "KaiTi", "Songti SC", serif;
  font-size: var(--reader-body-font-size, 18px);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.72;
  white-space: pre-wrap;
  outline: none;
  border: 1px dashed transparent;
  border-radius: 4px;
  padding: 2px 4px;
  transition: border-color 0.2s;
}

.chinese:focus {
  border-color: #126b62;
}

.chinese:empty::before {
  color: #98a5a2;
  content: attr(data-placeholder);
}

/* ============ 翻译类型项目：中文原文样式 ============ */
.chinese-first {
  margin: 0 0 10px;
  font-size: calc(var(--reader-body-font-size, 18px) + 1px);
  font-weight: 700;
  border-bottom: 1px dashed #e3e9e6;
  padding-bottom: 8px;
  margin-bottom: 10px;
}

/* ============ 响应式 ============ */
@media (max-width: 920px) {
  .main-workspace {
    flex-direction: column;
    overflow-y: auto;
  }

  .top-toolbar {
    height: 38px;
    padding: 0 12px;
  }

  .project-panel {
    height: auto;
    max-height: 180px;
    width: 100% !important;
    border-right: none;
    border-bottom: 1px solid #d7dfdc;
  }

  .detail-panel,
  .sidebar {
    height: auto;
    max-height: 200px;
    width: 100% !important;
    border-right: none;
    border-bottom: 1px solid #d7dfdc;
  }

  .panel-center,
  .panel-right {
    flex: none !important;
  }

  .resize-handle-project,
  .resize-handle-left,
  .resize-handle-right {
    display: none;
  }
}
</style>
