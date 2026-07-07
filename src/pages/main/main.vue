<template>
  <div class="main-page">
    <header v-if="!isToolbarHidden" class="top-toolbar">
      <div class="top-toolbar-spacer"></div>
      <el-button text size="large" :icon="Setting" @click="goSetting">设置</el-button>
      <el-button size="small" @click="cycleColumnVisibility">{{ columnToggleLabel }}</el-button>
      <el-button size="small" text @click="isToolbarHidden = true">折叠</el-button>
    </header>

    <div class="main-workspace">
      <!-- 最左侧：项目列表 -->
      <aside v-if="!isProjectColumnHidden" class="project-panel" :style="{ width: projectPanelWidth + 'px' }">
        <ProjectSidebar />
      </aside>

      <!-- 项目栏与页面列表分隔条 -->
      <div v-if="!isProjectColumnHidden && !isIndexColumnHidden" class="resize-handle-project" @mousedown="startResizeProject">
        <div class="resize-bar"></div>
      </div>

      <!-- 第二列：根据项目类型显示不同内容 -->
      <!-- 默认内置书籍 → 原有页面列表 -->
      <aside v-if="!isIndexColumnHidden && projectsStore.activeProjectId === 'default-book'" class="sidebar" :style="{ width: sidebarWidth + 'px' }">
        <div class="sidebar-header">
          <h1 class="brand-title">{{ bookStore.book?.title || '双语逐页朗读器' }}</h1>
        </div>

        <label class="field">
          <span>跳转到页码</span>
          <el-input-number
            v-model="pageInputVal"
            :min="1"
            :max="bookStore.book?.pages?.length || 1"
            size="small"
            @change="goToPage"
            style="width: 100%"
          />
        </label>

        <nav class="page-list" ref="pageListRef">
          <button
            v-for="(page, index) in bookStore.book?.pages"
            :key="page.page"
            type="button"
            class="page-link"
            :class="{ active: index === bookStore.currentIndex }"
            @click="selectPage(index)"
          >
            第 {{ page.page }} 页
          </button>
        </nav>
      </aside>

      <!-- 用户项目 → ProjectDetail（文件上传/解析） -->
      <aside v-else-if="!isIndexColumnHidden" class="detail-panel" :style="{ width: sidebarWidth + 'px' }">
        <ProjectDetail />
      </aside>

      <!-- 左右拖拽分隔条 -->
      <div v-if="!isIndexColumnHidden && !isPreviewColumnHidden" class="resize-handle-left" @mousedown="startResizeLeft">
        <div class="resize-bar"></div>
      </div>

      <!-- 中间：原始图片 -->
      <section v-if="!isPreviewColumnHidden" class="panel-center" :style="{ flex: centerFlex }">
        <div class="image-panel" v-if="currentPage?.image">
          <img :src="currentPage.image" :alt="'第 ' + currentPage.page + ' 页'" />
          <!-- 用户项目的图片页，显示OCR解析按钮 -->
          <div
            v-if="isUserProjectPage"
            class="image-ocr-action"
          >
            <el-button
              type="warning"
              size="small"
              :icon="Aim"
              :loading="isOcrParsing"
              @click="parseCurrentImageOcr"
            >
              {{ isOcrParsing ? ocrMessage : (currentPage?.lines?.length ? '重新 OCR 识别此页' : 'OCR 识别此页') }}
            </el-button>
          </div>
        </div>
        <div class="empty-state" v-else-if="!currentPage?.lines?.length">
          <p>这一页还没有内容。</p>
        </div>
        <div class="page-text-center" v-else>
          <div class="study-header-center">
            <span>第 {{ currentPage.page }} 页</span>
            <strong>原文</strong>
          </div>
          <div v-for="(group, gi) in displayGroups" :key="gi" class="text-block">
            <template v-if="isTransProject">
              <!-- 翻译类型：按 displayLineOrder 渲染两行 -->
              <p :class="orderedLine(group)[1] === 'en' ? 'text-en' : 'text-zh'">{{ orderedLine(group)[0] }}</p>
              <p :class="orderedLine(group)[3] === 'en' ? 'text-en' : 'text-zh'">{{ orderedLine(group)[2] }}</p>
            </template>
            <template v-else>
              <p class="text-en">{{ group.en }}</p>
              <p class="text-zh">{{ group.zh }}</p>
            </template>
          </div>
        </div>
      </section>

      <!-- 中间右分隔条 -->
      <div v-if="!isPreviewColumnHidden" class="resize-handle-right" @mousedown="startResizeRight">
        <div class="resize-bar"></div>
      </div>

      <!-- 右侧：双语对照朗读区 -->
      <section class="panel-right" :style="{ flex: rightFlex }">
      <div class="reader-header">
        <div class="reader-header-info">
          <span>第 {{ currentPage?.page || 0 }} 页 / {{ bookStore.book?.pages?.length || 0 }} 页</span>
        </div>
        <div class="reader-actions">
          <el-button v-if="isToolbarHidden" size="small" @click="isToolbarHidden = false">显示设置栏</el-button>
          <el-button size="small" @click="prevPage" :disabled="bookStore.currentIndex <= 0">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <el-button size="small" type="primary" @click="readCurrentPage" :disabled="!currentPage?.lines?.length">
            <el-icon><VideoPlay /></el-icon> 朗读
          </el-button>
          <el-button size="small" @click="handleStop" type="danger" plain>
            <el-icon><VideoPause /></el-icon> 停止
          </el-button>
          <el-button size="small" @click="nextPage" :disabled="bookStore.currentIndex >= (bookStore.book?.pages?.length || 1) - 1">
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>

      <div class="page-content" ref="contentRef">
        <div v-if="!currentPage" class="empty-state">
          <p>请选择一页开始学习。</p>
        </div>
        <div v-else-if="!currentPage.lines?.length" class="empty-state">
          <p>这一页还没有逐行文本。</p>
        </div>
        <template v-else>
          <section
            v-for="(group, index) in displayGroups"
            :key="index"
            class="study-block"
            :class="{ 'heading-block': index === 0 && isHeading(orderedLine(group)[0]) }"
          >
            <div class="study-actions">
              <span class="study-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <button
                class="mini-play en"
                @click="speak(group.en, 'en-US')"
                :disabled="!String(group?.en || '').trim()"
                title="朗读英文这一段"
              >
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
              </button>
              <button
                class="mini-play zh"
                @click="speak(group.zh, 'zh-CN')"
                :disabled="!String(group?.zh || '').trim()"
                title="朗读中文这一段"
              >
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
              </button>
            </div>

            <!-- 翻译类型：按 orderedLine 顺序渲染两段 -->
            <template v-if="isTransProject">
              <!-- 第一段（原文） -->
              <template v-if="orderedLine(group)[1] === 'en'">
                <p
                  class="english paragraph-text"
                  :class="{ 'lesson-title': index === 0 && isHeading(orderedLine(group)[0]) }"
                >
                  <template v-for="(part, ti) in tokenize(orderedLine(group)[0])" :key="'f-'+ti">
                    <span v-if="shouldAddSpace(orderedLine(group)[0], ti)" class="space"> </span>
                    <button
                      type="button"
                      class="word"
                      :class="{ readable: isReadable(part) }"
                      :disabled="!isReadable(part)"
                      @click.stop="onWordClick($event, part)"
                    >{{ part }}</button>
                  </template>
                </p>
              </template>
              <template v-else>
                <div
                  class="chinese chinese-first"
                  contenteditable="true"
                  :data-placeholder="'在这里补中文对照'"
                  :innerHTML="orderedLine(group)[0]"
                  @input="onFirstLangEdit($event, group, 'zh')"
                ></div>
              </template>

              <!-- 第二段（译文） -->
              <template v-if="orderedLine(group)[3] === 'en'">
                <p
                  class="english paragraph-text"
                >
                  <template v-for="(part, ti) in tokenize(orderedLine(group)[2])" :key="'s-'+ti">
                    <span v-if="shouldAddSpace(orderedLine(group)[2], ti)" class="space"> </span>
                    <button
                      type="button"
                      class="word"
                      :class="{ readable: isReadable(part) }"
                      :disabled="!isReadable(part)"
                      @click.stop="onWordClick($event, part)"
                    >{{ part }}</button>
                  </template>
                </p>
              </template>
              <template v-else>
                <div
                  class="chinese"
                  contenteditable="true"
                  :data-placeholder="'在这里补中文对照'"
                  :innerHTML="orderedLine(group)[2]"
                  @input="onFirstLangEdit($event, group, 'zh')"
                ></div>
              </template>
            </template>

            <!-- 非翻译类型：原有顺序（英文在上，中文在下） -->
            <template v-else>
              <p class="english paragraph-text" :class="{ 'lesson-title': index === 0 && isHeading(group.en) }">
                <template v-for="(part, ti) in tokenize(group.en)" :key="ti">
                  <span v-if="shouldAddSpace(group.en, ti)" class="space"> </span>
                  <button
                    type="button"
                    class="word"
                    :class="{ readable: isReadable(part) }"
                    :disabled="!isReadable(part)"
                    @click.stop="onWordClick($event, part)"
                  >{{ part }}</button>
                </template>
              </p>

              <div
                class="chinese"
                contenteditable="true"
                :data-placeholder="'在这里补中文对照'"
                :innerHTML="group.zh"
                @input="onChineseEdit($event, group)"
              ></div>
            </template>
          </section>
        </template>
      </div>

      <!-- 单词弹窗 -->
      <Teleport to="body">
        <div v-if="wordPopup.visible" class="word-popup" :style="wordPopup.style">
          <div class="word-popup-title">{{ wordPopup.word }}</div>
          <div class="word-popup-meaning">{{ wordPopup.meaning }}</div>
          <div class="word-popup-actions">
            <button class="word-popup-sound" @click.stop="speak(wordPopup.word, 'en-US')">
              <svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path></svg>
              <span>发音</span>
            </button>
            <button class="word-popup-translate" :disabled="wordPopup.translating" @click.stop="translateWord">
              {{ wordPopup.translating ? '翻译中' : '翻译' }}
            </button>
            <button class="word-popup-close" @click="closePopup">关闭</button>
          </div>
        </div>
      </Teleport>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Setting, ArrowLeft, ArrowRight, VideoPlay, VideoPause, Aim } from '@element-plus/icons-vue'
