<template>
  <div class="vocab-print-page">
    <header class="print-header">
      <div class="print-title-wrap">
        <el-button type="primary" @click="goBack">
          <el-icon>
            <ArrowLeft />
          </el-icon>
          返回
        </el-button>
        <div>
          <h2 class="print-title">打印单词</h2>
          <p class="print-subtitle">默认词本：{{ defaultBook?.name || '默认生词本' }} · 当前可打印 {{ availableWords.length }} 个单词</p>
        </div>
      </div>
      <div class="print-header-right">
        <div class="print-summary">
          共 {{ Math.min(printCount, availableWords.length) }} 词 · 每页 {{ wordsPerPage }} · {{ printPages.length }} 页
        </div>
        <el-button type="primary" :disabled="!printWords.length || exportingPdf" :loading="exportingPdf"
          @click="doPrint">
          <el-icon>
            <Printer />
          </el-icon>
          导出PDF
        </el-button>
      </div>
    </header>

    <section class="print-panel">
      <div class="panel-section">
        <h3 class="panel-section-title">筛选条件</h3>
        <div class="filter-grid">
          <div class="filter-item">
            <span class="filter-label">掌握水平：</span>
            <el-select v-model="levelFilter" multiple collapse-tags collapse-tags-tooltip clearable placeholder="按水平筛选">
              <el-option v-for="level in VOCABULARY_LEVELS" :key="level.value" :label="level.label"
                :value="level.value" />
            </el-select>
          </div>
          <div class="filter-item">
            <span class="filter-label">单词标签：</span>
            <el-select v-model="tagFilter" multiple collapse-tags collapse-tags-tooltip clearable placeholder="按标签筛选">
              <el-option v-for="tag in defaultTags" :key="tag.id" :label="tag.name" :value="tag.id" />
            </el-select>
          </div>
          <div class="filter-item">
            <span class="filter-label">错误次数：</span>
            <div class="wrong-count-group">
              <el-input-number v-model="wrongCountMin" :min="0" :controls="false" placeholder="最小" />
              <span class="wrong-sep">~</span>
              <el-input-number v-model="wrongCountMax" :min="0" :controls="false" placeholder="最大" />
            </div>
          </div>
          <div class="filter-item">
            <span class="filter-label">排序方式：</span>
            <el-select v-model="printOrder" placeholder="排序">
              <el-option label="顺序" :value="false" />
              <el-option label="随机" :value="true" />
            </el-select>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <h3 class="panel-section-title">布局设置</h3>
        <div class="layout-grid">
          <div class="layout-item span-2">
            <span class="layout-label">单词构成：</span>
            <div class="compose-checks">
              <el-checkbox v-model="showChinese">中文</el-checkbox>
              <el-checkbox v-model="showEnglish">英文</el-checkbox>
              <el-checkbox v-model="showUnderline">下划线</el-checkbox>
            </div>
          </div>
          <div class="layout-item">
            <span class="layout-label">单词列数：</span>
            <el-select v-model="printCols" placeholder="列数">
              <el-option label="1 列" :value="1" />
              <el-option label="2 列" :value="2" />
              <el-option label="3 列" :value="3" />
              <el-option label="4 列" :value="4" />
              <el-option label="5 列" :value="5" />
            </el-select>
          </div>
          <div class="layout-item">
            <span class="layout-label">单词数量：</span>
            <el-input-number v-model="printCount" :min="1" :max="Math.max(1, availableWords.length)"
              controls-position="right" />
          </div>
          <div class="layout-item">
            <span class="layout-label">页面内边距：</span>
            <div class="padding-group">
              <el-input-number v-model="pagePaddingX" :min="0" :controls="false" />
              <el-input-number v-model="pagePaddingY" :min="0" :controls="false" />
            </div>
          </div>
          <div class="layout-item">
            <span class="layout-label">字体大小：</span>
            <el-input-number v-model="fontSize" :min="12" :max="40" :controls="false" />
          </div>
          <div class="layout-item">
            <span class="layout-label">单词外间距：</span>
            <div class="padding-group">
              <el-input-number v-model="outerGapX" :min="0" :controls="false" />
              <el-input-number v-model="outerGapY" :min="0" :controls="false" />
            </div>
          </div>
          <div class="layout-item">
            <span class="layout-label">单词内边距：</span>
            <div class="padding-group">
              <el-input-number v-model="innerPadX" :min="0" :controls="false" />
              <el-input-number v-model="innerPadY" :min="0" :controls="false" />
            </div>
          </div>
          <div class="layout-item">
            <span class="layout-label">单词内间距：</span>
            <el-input-number v-model="innerGap" :min="0" :controls="false" />
          </div>
          <div class="layout-item">
            <span class="layout-label">下划线固定：</span>
            <el-checkbox v-model="underlineFixed" />
          </div>
          <div class="layout-item">
            <span class="layout-label">交换中英文：</span>
            <el-checkbox v-model="swapPosition" />
          </div>
          <div class="layout-item">
            <span class="layout-label">单词背景：</span>
            <div class="bg-group">
              <el-checkbox v-model="showWordBackground">启用</el-checkbox>
              <el-color-picker v-model="wordBgColor" :disabled="!showWordBackground" />
            </div>
          </div>
          <div class="layout-item">
            <span class="layout-label">固定高度：</span>
            <div class="bg-group">
              <el-checkbox v-model="fixedWordHeightEnabled">启用</el-checkbox>
              <el-input-number v-model="fixedWordHeight" :min="40" :max="300" :controls="false"
                :disabled="!fixedWordHeightEnabled" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="!defaultWords.length" class="print-page empty-card">
      默认词本暂无单词，请先添加或导入单词。
    </section>

    <section v-else-if="!printWords.length" class="print-page empty-card">
      当前筛选条件下没有可打印的单词，请调整筛选后再试。
    </section>

    <div v-else class="print-preview-wrap">
      <div id="printContent" class="print-pages">
        <div v-for="(page, pageIdx) in printPages" :key="pageIdx" class="a4-page" :style="getPageStyle(pageIdx)">
          <div class="a4-page-header">
            <span>单词默写练习</span>
            <span class="a4-page-no">第 {{ pageIdx + 1 }} / {{ printPages.length }} 页</span>
          </div>
          <div class="a4-body">
            <div v-for="(entry, i) in page" :key="i" class="word-cell"
              :class="{ 'word-cell-underline-fixed': showUnderline && underlineFixed }">
              <div v-if="showEnglish && !swapPosition" class="word-en">{{ entry.word }}</div>
              <div v-if="showChinese" class="word-zh">{{ getDisplayMeaning(entry) }}</div>
              <div v-if="showEnglish && swapPosition" class="word-en">{{ entry.word }}</div>
              <div v-if="showUnderline" class="word-underline"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Printer } from '@element-plus/icons-vue'
