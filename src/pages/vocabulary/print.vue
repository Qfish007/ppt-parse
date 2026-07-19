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
    </header>

    <section class="print-panel">
      <div class="print-controls">
        <el-select v-model="levelFilter" class="print-control" multiple collapse-tags collapse-tags-tooltip clearable
          placeholder="按水平筛选">
          <el-option v-for="level in VOCABULARY_LEVELS" :key="level.value" :label="level.label" :value="level.value" />
        </el-select>
        <el-select v-model="tagFilter" class="print-control" multiple collapse-tags collapse-tags-tooltip clearable
          placeholder="按标签筛选">
          <el-option v-for="tag in defaultTags" :key="tag.id" :label="tag.name" :value="tag.id" />
        </el-select>
        <el-select v-model="printCols" class="print-control" placeholder="列数">
          <el-option label="1 列" :value="1" />
          <el-option label="2 列" :value="2" />
          <el-option label="3 列" :value="3" />
          <el-option label="4 列" :value="4" />
          <el-option label="5 列" :value="5" />
        </el-select>
        <el-select v-model="printOrder" class="print-control" placeholder="顺序">
          <el-option label="随机" :value="true" />
          <el-option label="顺序" :value="false" />
        </el-select>
        <div class="print-labels">
          <el-checkbox v-model="showChinese">中文</el-checkbox>
          <el-checkbox v-model="showEnglish">英文</el-checkbox>
        </div>
        <el-input-number v-model="printCount" class="print-count" :min="1" :max="Math.max(1, availableWords.length)"
          controls-position="right" />
        <span class="print-count-tip">共 {{ Math.min(printCount, availableWords.length) }} 词 · 每页 {{ wordsPerPage }} · {{
          printPages.length }} 页</span>
        <el-button type="primary" :disabled="!printWords.length || exportingPdf" :loading="exportingPdf" @click="doPrint">
          <el-icon>
            <Printer />
          </el-icon>
          导出PDF
        </el-button>
      </div>
      <div class="print-sliders">
        <div class="slider-item">
          <label class="slider-label">标题间距</label>
          <el-slider v-model="headerGap" :min="5" :max="60" :step="1" show-stops size="small" />
          <span class="slider-value">{{ headerGap }}px</span>
        </div>
        <div class="slider-item">
          <label class="slider-label">上下间距</label>
          <el-slider v-model="rowGap" :min="16" :max="40" :step="1" size="small" />
          <span class="slider-value">{{ rowGap }}px</span>
        </div>
        <div class="slider-item">
          <label class="slider-label">左右间距</label>
          <el-slider v-model="colGap" :min="0" :max="60" :step="1" size="small" />
          <span class="slider-value">{{ colGap }}px</span>
        </div>
        <div class="slider-item">
          <label class="slider-label">字体大小</label>
          <el-slider v-model="fontSize" :min="16" :max="40" :step="1" size="small" />
          <span class="slider-value">{{ fontSize }}px</span>
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
        <div v-for="(page, pageIdx) in printPages" :key="pageIdx" class="a4-page" :style="{
          pageBreakAfter: pageIdx < printPages.length - 1 ? 'always' : 'auto',
          '--print-cols': printCols,
          '--header-gap': `${headerGap}px`,
          '--row-gap': `${rowGap}px`,
          '--col-gap': `${colGap}px`,
          '--font-size': `${fontSize}px`,
          '--header-gap-mm': `${(headerGap * 25.4 / 96).toFixed(2)}mm`,
          '--row-gap-mm': `${(rowGap * 25.4 / 96).toFixed(2)}mm`,
          '--col-gap-mm': `${(colGap * 25.4 / 96).toFixed(2)}mm`
        }">
          <div class="a4-page-header">
            <span>单词默写练习</span>
            <span class="a4-page-no">第 {{ pageIdx + 1 }} / {{ printPages.length }} 页</span>
          </div>
          <div class="a4-body">
            <div v-for="(entry, i) in page" :key="i" class="word-row" :class="{ 'word-row-double': showEnglish && showChinese }">
              <div v-if="showEnglish && !showChinese" class="meaning-text meaning-text-en">{{ entry.word }}</div>
              <div v-else-if="showChinese && !showEnglish" class="meaning-text meaning-text-zh">{{ trimChineseMeaning(entry.meaning, fontSize > 26 ? 20 : printCols >= 3 ? 22 : 28) }}</div>
              <div v-else-if="showEnglish && showChinese" class="meaning-text meaning-text-en">{{ entry.word }}</div>
              <div v-if="showEnglish && showChinese" class="meaning-text meaning-text-zh meaning-text-bottom">{{ trimChineseMeaning(entry.meaning, fontSize > 26 ? 20 : printCols >= 3 ? 22 : 28) }}</div>
              <div class="meaning-line"></div>
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
const printCount = ref(100)
const printCols = ref(3) // 默认3列
const printOrder = ref(true) // true=随机, false=顺序
const headerGap = ref(40) // 默认40px
const rowGap = ref(20) // 默认20px
const colGap = ref(20) // 默认20px
const fontSize = ref(20) // 默认20px
const showChinese = ref(true)
const showEnglish = ref(false)
const printWords = ref([])
const exportingPdf = ref(false)

