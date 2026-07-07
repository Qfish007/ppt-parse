<template>
  <div class="project-detail">
    <!-- 无项目选中时 -->
    <div v-if="!project" class="empty-state">
      <el-icon :size="48" color="#c0c8c5"><Reading /></el-icon>
      <p>请从左侧选择一个项目</p>
    </div>

    <!-- 用户项目 -->
    <template v-else>
      <div class="detail-header">
        <el-icon :size="16" color="#126b62">
          <Document v-if="project.type === 'pdf'" />
          <Picture v-else-if="project.type === 'image'" />
          <DocumentCopy v-else-if="project.type === 'word'" />
          <ChatDotRound v-else-if="project.type === 'translate-en'" />
          <Edit v-else-if="project.type === 'translate-zh'" />
          <Files v-else />
        </el-icon>
        <span class="detail-title">{{ project.name }}</span>
        <span class="detail-type-badge">{{ typeLabel(project.type) }}</span>
      </div>

      <!-- ============ 翻译类型（英文/中文翻译）：录入区 + 页面列表 ============ -->
      <div v-if="isTranslationProject(project.type)" class="upload-section translation-section">
        <!-- 录入区 -->
        <div class="translation-input-card">
          <label class="field-label">{{ project.type === 'translate-en' ? '请输入英文（单词或段落）' : '请输入中文（单词或段落）' }}</label>
          <el-input
            v-model="translationInput"
            type="textarea"
            :autosize="{ minRows: 5, maxRows: 10 }"
            :placeholder="project.type === 'translate-en'
              ? '输入英文内容，点击录入后自动翻译为中文。每次录入相当于一页。'
              : '输入中文内容，点击录入后自动翻译为英文。每次录入相当于一页。'"
            @keyup.ctrl.enter="submitTranslationEntry"
          />
          <div class="translation-input-actions">
            <el-button
              type="primary"
              size="large"
              :icon="Upload"
              :loading="isTranslating"
              @click="submitTranslationEntry"
            >
              {{ isTranslating ? '翻译中...' : '录入（Ctrl+Enter）' }}
            </el-button>
            <span class="translation-hint">提示：每次录入相当于一页，自动写入本地缓存</span>
          </div>
        </div>

        <!-- 页面列表 -->
        <div class="index-header">
          <span>已录入页面</span>
          <strong>{{ pages.length }} 页</strong>
        </div>
        <div v-if="pages.length > 0" class="page-nav translation-page-nav">
          <div
            v-for="(page, idx) in pages"
            :key="page.page || idx"
            class="page-nav-item"
            :class="{ active: bookStore.currentIndex === idx }"
            @click="selectPage(idx)"
          >
            <span>第 {{ idx + 1 }} 页</span>
            <span v-if="page.lines?.length" class="parsed-badge" title="已翻译">✓</span>
          </div>
        </div>
        <div v-else class="empty-index">
          还没有内容，请在上方录入
        </div>
      </div>

      <!-- 图片项目：上传卡片 + 本地图片索引目录常驻显示 -->
      <div v-else-if="project.type === 'image'" class="upload-section image-project-section">
        <div class="upload-card compact">
          <div class="upload-icon">
            <el-icon :size="32" color="#126b62"><Picture /></el-icon>
          </div>
          <h4>上传图片文件</h4>
          <p class="upload-hint">图片会保存到 static/demo{{ project.index }}/images</p>
          <el-button type="primary" :icon="Upload" @click="triggerUpload">
            选择文件
          </el-button>
        </div>

        <div class="index-header">
          <span>索引目录</span>
          <strong>{{ pages.length }} 页</strong>
        </div>
        <div v-if="pages.length > 0" class="page-nav image-page-nav">
          <div
            v-for="(page, idx) in pages"
            :key="page.image || idx"
            class="page-nav-item"
            :class="{ active: bookStore.currentIndex === idx }"
            @click="selectPage(idx)"
          >
            <span>第 {{ idx + 1 }} 页</span>
            <span v-if="page.parsed || page.lines?.length" class="parsed-badge" title="已解析">✓</span>
          </div>
        </div>
        <div v-else class="empty-index">
          还没有图片
        </div>
      </div>

      <!-- PDF/Word：已有页面数据时显示页面列表 -->
      <div v-else-if="pages.length > 0" class="page-nav">
        <div
          v-for="(page, idx) in pages"
          :key="idx"
          class="page-nav-item"
          :class="{ active: bookStore.currentIndex === idx }"
          @click="selectPage(idx)"
        >
          第 {{ idx + 1 }} 页
          <span v-if="page.parsed" class="parsed-badge" title="已解析">✓</span>
        </div>
      </div>

      <!-- PDF/Word 未上传文件：显示上传区域 -->
      <div v-else class="upload-section">
        <!-- 已上传文件列表（仅PDF/Word显示，图片上传后直接生成页面） -->
        <div v-if="project.type !== 'image' && uploadedFiles.length > 0" class="file-list-area">
          <div class="file-list-header">
            <span>已上传文件 ({{ uploadedFiles.length }})</span>
          </div>
          <div class="file-list">
            <div v-for="(file, i) in uploadedFiles" :key="i" class="file-item">
              <el-icon :size="14"><Document /></el-icon>
              <span class="file-name">{{ file.name }}</span>
              <el-icon :size="14" color="#67c23a"><CircleCheck /></el-icon>
            </div>
          </div>
          <!-- PDF/Word：批量识别按钮 -->
          <div class="parse-action">
            <el-button
              type="success"
              size="large"
              :icon="Aim"
              :loading="isParsing"
              @click="startParse"
            >
              开始识别
            </el-button>
          </div>
        </div>

        <!-- 上传卡片 -->
        <div v-if="uploadedFiles.length === 0" class="upload-card">
          <div class="upload-icon">
            <el-icon :size="36" color="#126b62">
              <Upload v-if="project.type === 'pdf'" />
              <Picture v-else-if="project.type === 'image'" />
              <DocumentCopy v-else />
            </el-icon>
          </div>
          <h4>上传{{ typeLabel(project.type) }}文件</h4>
          <p class="upload-hint">
            <template v-if="project.type === 'pdf'">支持 .pdf 格式</template>
            <template v-else-if="project.type === 'image'">支持 JPG / PNG / BMP，可多选</template>
            <template v-else>支持 .docx 格式</template>
          </p>
          <el-button type="primary" :icon="Upload" @click="triggerUpload">
            选择文件
          </el-button>
        </div>
      </div>

      <!-- 解析进度 -->
      <div v-if="isParsing" class="parse-progress-bar">
        <div class="parse-progress-header">
          <el-icon class="is-loading" color="#126b62"><Loading /></el-icon>
          <span>{{ parseMessage }}</span>
        </div>
        <el-progress :percentage="parsePercent" :stroke-width="8" :show-text="true" color="#126b62" />
        <div class="parse-progress-detail">{{ parseCurrent }} / {{ parseTotal }}</div>
      </div>
    </template>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      :accept="acceptTypes"
      :multiple="project?.type === 'image'"
      style="display: none"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Reading, Document, Picture, DocumentCopy,
  Upload, CircleCheck, Aim, Loading, ChatDotRound, Edit, Files
} from '@element-plus/icons-vue'
import { useProjectsStore } from '../stores/projects.js'
import { useBookStore } from '../stores/book.js'
import { parsePDF, pdfResultsToBook } from '../utils/pdfParser.js'
import { parseWord, wordTextToBook } from '../utils/wordParser.js'
import {
  isTranslationProject,
  translationDirection,
  translationTypeLabel,
  buildTranslationPage
} from '../utils/translation.js'
import { translateWithIciba } from '../api/voice/iciba.js'
import { md5 } from '../api/voice/youdao.js'