import { useBookStore } from '../../stores/book.js'
import { useProjectsStore } from '../../stores/projects.js'
import { speak, stopSpeech, speakEnglishQueue, speakChineseQueue } from '../../api/voice/index.js'
import { translateWithIciba } from '../../api/voice/iciba.js'
import { md5 } from '../../api/voice/youdao.js'
import { recognizeText } from '../../utils/ocr.js'
import {
  isTranslationProject,
  displayLineOrder,
  translationDirection
} from '../../utils/translation.js'
import ProjectSidebar from '../../components/ProjectSidebar.vue'
import ProjectDetail from '../../components/ProjectDetail.vue'

const bookStore = useBookStore()
const projectsStore = useProjectsStore()
const route = useRoute()
const router = useRouter()

function goSetting() {
  router.push('/setting')
}

// ============ 页面数据 ============

const pageInputVal = ref(1)
const pageListRef = ref(null)
const contentRef = ref(null)
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
    await router.replace('/main/001')
    return
  }

  if (projectsStore.activeProjectId !== project.id) {
    projectsStore.setActiveProject(project.id)
  }

  await syncActiveProject(project.id)
}

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
  if (contentRef.value) contentRef.value.scrollTop = 0
}

// ============ 朗读 ============

function readCurrentPage() {
  const page = currentPage.value
  if (!page) return
  const type = activeProjectType.value
  // 按显示顺序的「第一个」（原文）进行朗读
  const items = displayGroups.value
    .map(g => orderedLine(g)[0])
    .filter(text => String(text || '').trim())
  if (!items.length) {
    ElMessage.warning('当前页没有可朗读的内容')
    return
  }
  if (type === 'translate-zh') {
    // 中文翻译：原文是中文，走中文朗读队列
    speakChineseQueue(items)
  } else {
    speakEnglishQueue(items)
  }
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
}