import { useVocabularyStore } from '../../stores/vocabulary.js'
import { VOCABULARY_LEVELS } from '../../types/index.js'

const router = useRouter()
const vocabularyStore = useVocabularyStore()

const levelFilter = ref([])
const tagFilter = ref([])
const wrongCountMin = ref(null)
const wrongCountMax = ref(null)
const printCount = ref(100)
const printCols = ref(3)
const printOrder = ref(false)
const pagePaddingX = ref(20)
const pagePaddingY = ref(20)
const fontSize = ref(20)
const outerGapX = ref(10)
const outerGapY = ref(10)
const innerPadX = ref(10)
const innerPadY = ref(10)
const innerGap = ref(10)
const showChinese = ref(true)
const showEnglish = ref(true)
const showUnderline = ref(true)
const underlineFixed = ref(true)
const swapPosition = ref(false)
const showWordBackground = ref(false)
const wordBgColor = ref('#fff8e1')
const fixedWordHeightEnabled = ref(false)
const fixedWordHeight = ref(100)
const printWords = ref([])
const exportingPdf = ref(false)

const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123
const HEADER_FONT_SIZE = 15
const HEADER_LINE_HEIGHT = Math.ceil(HEADER_FONT_SIZE * 1.35)
const HEADER_PADDING_BOTTOM = 10
const HEADER_BORDER_HEIGHT = 2
const PDF_PAGE_WIDTH_PT = 595.28
const PDF_PAGE_HEIGHT_PT = 841.89