const projectsStore = useProjectsStore()
const bookStore = useBookStore()

const fileInputRef = ref(null)
const isParsing = ref(false)
const parsePercent = ref(0)
const parseCurrent = ref(0)
const parseTotal = ref(0)
const parseMessage = ref('')
const uploadedFiles = ref([])

// 翻译类型：录入文本
const translationInput = ref('')
const isTranslating = ref(false)

const project = computed(() => projectsStore.getActiveProject())

// 页面列表：从 project.parsedData 或已上传的图片文件动态生成
const pages = computed(() => {
  if (!project.value) return []
  // 如果已有解析数据，直接返回
  if (project.value.parsedData?.pages) return project.value.parsedData.pages
  // 如果有已上传的图片文件，动态生成页面
  if (project.value.type === 'image' && uploadedFiles.value.length > 0) {
    return uploadedFiles.value.map((f, i) => ({
      page: i + 1,
      image: f.path || f.dataUrl,
      lines: f.lines || [],
      parsed: !!f.lines?.length
    }))
  }
  return []
})

// 切换项目时重置状态
watch(() => project.value?.id, async (newId, oldId) => {
  if (newId !== oldId) {
    uploadedFiles.value = []
    isParsing.value = false
    parsePercent.value = 0
    parseCurrent.value = 0
    parseTotal.value = 0
    parseMessage.value = ''
    translationInput.value = ''
    isTranslating.value = false

    if (project.value?.type === 'image') {
      await loadImageProjectFiles()
      buildImageBookData()
    } else if (isTranslationProject(project.value?.type)) {
      // 翻译类型：已有 pages 就立刻加载（让第三四栏显示）
      syncTransBook(0)
    }
  }
}, { immediate: true })