// ============ 单词弹窗 ============

const wordPopup = reactive({
  visible: false,
  word: '',
  meaning: '',
  style: {},
  translating: false,
  _anchorRect: null
})

function onWordClick(event, word) {
  const cleanWord = String(word || '').trim()
  const rect = event.target.getBoundingClientRect()
  wordPopup._anchorRect = rect
  wordPopup.word = cleanWord
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
    const settings = JSON.parse(localStorage.getItem('bilingual-reader-voice-provider') || '"youdao"')
    const translated = await bookStore.translateWordToChinese(word, settings)
    if (!translated) throw new Error('empty translation')
    bookStore.saveWordMeaning(word, translated)
    wordPopup.meaning = translated
  } catch {
    wordPopup.meaning = '翻译失败。请确认已通过本地服务打开页面，或稍后再试。'
  } finally {
    wordPopup.translating = false
  }
}

// 点击弹窗外关闭
function handleClickOutside(e) {
  if (wordPopup.visible && !e.target.closest('.word-popup') && !e.target.closest('.word')) {
    closePopup()
  }
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
  await syncProjectFromRoute()
  pageInputVal.value = bookStore.currentIndex + 1
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('keydown', handleKeydown)
})

watch(() => route.params.index, (index) => {
  syncProjectFromRoute(index)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('keydown', handleKeydown)
  stopSpeech()
})
</script>