const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123
const PAGE_PADDING_Y = 32
const HEADER_FONT_SIZE = 15
const HEADER_LINE_HEIGHT = Math.ceil(HEADER_FONT_SIZE * 1.35)
const HEADER_PADDING_BOTTOM = 10
const HEADER_BORDER_HEIGHT = 2
const BODY_ROW_GAP = 20
const PDF_PAGE_WIDTH_PT = 595.28
const PDF_PAGE_HEIGHT_PT = 841.89

// 根据当前字体大小和间距动态计算每页能放多少行
const rowsPerPage = computed(() => {
  const fs = Number(fontSize.value) || 16
  const rg = Number(rowGap.value) || 20
  const hg = Number(headerGap.value) || 40
  const lineHeight = fs * 1.35
  const textBlockHeight = showEnglish.value && showChinese.value ? lineHeight * 3 + 2 : showChinese.value ? lineHeight * 2 : lineHeight
  const underlineHeight = fs * 1.2 + 4
  const rowContentHeight = textBlockHeight + (showEnglish.value && showChinese.value ? 2 : rg) + underlineHeight
  const headerHeight = HEADER_LINE_HEIGHT + HEADER_PADDING_BOTTOM + HEADER_BORDER_HEIGHT + hg
  const bodyHeight = A4_HEIGHT_PX - PAGE_PADDING_Y * 2 - headerHeight
  return Math.max(1, Math.floor((bodyHeight + BODY_ROW_GAP) / (rowContentHeight + BODY_ROW_GAP)))
})
const wordsPerPage = computed(() => rowsPerPage.value * Math.max(1, Number(printCols.value) || 1))

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