const acceptTypes = computed(() => {
  if (!project.value) return '*'
  if (project.value.type === 'pdf') return '.pdf'
  if (project.value.type === 'image') return 'image/*'
  if (project.value.type === 'word') return '.docx'
  return '*'
})

function typeLabel(type) {
  const map = { pdf: 'PDF', image: '图片', word: 'Word' }
  if (map[type]) return map[type]
  if (isTranslationProject(type)) return translationTypeLabel(type)
  return type
}

function triggerUpload() {
  fileInputRef.value?.click()
}

function selectPage(idx) {
  bookStore.currentIndex = idx
}

async function loadImageProjectFiles() {
  if (!project.value || project.value.type !== 'image') return

  const savedFiles = Array.isArray(project.value.files) ? project.value.files : []
  const parsedPages = Array.isArray(project.value.parsedData?.pages) ? project.value.parsedData.pages : []
  uploadedFiles.value = savedFiles.map(f => ({
    name: f.name,
    path: f.path,
    uploaded: true,
    dataUrl: f.dataUrl || '',
    lines: f.lines || parsedPages.find(page => page.image === f.path)?.lines || []
  }))

  try {
    const res = await fetch(`/api/files/${project.value.index}?type=image`)
    if (!res.ok) return
    const data = await res.json()
    const diskFiles = Array.isArray(data.files) ? data.files : []
    const byPath = new Map(uploadedFiles.value.map(file => [file.path, file]))
    uploadedFiles.value = diskFiles.map(file => ({
      ...byPath.get(file.path),
      name: file.name,
      path: file.path,
      uploaded: true,
      dataUrl: byPath.get(file.path)?.dataUrl || '',
      lines: byPath.get(file.path)?.lines || parsedPages.find(page => page.image === file.path)?.lines || []
    }))
    projectsStore.updateProject(project.value.id, {
      files: uploadedFiles.value.map(file => ({
        name: file.name,
        path: file.path,
        lines: file.lines || []
      })),
      pageCount: uploadedFiles.value.length,
      status: uploadedFiles.value.length ? 'ready' : 'empty'
    })
  } catch (error) {
    console.warn('读取图片目录失败:', error)
  }
}