<style scoped>
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

.field > span {
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
  padding: 0 0 22px 32px;
}

.heading-block {
  padding-bottom: 16px;
}

.study-block + .study-block {
  padding-top: 2px;
}

.study-actions {
  position: absolute;
  top: 3px;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 28px;
}

.study-number {
  color: #8c9996;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.mini-play {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
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
  width: 12px;
  height: 12px;
  fill: currentColor;
}

.english {
  display: block;
  margin: 0 0 6px;
  color: #101919;
  font-family: "Comic Sans MS", "Trebuchet MS", ui-rounded, system-ui, sans-serif;
  font-size: 18px;
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
  font-size: 30px;
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
  display: inline;
}

.chinese {
  min-height: 26px;
  margin: 0 0 6px;
  color: #17211f;
  font-family: "Kaiti SC", "STKaiti", "KaiTi", "Songti SC", serif;
  font-size: 18px;
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
  font-size: 19px;
  font-weight: 700;
  border-bottom: 1px dashed #e3e9e6;
  padding-bottom: 8px;
  margin-bottom: 10px;
}

/* ============ 单词弹窗 ============ */
.word-popup {
  position: fixed;
  z-index: 20;
  width: min(280px, calc(100vw - 24px));
  padding: 14px;
  border: 1px solid #bed0ca;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 42px rgba(22, 32, 31, 0.18);
}

.word-popup::before {
  position: absolute;
  top: -7px;
  left: 50%;
  width: 12px;
  height: 12px;
  border-top: 1px solid #bed0ca;
  border-left: 1px solid #bed0ca;
  background: #ffffff;
  content: "";
  transform: translateX(-50%) rotate(45deg);
}

.word-popup-title {
  color: #0f1b19;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.2;
}

.word-popup-meaning {
  margin-top: 8px;
  color: #40504c;
  font-size: 16px;
  line-height: 1.55;
}

.word-popup-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.word-popup-sound,
.word-popup-translate,
.word-popup-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: opacity 0.15s;
}

.word-popup-sound {
  gap: 6px;
  padding: 0 12px;
  border: 1px solid #126b62;
  background: #126b62;
  color: #fff;
}

.word-popup-sound svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.word-popup-translate {
  padding: 0 10px;
  border: 1px solid #bed0ca;
  background: #f2faf7;
  color: #126b62;
  font-weight: 700;
}

.word-popup-translate:disabled {
  cursor: wait;
  opacity: 0.72;
}

.word-popup-close {
  padding: 0 10px;
  border: 1px solid #d7dfdc;
  background: #fff;
  color: #63706d;
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