const defaultBook = computed(() => vocabularyStore.getDefaultBook())
const defaultWords = computed(() => defaultBook.value?.words || [])
const defaultTags = computed(() => defaultBook.value?.tags || [])

const availableWords = computed(() => {
  const selectedTags = Array.isArray(tagFilter.value) ? tagFilter.value : []
  const min = wrongCountMin.value !== null ? Number(wrongCountMin.value) : null
  const max = wrongCountMax.value !== null ? Number(wrongCountMax.value) : null
  return defaultWords.value.filter(entry => {
    const selectedLevels = Array.isArray(levelFilter.value) ? levelFilter.value : []
    const matchLevel = !selectedLevels.length || selectedLevels.includes(entry.level)
    const matchTags = !selectedTags.length || selectedTags.every(tagId => (entry.tagIds || []).includes(tagId))
    const wrongCount = Math.max(0, (Number(entry.testTotalCount) || 0) - (Number(entry.testCorrectCount) || 0))
    const matchMin = min === null || wrongCount >= min
    const matchMax = max === null || wrongCount <= max
    return matchLevel && matchTags && matchMin && matchMax
  })
})

const textLineHeight = computed(() => Number(fontSize.value) * 1.35)

const wordCellHeight = computed(() => {
  if (fixedWordHeightEnabled.value) {
    return Number(fixedWordHeight.value) || 100
  }
  const fs = Number(fontSize.value) || 20
  const gap = Number(innerGap.value) || 10
  const padY = Number(innerPadY.value) || 10
  let height = padY * 2
  if (showEnglish.value) height += fs * 1.35
  if (showChinese.value) {
    if (showEnglish.value) height += gap
    height += fs * 1.35 * 2
  }
  if (showUnderline.value) height += fs * 0.6
  return height
})

const rowsPerPage = computed(() => {
  const bodyTop = HEADER_LINE_HEIGHT + HEADER_PADDING_BOTTOM + HEADER_BORDER_HEIGHT + Number(pagePaddingY.value)
  const bodyHeight = A4_HEIGHT_PX - bodyTop - Number(pagePaddingY.value)
  const rowH = wordCellHeight.value + Number(outerGapY.value)
  return Math.max(1, Math.floor((bodyHeight + Number(outerGapY.value)) / rowH))
})

const wordsPerPage = computed(() => rowsPerPage.value * Math.max(1, Number(printCols.value) || 1))

const printPages = computed(() => {
  const list = printWords.value || []
  if (!list.length) return []
  const pageSize = Math.max(1, wordsPerPage.value || 1)
  const pages = []
  for (let i = 0; i < list.length; i += pageSize) {
    pages.push(list.slice(i, i + pageSize))
  }
  return pages
})

function getPageStyle(pageIdx) {
  return {
    '--print-cols': printCols.value,
    '--page-padding-x': `${pagePaddingX.value}px`,
    '--page-padding-y': `${pagePaddingY.value}px`,
    '--outer-gap-x': `${outerGapX.value}px`,
    '--outer-gap-y': `${outerGapY.value}px`,
    '--inner-pad-x': `${innerPadX.value}px`,
    '--inner-pad-y': `${innerPadY.value}px`,
    '--inner-gap': `${innerGap.value}px`,
    '--font-size': `${fontSize.value}px`,
    '--text-line-height': `${textLineHeight.value}px`,
    '--word-bg-color': showWordBackground.value ? wordBgColor.value : 'transparent',
    '--word-cell-height': `${wordCellHeight.value}px`
  }
}

function getDisplayMeaning(entry) {
  return trimChineseMeaning(entry.meaning, getMeaningMaxLen())
}