async function handleFileChange(event) {
  const files = Array.from(event.target.files || [])
  if (!files.length) return
  event.target.value = ''

  // PDF/Word 只能添加一个
  if (project.value.type !== 'image' && uploadedFiles.value.length > 0) {
    ElMessage.warning(`${typeLabel(project.value.type)} 项目只能上传一个文件`)
    return
  }

  for (const file of files) {
    try {
      const dataUrl = await readFileAsDataURL(file)
      const base64 = dataUrl.split(',')[1]

      // 调用后端 API 保存文件
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index: project.value.index,
          type: project.value.type,
          filename: file.name,
          fileData: base64
        })
      })
      const result = await res.json()

      if (result.success) {
        uploadedFiles.value.push({
          name: result.filename || file.name,
          path: result.path,
          uploaded: true,
          dataUrl: project.value.type === 'image' ? '' : dataUrl,
          base64,
          lines: [] // 尚未解析
        })
      } else {
        ElMessage.error(result.error || '上传失败')
      }
    } catch (error) {
      ElMessage.error('上传失败: ' + error.message)
    }
  }

  // 更新项目文件列表
  projectsStore.updateProject(project.value.id, {
    files: uploadedFiles.value.map(f => ({
      name: f.name,
      path: f.path,
      dataUrl: project.value.type === 'image' ? '' : f.dataUrl,
      lines: f.lines || []
    })),
    pageCount: uploadedFiles.value.length,
    status: uploadedFiles.value.length ? 'ready' : 'empty'
  })

  // 图片上传后，立即构建 bookStore 数据让第三/四栏联动
  if (project.value.type === 'image' && uploadedFiles.value.length > 0) {
    buildImageBookData()
  }
}