function trimMeaning(meaning, maxLen = 28) {
  if (!meaning) return '（暂无释义）'
  let text = String(meaning)
  text = text.replace(/^\s+|\s+$/g, '')
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ')
  if (text.length > maxLen) {
    text = text.slice(0, maxLen) + '…'
  }
  return text || '（暂无释义）'
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

// 任一项变化 → 重新抽取单词（列数变化不重抽，仅改变分页；分页由 computed 自动重排）
watch([levelFilter, tagFilter, printCount, printOrder], () => {
  resamplePrintWords()
}, { deep: true, immediate: true })

// 词本加载后重新抽取（保证 mounted 之后单词数据就位也能渲染）
watch(availableWords, () => {
  if (availableWords.value.length > 0 && !printWords.value.length) {
    resamplePrintWords()
  }
})

// 显示选项变化时重新计算分页
watch([showEnglish, showChinese, fontSize, rowGap, headerGap, printCols], () => {
  resamplePrintWords()
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

  const pagePaddingX = 37
  const pagePaddingY = PAGE_PADDING_Y
  const contentWidth = A4_WIDTH_PX - pagePaddingX * 2
  const fs = Number(fontSize.value) || 16
  const rg = Number(rowGap.value) || 20
  const hg = Number(headerGap.value) || 40
  const cg = Number(colGap.value) || 20
  const cols = Math.max(1, Number(printCols.value) || 1)
  const cellWidth = (contentWidth - cg * (cols - 1)) / cols
  const textLineHeight = fs * 1.35
  const textBlockHeight = showEnglish.value && showChinese.value ? textLineHeight * 3 + 2 : showChinese.value ? textLineHeight * 2 : textLineHeight
  const lineHeight = fs * 1.2 + 4
  const rowContentHeight = textBlockHeight + (showEnglish.value && showChinese.value ? 2 : rg) + lineHeight
  const rowHeight = rowContentHeight + BODY_ROW_GAP

  ctx.textBaseline = 'top'
  ctx.fillStyle = '#111827'
  ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText('单词默写练习', pagePaddingX, pagePaddingY)
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#6b7280'
  const pageNo = `第 ${pageIndex + 1} / ${totalPages} 页`
  ctx.fillText(pageNo, pagePaddingX + contentWidth - ctx.measureText(pageNo).width, pagePaddingY + 1)

  const headerLineY = pagePaddingY + HEADER_LINE_HEIGHT + HEADER_PADDING_BOTTOM
  ctx.strokeStyle = '#2f6feb'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pagePaddingX, headerLineY + 1)
  ctx.lineTo(pagePaddingX + contentWidth, headerLineY + 1)
  ctx.stroke()

  const bodyTop = headerLineY + HEADER_BORDER_HEIGHT + hg
  ctx.font = `600 ${fs}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.fillStyle = '#111827'
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1

  pageEntries.forEach((entry, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = pagePaddingX + col * (cellWidth + cg)
    const y = bodyTop + row * rowHeight
    const textLines = getEntryLines(entry, cellWidth, ctx, fs)
    drawTextLines(ctx, textLines, x, y, textLineHeight)
    const lineY = y + textBlockHeight + (showEnglish.value && showChinese.value ? 2 : rg) + lineHeight - 1
    ctx.beginPath()
    ctx.moveTo(x, lineY)
    ctx.lineTo(x + cellWidth, lineY)
    ctx.stroke()
  })

  return {
    width: canvas.width,
    height: canvas.height,
    bytes: base64ToBytes(canvas.toDataURL('image/jpeg', 0.96).split(',')[1])
  }
}

function getEntryLines(entry, maxWidth, ctx, fs) {
  if (showEnglish.value && !showChinese.value) return fitTextLines(entry.word || '', 1, maxWidth, ctx)
  if (showChinese.value && !showEnglish.value) {
    return fitTextLines(trimChineseMeaning(entry.meaning, fs > 26 ? 20 : printCols.value >= 3 ? 22 : 28), 2, maxWidth, ctx)
  }
  if (showEnglish.value && showChinese.value) {
    const wordLine = fitTextLines(entry.word || '', 1, maxWidth, ctx)[0] || ''
    const meaningLines = fitTextLines(trimChineseMeaning(entry.meaning, fs > 26 ? 20 : printCols.value >= 3 ? 22 : 28), 2, maxWidth, ctx)
    return [wordLine, ...meaningLines]
  }
  return []
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

function drawTextLines(ctx, lines, x, y, lineHeight) {
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

onMounted(() => {
  // 如果词本内容在 mounted 时已就绪，立即抽取
  if (availableWords.value.length) resamplePrintWords()
})
</script>

<style scoped>
.vocab-print-page {
  --print-max: 1200px;
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
  margin-bottom: 18px;
  padding: 0 !important;
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

.print-panel,
.print-page {
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
}

.print-panel {
  padding: 14px;
  margin-bottom: 14px;
}

.print-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.print-control {
  width: 170px;
}

.print-count {
  width: 150px;
}

.print-labels {
  display: flex;
  gap: 12px;
  align-items: center;
}

.print-count-tip {
  font-size: 12px;
  color: #63706d;
  font-weight: 700;
}

.print-sliders {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #d7dfdc;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 24px;
}

.slider-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  background: #f6f7f8;
  border-radius: 6px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
}

.slider-label {
  font-size: 12px;
  font-weight: 700;
  color: #364844;
  white-space: nowrap;
  flex-shrink: 0;
}

.slider-value {
  color: #2f6feb;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  min-width: 48px;
  text-align: right;
  font-size: 12px;
  flex-shrink: 0;
}

:deep(.el-slider) {
  flex: 1;
  min-width: 60px;
  max-width: 140px;
}

.print-page {
  padding: 28px;
}

.empty-card {
  color: #8c9996;
  text-align: center;
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
  padding: 32px 37px;
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
  margin-bottom: var(--header-gap, 32px);
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
  row-gap: 20px;
  column-gap: var(--col-gap, 22px);
}

.word-row {
  display: flex;
  flex-direction: column;
  gap: var(--row-gap, 22px);
  min-width: 0;
}

.word-row-double {
  gap: 2px;
}

.meaning-text-en {
  min-height: calc(var(--font-size, 16px) * 1.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: normal;
}

.meaning-text-zh {
  min-height: calc(var(--font-size, 16px) * 1.35 * 2);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  white-space: normal;
}

.word-row-double .meaning-text-en {
  height: auto;
  min-height: calc(var(--font-size, 16px) * 1.35);
}

.word-row-double .meaning-text-zh {
  height: auto;
  min-height: calc(var(--font-size, 16px) * 1.35 * 2);
}

.meaning-text {
  font-size: var(--font-size, 16px);
  font-weight: 600;
  line-height: 1.35;
  color: #111827;
  min-width: 0;
}

.meaning-text-bottom {
  height: auto;
  min-height: calc(var(--font-size, 16px) * 1.35 * 2);
}

.meaning-line {
  width: 100%;
  border-bottom: 1px solid #333;
  height: calc(var(--font-size, 16px) * 1.2 + 4px);
}

@media (max-width: 720px) {
  .print-title-wrap {
    align-items: flex-start;
    flex-direction: column;
  }

  .print-control,
  .print-count {
    width: 100%;
  }
}

</style>