function getMeaningMaxLen() {
  const fs = Number(fontSize.value) || 20
  const cols = Number(printCols.value) || 3
  const cellWidth = (A4_WIDTH_PX - pagePaddingX.value * 2 - outerGapX.value * (cols - 1)) / cols
  const charWidth = fs * 0.55
  return Math.max(8, Math.floor((cellWidth - innerPadX.value * 2) / charWidth))
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/vocabulary/test')
  }
}

function shuffleWords(words) {
  return [...words].sort(() => Math.random() - 0.5)
}

function resamplePrintWords() {
  const candidates = availableWords.value
  if (!candidates.length) {
    printWords.value = []
    return
  }
  const total = Math.min(Math.max(1, Number(printCount.value) || 1), candidates.length)
  const list = printOrder.value ? shuffleWords(candidates) : [...candidates]
  printWords.value = list.slice(0, total)
}

function trimChineseMeaning(meaning, maxLen = 28) {
  if (!meaning) return '（暂无释义）'
  let text = String(meaning)
  text = text.replace(/<[^>]*>/g, ' ')
  text = text.replace(/\([^()]*[A-Za-z][^()]*\)/g, ' ')
  text = text.replace(/\[[^\]]*[A-Za-z][^\]]*\]/g, ' ')
  text = text.replace(/\b(?:adj|adv|n|v|vt|vi|pron|prep|conj|aux|int|num|art|pl|abbr|phr|sb|sth)\.?\b/gi, ' ')
  text = text.replace(/\b[a-z]+(?:['-][a-z]+)*\.?\b/gi, ' ')
  text = text.replace(/(?:[A-Za-z]\.){2,}/g, ' ')
  text = text.replace(/[A-Za-z]+/g, ' ')
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ')
  text = text.replace(/\s*([,;：:，。！？、])\s*/g, '$1')
  text = text.replace(/^[\s·•\.·\-—_:：,，;；、。！？]+/, '')
  text = text.replace(/\(\s*\)|（\s*）/g, ' ')
  text = text.replace(/^[,;：:，。！？、\s]+|[,;：:，。！？、\s]+$/g, '')
  if (text.length > maxLen) {
    text = text.slice(0, maxLen) + '…'
  }
  return text || '（暂无释义）'
}

watch([levelFilter, tagFilter, wrongCountMin, wrongCountMax, printCount, printOrder], () => {
  resamplePrintWords()
}, { deep: true, immediate: true })

watch(availableWords, () => {
  if (availableWords.value.length > 0 && !printWords.value.length) {
    resamplePrintWords()
  }
})

watch([showEnglish, showChinese, showUnderline, fontSize, printCols, pagePaddingX, pagePaddingY, outerGapX, outerGapY, innerPadX, innerPadY, innerGap, underlineFixed, swapPosition, showWordBackground, wordBgColor, fixedWordHeightEnabled, fixedWordHeight], () => {
  // 仅重新计算分页，不重抽单词
})

async function doPrint() {
  await nextTick()
  const target = document.getElementById('printContent')
  if (!target) {
    ElMessage.error('打印内容未准备好')
    return
  }
  const pages = printPages.value
  if (!pages.length) {
    ElMessage.error('没有可导出的页面')
    return
  }
  exportingPdf.value = true
  try {
    const jpegPages = []
    for (let i = 0; i < pages.length; i += 1) {
      jpegPages.push(renderVocabPageToJpeg(pages[i], i, pages.length))
    }
    const pdfBlob = buildImagePdf(jpegPages)
    downloadBlob(pdfBlob, `单词默写练习-${new Date().toISOString().slice(0, 10)}.pdf`)
    ElMessage.success(`已导出 ${pages.length} 页 PDF`)
  } catch (error) {
    ElMessage.error('导出 PDF 失败：' + (error.message || error))
  } finally {
    exportingPdf.value = false
  }
}

function renderVocabPageToJpeg(pageEntries, pageIndex, totalPages) {
  const scale = Math.max(2, window.devicePixelRatio || 1)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(A4_WIDTH_PX * scale)
  canvas.height = Math.round(A4_HEIGHT_PX * scale)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX)

  const fs = Number(fontSize.value) || 20
  const cols = Math.max(1, Number(printCols.value) || 1)
  const padX = Number(pagePaddingX.value) || 20
  const padY = Number(pagePaddingY.value) || 20
  const ogX = Number(outerGapX.value) || 10
  const ogY = Number(outerGapY.value) || 10
  const ipX = Number(innerPadX.value) || 10
  const ipY = Number(innerPadY.value) || 10
  const ig = Number(innerGap.value) || 10

  const contentWidth = A4_WIDTH_PX - padX * 2
  const cellWidth = (contentWidth - ogX * (cols - 1)) / cols
  const cellInnerWidth = cellWidth - ipX * 2
  const lh = fs * 1.35

  ctx.textBaseline = 'top'
  ctx.fillStyle = '#111827'
  ctx.font = `800 ${HEADER_FONT_SIZE}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.fillText('单词默写练习', padX, padY)
  ctx.font = `600 12px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.fillStyle = '#6b7280'
  const pageNo = `第 ${pageIndex + 1} / ${totalPages} 页`
  ctx.fillText(pageNo, padX + contentWidth - ctx.measureText(pageNo).width, padY + 1)

  const headerLineY = padY + HEADER_LINE_HEIGHT + HEADER_PADDING_BOTTOM
  ctx.strokeStyle = '#2f6feb'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(padX, headerLineY + 1)
  ctx.lineTo(padX + contentWidth, headerLineY + 1)
  ctx.stroke()

  const bodyTop = headerLineY + HEADER_BORDER_HEIGHT + padY
  ctx.font = `600 ${fs}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.fillStyle = '#111827'

  const wordCellH = computeWordCellHeight(fs, lh, ig, ipY)
  const rowH = wordCellH + ogY

  pageEntries.forEach((entry, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = padX + col * (cellWidth + ogX)
    const y = bodyTop + row * rowH

    if (showWordBackground.value && wordBgColor.value) {
      ctx.fillStyle = wordBgColor.value
      ctx.fillRect(x, y, cellWidth, wordCellH)
      ctx.fillStyle = '#111827'
    }

    const contentX = x + ipX
    let curY = y + ipY

    if (!swapPosition.value) {
      drawWordContent(ctx, entry, contentX, curY, cellInnerWidth, fs, lh, ig)
    } else {
      drawWordContentSwapped(ctx, entry, contentX, curY, cellInnerWidth, fs, lh, ig)
    }

    if (showUnderline.value) {
      const lineY = underlineFixed.value
        ? y + wordCellH - 1
        : computeUnderlineY(entry, contentX, curY, cellInnerWidth, fs, lh, ig)
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + ipX, lineY)
      ctx.lineTo(x + cellWidth - ipX, lineY)
      ctx.stroke()
    }
  })

  return {
    width: canvas.width,
    height: canvas.height,
    bytes: base64ToBytes(canvas.toDataURL('image/jpeg', 0.96).split(',')[1])
  }
}

function computeWordCellHeight(fs, lh, ig, ipY) {
  let h = ipY * 2
  if (showEnglish.value) h += lh
  if (showChinese.value) {
    if (showEnglish.value) h += ig
    h += lh * 2
  }
  if (showUnderline.value) h += fs * 0.5
  return h
}

function drawWordContent(ctx, entry, x, y, maxWidth, fs, lh, ig) {
  let curY = y
  if (showEnglish.value) {
    const word = entry.word || ''
    ctx.textAlign = 'center'
    ctx.fillText(word, x + maxWidth / 2, curY)
    curY += lh
  }
  if (showChinese.value) {
    if (showEnglish.value) curY += ig
    const meaning = trimChineseMeaning(entry.meaning, Math.floor(maxWidth / (fs * 0.55)))
    const meaningLines = fitTextLines(meaning, 2, maxWidth, ctx)
    ctx.textAlign = 'center'
    meaningLines.forEach((line, i) => {
      ctx.fillText(line, x + maxWidth / 2, curY + i * lh)
    })
    curY += meaningLines.length * lh
  }
  return curY
}

function drawWordContentSwapped(ctx, entry, x, y, maxWidth, fs, lh, ig) {
  let curY = y
  if (showChinese.value) {
    const meaning = trimChineseMeaning(entry.meaning, Math.floor(maxWidth / (fs * 0.55)))
    const meaningLines = fitTextLines(meaning, 2, maxWidth, ctx)
    ctx.textAlign = 'center'
    meaningLines.forEach((line, i) => {
      ctx.fillText(line, x + maxWidth / 2, curY + i * lh)
    })
    curY += meaningLines.length * lh
  }
  if (showEnglish.value) {
    if (showChinese.value) curY += ig
    const word = entry.word || ''
    ctx.textAlign = 'center'
    ctx.fillText(word, x + maxWidth / 2, curY)
    curY += lh
  }
  return curY
}

function computeUnderlineY(entry, x, y, maxWidth, fs, lh, ig) {
  let curY = y
  if (!swapPosition.value) {
    if (showEnglish.value) curY += lh
    if (showChinese.value) {
      if (showEnglish.value) curY += ig
      const meaning = trimChineseMeaning(entry.meaning, Math.floor(maxWidth / (fs * 0.55)))
      const meaningLines = fitTextLines(meaning, 2, maxWidth, { measureText: () => ({ width: maxWidth }) })
      curY += meaningLines.length * lh
    }
  } else {
    if (showChinese.value) {
      const meaning = trimChineseMeaning(entry.meaning, Math.floor(maxWidth / (fs * 0.55)))
      const meaningLines = fitTextLines(meaning, 2, maxWidth, { measureText: () => ({ width: maxWidth }) })
      curY += meaningLines.length * lh
    }
    if (showEnglish.value) {
      if (showChinese.value) curY += ig
      curY += lh
    }
  }
  return curY
}

function fitTextLines(text, maxLines, maxWidth, ctx) {
  const source = String(text || '')
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
  const lastIndex = lines.length - 1
  if (lastIndex >= 0 && source.length > lines.join('').length) {
    lines[lastIndex] = ellipsizeLine(lines[lastIndex], maxWidth, ctx)
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

onMounted(() => {
  if (availableWords.value.length) resamplePrintWords()
})
</script>

<style scoped>
.vocab-print-page {
  --print-max: 1400px;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28px;
  background: linear-gradient(135deg, #eef4f1 0%, #f8f7f2 48%, #edf1f8 100%);
}

.print-header,
.print-panel,
.print-preview-wrap {
  width: 100% !important;
  max-width: var(--print-max) !important;
  margin-left: auto !important;
  margin-right: auto !important;
  box-sizing: border-box !important;
}

.print-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  padding: 0 !important;
}

.print-header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.print-title-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
}

.print-title {
  margin: 0;
  color: #16201f;
  font-size: 22px;
  font-weight: 800;
}

.print-subtitle {
  margin: 4px 0 0;
  color: #63706d;
  font-size: 13px;
  font-weight: 700;
}

.print-summary {
  color: #364844;
  font-size: 14px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.8);
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #d7dfdc;
}

.print-panel {
  padding: 16px;
  margin-bottom: 14px;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
}

.panel-section {
  margin-bottom: 18px;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.panel-section-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 800;
  color: #16201f;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 20px;
  align-items: center;
}

.filter-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  height: 36px;
}

.filter-label {
  font-size: 13px;
  font-weight: 700;
  color: #364844;
  flex-shrink: 0;
  white-space: nowrap;
  width: 80px;
  text-align: right;
}

.filter-item :deep(.el-select) {
  flex: 1;
  min-width: 0;
}

.filter-item :deep(.el-select__wrapper) {
  height: 32px !important;
}

.filter-item :deep(.el-input-number) {
  height: 32px;
}

.filter-item :deep(.el-input-number .el-input__wrapper) {
  height: 32px !important;
}

.filter-item :deep(.el-checkbox) {
  height: 32px;
  margin-right: 0;
}

.wrong-count-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.wrong-count-group :deep(.el-input-number) {
  width: 64px;
}

.wrong-sep {
  color: #999;
  font-size: 13px;
  flex-shrink: 0;
}

.layout-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 20px;
  align-items: center;
}

.layout-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  height: 36px;
}

.layout-item.span-2 {
  grid-column: span 2 / span 2;
}

.layout-label {
  font-size: 13px;
  font-weight: 700;
  color: #364844;
  flex-shrink: 0;
  white-space: nowrap;
  width: 80px;
  text-align: right;
}

.layout-item :deep(.el-select__wrapper) {
  height: 32px !important;
}

.layout-item :deep(.el-input-number) {
  height: 32px;
}

.layout-item :deep(.el-input-number .el-input__wrapper) {
  height: 32px !important;
}

.layout-item :deep(.el-checkbox) {
  height: 32px;
  margin-right: 0;
}

.compose-checks {
  display: flex;
  gap: 14px;
}

.bg-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.padding-group {
  display: flex;
  gap: 8px;
  flex: 1;
}

.padding-group :deep(.el-input-number) {
  width: 64px;
}

.layout-item :deep(.el-select) {
  flex: 1;
  min-width: 0;
}

.layout-item :deep(.el-input-number) {
  flex: 1;
  min-width: 0;
}

.print-page {
  padding: 28px;
}

.empty-card {
  color: #8c9996;
  text-align: center;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
}

.print-preview-wrap {
  overflow: auto;
  background: #e5e7eb;
  padding: 20px 0;
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
  border: 1px solid #d7dfdc;
  background: rgba(229, 231, 235, 0.9);
}

.print-pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.a4-page {
  width: 794px;
  height: 1123px;
  min-height: 1123px;
  background: #ffffff;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
  padding: var(--page-padding-y) var(--page-padding-x);
  box-sizing: border-box;
  overflow: hidden;
}

.a4-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 800;
  color: #111827;
  padding-bottom: 10px;
  margin-bottom: var(--page-padding-y);
  border-bottom: 2px solid #2f6feb;
}

.a4-page-no {
  font-weight: 600;
  color: #6b7280;
  font-size: 12px;
}

.a4-body {
  display: grid;
  grid-template-columns: repeat(var(--print-cols, 1), minmax(0, 1fr));
  grid-auto-rows: var(--word-cell-height, auto);
  gap: var(--outer-gap-y) var(--outer-gap-x);
  align-items: stretch;
}

.word-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--inner-pad-y) var(--inner-pad-x);
  min-width: 0;
  background: var(--word-bg-color, transparent);
}

.word-cell-underline-fixed {
  height: 100%;
}

.word-cell-underline-fixed .word-underline {
  margin-top: auto;
}

.word-en {
  font-size: var(--font-size);
  font-weight: 700;
  line-height: var(--text-line-height);
  color: #111827;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.word-zh {
  font-size: var(--font-size);
  font-weight: 600;
  line-height: var(--text-line-height);
  color: #111827;
  text-align: center;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  white-space: normal;
  max-width: 100%;
}

.word-cell .word-en+.word-zh {
  margin-top: var(--inner-gap);
}

.word-cell .word-zh+.word-en {
  margin-top: var(--inner-gap);
}

.word-underline {
  width: 100%;
  border-bottom: 1px solid #333;
  margin-top: var(--inner-gap);
}

.word-cell:not(.word-cell-underline-fixed):last-child .word-underline {
  margin-top: var(--inner-gap);
}

@media (max-width: 720px) {
  .print-header {
    flex-direction: column;
    gap: 10px;
  }

  .filter-grid,
  .layout-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .layout-item.span-2 {
    grid-column: span 2 / span 2;
  }
}
</style>