// 图片上传后立即构建 book 数据（图片可查看，文本待OCR）
function buildImageBookData() {
  if (!project.value || project.value.type !== 'image') return
  const bookData = {
    title: project.value.name,
    pages: uploadedFiles.value.map((f, i) => ({
      page: i + 1,
      image: f.path || f.dataUrl,
      lines: f.lines || [], // 未解析时为空
      parsed: !!f.lines?.length
    }))
  }
  bookStore.book = bookStore.normalizeBook(bookData)
  bookStore.currentIndex = 0
  projectsStore.updateProject(project.value.id, {
    parsedData: bookData.pages.length ? bookData : null,
    pageCount: bookData.pages.length,
    status: bookData.pages.length ? 'ready' : 'empty'
  })
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ============ PDF/Word 批量解析 ============
async function startParse() {
  if (uploadedFiles.value.length === 0) {
    ElMessage.warning('请先上传文件')
    return
  }
  try {
    if (project.value.type === 'pdf') await handlePDFParse()
    else if (project.value.type === 'word') await handleWordParse()
  } catch (error) {
    ElMessage.error('解析失败: ' + error.message)
  }
}

async function handlePDFParse() {
  const file = uploadedFiles.value[0]
  isParsing.value = true
  parseMessage.value = '正在读取 PDF...'
  try {
    const resp = await fetch(file.dataUrl)
    const blob = await resp.blob()
    const pdfFile = new File([blob], file.name, { type: 'application/pdf' })
    const results = await parsePDF(pdfFile, {
      scale: 2.0,
      onProgress: (c, t) => {
        parsePercent.value = Math.round((c / t) * 100)
        parseCurrent.value = c
        parseTotal.value = t
        parseMessage.value = `正在解析第 ${c}/${t} 页...`
      }
    })
    const bookData = pdfResultsToBook(results, project.value.name)
    await saveParseResult(project.value.index, bookData)
    projectsStore.updateProject(project.value.id, { status: 'ready', pageCount: results.length, parsedData: bookData })
    bookStore.book = bookStore.normalizeBook(bookData)
    bookStore.currentIndex = 0
    ElMessage.success(`PDF 解析完成，共 ${results.length} 页`)
  } catch (error) {
    projectsStore.updateProject(project.value.id, { status: 'error' })
    throw error
  } finally { isParsing.value = false }
}

async function handleWordParse() {
  const file = uploadedFiles.value[0]
  isParsing.value = true
  parseMessage.value = '正在解析 Word 文档...'
  try {
    const resp = await fetch(file.dataUrl)
    const blob = await resp.blob()
    const wordFile = new File([blob], file.name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const { text } = await parseWord(wordFile)
    const bookData = wordTextToBook(text, project.value.name)
    await saveParseResult(project.value.index, bookData)
    projectsStore.updateProject(project.value.id, { status: 'ready', pageCount: bookData.pages.length, parsedData: bookData })
    bookStore.book = bookStore.normalizeBook(bookData)
    bookStore.currentIndex = 0
    ElMessage.success(`Word 解析完成，共 ${bookData.pages.length} 页`)
  } catch (error) {
    projectsStore.updateProject(project.value.id, { status: 'error' })
    throw error
  } finally { isParsing.value = false }
}

async function saveParseResult(index, result) {
  try {
    const res = await fetch('/api/parse/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, result })
    })
    const data = await res.json()
    if (!data.success) console.warn('保存解析结果失败:', data.error)
  } catch (e) {
    console.warn('保存解析结果失败:', e)
  }
}

// ============ 翻译类型：录入、翻译、持久化 ============
/**
 * 把当前项目的 parsedData.pages 同步到 bookStore + projectsStore
 * @param {number} jumpToIndex 同步完成后跳转的页码（-1 保持不变）
 */
function syncTransBook(jumpToIndex = -1) {
  if (!project.value) return
  const pages = Array.isArray(project.value.parsedData?.pages)
    ? project.value.parsedData.pages
    : []
  const bookData = {
    title: project.value.name,
    pages
  }
  bookStore.book = bookStore.normalizeBook(bookData)
  if (jumpToIndex >= 0) {
    bookStore.currentIndex = jumpToIndex
  }
  projectsStore.updateProject(project.value.id, {
    parsedData: bookData,
    pageCount: pages.length,
    status: pages.length ? 'ready' : 'empty'
  })
  saveParseResult(project.value.index, bookData)
}

/**
 * 翻译录入：提交按钮
 * - 校验非空
 * - 新增一页（先立即显示，翻译字段空）
 * - 异步调用翻译 API，翻译完成后再更新
 */
async function submitTranslationEntry() {
  if (!project.value || !isTranslationProject(project.value.type)) return
  const text = translationInput.value
  if (!text || !String(text).trim()) {
    ElMessage.warning('请输入要录入的内容')
    return
  }

  const proj = project.value
  const type = proj.type
  const existingPages = Array.isArray(proj.parsedData?.pages) ? proj.parsedData.pages : []
  const pageNo = existingPages.length + 1

  // 第一步：先构建「未翻译」的一页，立即保存，让 UI 立刻显示
  const newPage = buildTranslationPage(type, text, '', pageNo)
  const mergedPages = [...existingPages, newPage]
  projectsStore.updateProject(proj.id, {
    parsedData: { title: proj.name, pages: mergedPages },
    pageCount: mergedPages.length,
    status: 'ready'
  })
  // 先同步到 bookStore，第三/四栏立刻显示录入内容
  const tmpBook = { title: proj.name, pages: mergedPages }
  bookStore.book = bookStore.normalizeBook(tmpBook)
  bookStore.currentIndex = mergedPages.length - 1
  translationInput.value = '' // 清空输入框

  // 第二步：异步翻译（失败也不影响已经保存的原文）
  isTranslating.value = true
  try {
    const { from, to } = translationDirection(type)
    const source = type === 'translate-zh' ? newPage.lines[0].zh : newPage.lines[0].en
    const [translated] = await translateWithIciba([source], from, to, md5)
    const transValue = String(translated || '').trim()
    if (transValue) {
      // 用翻译结果重建这一页
      const translatedPage = buildTranslationPage(type, text, transValue, pageNo)
      mergedPages[mergedPages.length - 1] = translatedPage
      projectsStore.updateProject(proj.id, {
        parsedData: { title: proj.name, pages: mergedPages },
        pageCount: mergedPages.length,
        status: 'ready'
      })
      bookStore.book = bookStore.normalizeBook({ title: proj.name, pages: mergedPages })
      saveParseResult(proj.index, { title: proj.name, pages: mergedPages })
      ElMessage.success('录入并翻译完成')
    } else {
      ElMessage.warning('录入成功，但翻译结果为空')
      saveParseResult(proj.index, { title: proj.name, pages: mergedPages })
    }
  } catch (err) {
    ElMessage.warning(`录入成功，翻译失败：${err.message || '请稍后重试'}`)
    // 即使翻译失败也要持久化原文
    saveParseResult(proj.index, { title: proj.name, pages: mergedPages })
  } finally {
    isTranslating.value = false
  }
}
</script>

<style scoped>
.project-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(18px);
  box-sizing: border-box;
  min-width: 0;
  /* 整栏滚动到底时的底部留白，避免最后一项贴边被裁 */
  padding-bottom: 28px;
}
.project-detail > * {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
}
/* 防止子组件（如 el-input / el-select）因内部宽度撑破容器 */
.project-detail .el-input,
.project-detail .el-textarea,
.project-detail .el-select,
.project-detail .upload-section,
.project-detail .translation-input-card,
.project-detail .index-header {
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8c9996;
  gap: 12px;
}
.empty-state p { margin: 0; font-size: 14px; }

