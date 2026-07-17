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
        <el-input-number v-model="printCount" class="print-count" :min="1" :max="Math.max(1, availableWords.length)"
          controls-position="right" />
        <span class="print-count-tip">共 {{ Math.min(printCount, availableWords.length) }} 词 · 每页 {{ wordsPerPage }} · {{
          printPages.length }} 页</span>
        <el-button type="primary" :disabled="!printWords.length" @click="doPrint">
          <el-icon>
            <Printer />
          </el-icon>
          打印 / 导出PDF
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
            <div v-for="(entry, i) in page" :key="i" class="word-row">
              <div class="meaning-text">{{ trimMeaning(entry.meaning, fontSize > 26 ? 20 : printCols >= 3 ? 22 : 28) }}
              </div>
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
const printWords = ref([])
// 根据当前字体大小和间距动态计算每页能放多少行
const rowsPerPage = computed(() => {
  const fs = Number(fontSize.value) || 16
  const rg = Number(rowGap.value) || 20
  const hg = Number(headerGap.value) || 40
  // 行高 = 意思区高度(字号×1.4×2) + 单词与横线间距 + 横线高度(字号×1.2+4) + 行间距20px
  const rowHeight = fs * 1.4 * 2 + rg + (fs * 1.2 + 4) + 20
  // A4 内容区高度约 700px（96dpi），减去标题区域高度
  const contentHeight = 700 - hg - 40
  return Math.max(8, Math.floor(contentHeight / rowHeight))
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

async function doPrint() {
  await nextTick()
  const target = document.getElementById('printContent')
  if (!target) {
    ElMessage.error('打印内容未准备好')
    return
  }
  const cols = Math.max(1, Number(printCols.value) || 1)
  const headerGapMm = (Number(headerGap.value) || 32) * 25.4 / 96
  const rowGapMm = (Number(rowGap.value) || 22) * 25.4 / 96
  const colGapMm = (Number(colGap.value) || 22) * 25.4 / 96
  // 字号直接用用户设置的 px 值
  const meaningFontSize = Number(fontSize.value) || 16
  // 横线高度 = 字号 × 1.2 + 4，最小 18
  const lineHeight = Math.max(18, Math.round(meaningFontSize * 1.2 + 4))
  // 意思区最小高度 = 字号 × 1.35 × 2（默认两行）
  const meaningMinHeight = Math.max(meaningFontSize * 1.35 * 2, 16)

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const iDoc = iframe.contentWindow.document
  iDoc.open()
  iDoc.write(`<!doctype html><html><head><meta charset="utf-8"><title>单词默写练习</title>
<style>
  @page { size: A4 portrait; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; color: #1f2328; }
  .a4-page {
    width: 100%;
    min-height: calc(100vh - 1px);
    page-break-after: always;
    break-after: page;
    padding: 4mm 0mm;
  }
  .a4-page:last-child { page-break-after: auto; break-after: auto; }
  .a4-page-header {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 14px; font-weight: 700; color: #333;
    padding-bottom: 10px; margin-bottom: ${headerGapMm.toFixed(2)}mm;
    border-bottom: 2px solid #2f6feb;
  }
  .a4-page-no { font-weight: 600; color: #666; font-size: 12px; }
  .a4-body {
    display: grid;
    grid-template-columns: repeat(${cols}, minmax(0, 1fr));
    row-gap: ${(20 * 25.4 / 96).toFixed(2)}mm;
    column-gap: ${colGapMm.toFixed(2)}mm;
  }
  .word-row {
    display: flex;
    flex-direction: column;
    gap: ${rowGapMm.toFixed(2)}mm;
    min-width: 0;
  }
  .meaning-text {
    font-size: ${meaningFontSize}px;
    font-weight: 600;
    line-height: 1.35;
    color: #111827;
    height: ${meaningMinHeight.toFixed(1)}px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
  }
  .meaning-line {
    border-bottom: 1px solid #333;
    height: ${lineHeight}px;
    width: 100%;
  }
</style>
</head><body>${target.innerHTML}</body></html>`)
  iDoc.close()

  iframe.contentWindow.focus()
  setTimeout(() => {
    try {
      iframe.contentWindow.print()
    } catch (e) {
      ElMessage.error('打印触发失败：' + (e.message || e))
    }
    setTimeout(() => {
      if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }, 800)
  }, 300)
}

onMounted(() => {
  // 如果词本内容在 mounted 时已就绪，立即抽取
  if (availableWords.value.length) resamplePrintWords()
})
</script>

<style scoped>
.vocab-print-page {
  --print-max: 1500px;
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
  min-height: 1123px;
  background: #ffffff;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
  padding: 22mm 18mm;
  box-sizing: border-box;
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

.meaning-text {
  font-size: var(--font-size, 16px);
  font-weight: 600;
  line-height: 1.35;
  color: #111827;
  height: calc(var(--font-size, 16px) * 1.35 * 2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
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