.detail-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e3e9e6;
  flex-shrink: 0;
  min-width: 0;
}
.detail-title {
  font-size: 14px;
  font-weight: 700;
  color: #16201f;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-type-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #126b62;
  background: #e8f2ef;
  border-radius: 4px;
  flex-shrink: 0;
}

/* ============ 页面导航 ============ */
.page-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 8px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.page-nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #40504c;
  background: #f6f9f8;
  cursor: pointer;
  transition: all 0.15s;
}
.page-nav-item:hover { background: #e8f2ef; color: #126b62; }
.page-nav-item.active { background: #126b62; color: #fff; font-weight: 700; }
.parsed-badge {
  font-size: 10px;
  color: #67c23a;
  font-weight: 700;
}
.page-nav-item.active .parsed-badge { color: #a0ebc0; }

/* ============ 上传区域 ============ */
.upload-section {
  flex: 1;
  overflow-y: auto;
  padding: 12px 12px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.image-project-section {
  overflow: hidden;
}
.image-project-section .image-page-nav {
  flex: 1;
  min-height: 0;
}
.index-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #40504c;
  padding: 2px 2px 0;
}
.index-header strong {
  color: #126b62;
  font-size: 11px;
}
.empty-index {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 1px dashed #d0dbd7;
  border-radius: 8px;
  color: #8c9996;
  font-size: 13px;
  background: #f8fbfa;
}
.file-list-header {
  font-size: 12px;
  font-weight: 600;
  color: #40504c;
  margin-bottom: 8px;
}
.file-list { display: flex; flex-direction: column; gap: 4px; }
.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #f6f9f8;
  font-size: 12px;
  color: #16201f;
}
.file-item .file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.upload-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 20px;
  border: 2px dashed #d0dbd7;
  border-radius: 12px;
  text-align: center;
  transition: all 0.2s;
}
.upload-card:hover { border-color: #126b62; background: #f0f4f3; }
.upload-card.compact {
  padding: 18px 14px;
  gap: 8px;
  flex-shrink: 0;
}
.upload-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #e8f2ef;
}
.upload-card h4 { margin: 0; font-size: 14px; font-weight: 700; color: #16201f; }
.upload-hint { margin: 0; font-size: 11px; color: #8c9996; line-height: 1.5; }
.parse-action { display: flex; justify-content: center; padding: 8px 0; }

/* ============ 解析进度 ============ */
.parse-progress-bar {
  flex-shrink: 0;
  padding: 16px;
  border-top: 1px solid #e3e9e6;
  background: #fafcfb;
}
.parse-progress-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #126b62;
  font-weight: 600;
  margin-bottom: 8px;
}
.parse-progress-detail { font-size: 11px; color: #8c9996; text-align: right; margin-top: 4px; }

/* ============ 翻译类型：录入区 & 页面列表 ============ */
.translation-section {
  overflow: hidden;
}
.translation-input-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #d7dfdc;
  border-radius: 10px;
  background: #fbfcfb;
  flex-shrink: 0;
}
.field-label {
  font-size: 12px;
  font-weight: 700;
  color: #40504c;
}
.translation-input-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 6px;
  margin-top: 4px;
}
.translation-input-actions .el-button {
  width: 100%;
  justify-content: center;
}
.translation-hint {
  font-size: 11px;
  color: #8c9996;
  line-height: 1.5;
  white-space: normal;
  word-break: break-all;
}
.translation-page-nav {
  flex: 1;
  min-height: 0;
}
.translation-section .index-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #40504c;
  padding: 10px 2px 4px;
}
.translation-section .index-header strong {
  color: #126b62;
  font-size: 11px;
}
</style>
