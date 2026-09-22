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
          共 {{ printWords.length }} 词 · 每页 {{ wordsPerPage }} · {{ printPages.length }} 页
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
            <div v-if="tagFilter.length > 1" class="tag-relation-line" @click="goVocabularySettings">
              {{ vocabularyStore.tagFilterRelation === 'or' ? '或' : '且' }}
            </div>
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
        <!-- <h3 class="panel-section-title">布局设置</h3> -->
        <div class="layout-grid">
          <div class="layout-item print-mode-row">
            <div class="layout-label">打印模式：</div>
            <el-segmented v-model="printMode" :options="MODE_OPTIONS" @change="setPrintMode" />
          </div>
          <div class="layout-item config-row">
            <div class="layout-label">

              <el-tooltip placement="right" effect="light">
                <template #content>
                  <div class="help-tooltip">
                    <div class="help-title">配置说明</div>
                    <div class="help-section"><b>页面设置</b></div>
                    <div>• H：页面左右内边距（px）</div>
                    <div>• V：页面上下内边距（px）</div>
                    <div class="help-section"><b>表格设置</b></div>
                    <div>• row：每页行数</div>
                    <div>• col：每行单元格数</div>
                    <div>• show-border：是否显示边框（true/false）</div>
                    <div>• border-width：单元格边框厚度（px）</div>
                    <div class="help-section"><b>中文设置</b></div>
                    <div>• font：中文字号（px）</div>
                    <div>• row：中文最多显示几行</div>
                    <div>• show：是否显示中文（true/false）</div>
                    <div>• pos：显示顺序（数字小的在前）</div>
                    <div class="help-section"><b>英文设置</b></div>
                    <div>• font：英文字号（px）</div>
                    <div>• row：英文最多显示几行</div>
                    <div>• show：是否显示英文（true/false）</div>
                    <div>• pos：显示顺序（数字小的在前）</div>
                    <div class="help-section"><b>下划线设置</b></div>
                    <div>• height：下划线粗细（px）</div>
                    <div>• bottom：下划线距离单元格底部的间距（px）</div>
                    <div>• show：是否显示下划线（true/false）</div>
                    <div class="help-section"><b>单元格设置</b></div>
                    <div>• top/left/right/bottom：单元格内边距（px）</div>
                    <div>• align：内容对齐方式（top/bottom/center）</div>
                    <div>• background：单元格背景色（#ffffff）</div>
                    <div>• v-space：英文和中文内容之间的垂直间距（px）</div>
                    <div class="help-tip">值无效或缺失时回退默认值；;可分隔章节和键值对</div>
                  </div>
                </template>
                <el-icon class="help-icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
              <div>配置：</div>
            </div>
            <div class="config-wrap">
              <el-input v-model="configText" type="textarea" :rows="7" class="config-textarea" resize="vertical" />

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
        <div v-for="(page, pageIdx) in printPages" :key="pageIdx" class="a4-page" :style="getPageStyle()">
          <div class="a4-page-header">
            <span class="a4-page-title">单词默写练习</span>
            <span class="a4-page-info">单词本：{{ defaultBook?.name || '默认生词本' }}</span>
            <span class="a4-page-info">标签：【{{ selectedTagNames }}】<template v-if="tagFilter.length > 1">{{
              tagFilterRelationLabel }}</template></span>
            <span class="a4-page-info">掌握水平：【{{ selectedLevelLabels }}】</span>
            <span class="a4-page-no">第 {{ pageIdx + 1 }} / {{ printPages.length }} 页</span>
          </div>
          <div class="a4-body" :class="{ 'show-border': safeTableShowBorder }">
            <div v-for="(entry, i) in page" :key="i" class="word-cell" :class="{ 'show-border': safeTableShowBorder }">
              <div v-if="safeUnderlineShow" class="word-underline"></div>
              <div class="word-content">
                <template v-for="block in orderedBlocks" :key="block.type">
                  <div v-if="block.type === 'en'" class="word-en">
                    <span class="word-en-text">{{ entry.word }}</span>
                  </div>
                  <div v-else-if="block.type === 'zh'" class="word-zh">
                    <span class="word-zh-text">{{ getDisplayMeaning(entry) }}</span>
                  </div>
                </template>
              </div>
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
import { ArrowLeft, Printer, QuestionFilled } from '@element-plus/icons-vue'
import { useVocabularyStore } from '../../stores/vocabulary.js'
import { VOCABULARY_LEVELS } from '../../types/index.js'
import { matchTagFilter } from '../../utils/tagFilter.js'

const router = useRouter()
const vocabularyStore = useVocabularyStore()

// 筛选条件
const levelFilter = ref([])
const tagFilter = ref([])
const wrongCountMin = ref(null)
const wrongCountMax = ref(null)
const printOrder = ref(false)

// 配置文本框：所有数值型布局参数集中在此
const DEFAULT_CONFIG_TEXT = `页面设置:H=20,V=30;
表格设置:row=10;col=4;show-border=0;border-width=1
中文设置:font=16;row=2;show=1;pos=3
英文设置:font=16;row=1;show=1;pos=2
下划线设置:height=1;bottom=5;show=true
单元格设置:top=10,left=10,right=10,bottom=0;align:top;background:#ffffff;v-space=5`

// 打印模式：三种模式仅默认配置不同，切换后整体替换 configText
const MODE_CONFIGS = {
  0: DEFAULT_CONFIG_TEXT,
  1: `页面设置:H=20,V=30;
表格设置:row=10;col=4;show-border=0;border-width=1
中文设置:font=16;row=2;show=1;pos=1
英文设置:font=16;row=1;show=0;pos=2
下划线设置:height=1;bottom=5;show=true
单元格设置:top=10,left=10,right=10,bottom=0;align:top;background:#ffffff;v-space=5`,
  2: `页面设置:H=20,V=30;
表格设置:row=10;col=4;show-border=0;border-width=1
中文设置:font=16;row=2;show=0;pos=1
英文设置:font=16;row=1;show=1;pos=2
下划线设置:height=1;bottom=5;show=true
单元格设置:top=10,left=10,right=10,bottom=0;align:top;background:#ffffff;v-space=5`,
}
const MODE_OPTIONS = [
  { label: '默认模式', value: 0 },
  { label: '中译英模式', value: 1 },
  { label: '英译中模式', value: 2 },
]

const DEFAULTS = {
  pagePaddingH: 20,
  pagePaddingV: 30,
  tableRows: 10,
  tableCols: 4,
  tableShowBorder: false,
  tableBorderWidth: 1,
  chineseFont: 16,
  chineseRow: 2,
  chineseShow: true,
  chinesePos: 1,
  englishFont: 16,
  englishRow: 1,
  englishShow: true,
  englishPos: 2,
  underlineHeight: 1,
  underlineBottom: 5,
  underlineShow: true,
  cellPaddingTop: 10,
  cellPaddingLeft: 10,
  cellPaddingRight: 10,
  cellPaddingBottom: 0,
  cellAlign: 'top',
  cellBackground: '#ffffff',
  cellVSpace: 5,
}

const RANGES = {
  pagePaddingH: { min: 0, max: 200 },
  pagePaddingV: { min: 0, max: 200 },
  tableRows: { min: 1, max: 50 },
  tableCols: { min: 1, max: 10 },
  tableBorderWidth: { min: 0, max: 10 },
  chineseFont: { min: 6, max: 80 },
  chineseRow: { min: 1, max: 10 },
  chinesePos: { min: 0, max: 99 },
  englishFont: { min: 6, max: 80 },
  englishRow: { min: 1, max: 10 },
  englishPos: { min: 0, max: 99 },
  underlineHeight: { min: 0, max: 20 },
  underlineBottom: { min: 0, max: 100 },
  cellPaddingTop: { min: 0, max: 100 },
  cellPaddingLeft: { min: 0, max: 100 },
  cellPaddingRight: { min: 0, max: 100 },
  cellPaddingBottom: { min: 0, max: 100 },
  cellVSpace: { min: 0, max: 100 },
}

const VALID_ALIGNS = ['top', 'bottom', 'center']
const BOOL_KEYS = new Set(['tableShowBorder', 'chineseShow', 'englishShow', 'underlineShow'])

const SECTION_ALIASES = {
  '页面设置': '页面设置', '页面': '页面设置', 'page': '页面设置',
  '表格设置': '表格设置', '表格': '表格设置', 'table': '表格设置',
  '中文设置': '中文设置', '中文': '中文设置', 'zh': '中文设置', 'chinese': '中文设置',
  '英文设置': '英文设置', '英文': '英文设置', 'en': '英文设置', 'english': '英文设置',
  '下划线设置': '下划线设置', '下划线': '下划线设置', 'underline': '下划线设置',
  '单元格设置': '单元格设置', '单元格': '单元格设置', 'cell': '单元格设置',
}

const KEY_ALIASES = {
  '页面设置': {
    'H': 'pagePaddingH', 'h': 'pagePaddingH', 'horizontal': 'pagePaddingH', '左右': 'pagePaddingH',
    'V': 'pagePaddingV', 'v': 'pagePaddingV', 'vertical': 'pagePaddingV', '上下': 'pagePaddingV',
  },
  '表格设置': {
    'row': 'tableRows', 'rows': 'tableRows', '行': 'tableRows',
    'col': 'tableCols', 'cols': 'tableCols', 'columns': 'tableCols', '列': 'tableCols', '列表': 'tableCols',
    'show-border': 'tableShowBorder', 'showBorder': 'tableShowBorder', '显示边框': 'tableShowBorder', '边框': 'tableShowBorder',
    'border-width': 'tableBorderWidth', 'borderWidth': 'tableBorderWidth', '厚度': 'tableBorderWidth',
  },
  '中文设置': {
    'font': 'chineseFont', 'size': 'chineseFont', '大小': 'chineseFont', '字号': 'chineseFont',
    'row': 'chineseRow', 'rows': 'chineseRow', '行数': 'chineseRow',
    'show': 'chineseShow', '显示': 'chineseShow',
    'pos': 'chinesePos', 'position': 'chinesePos', '位置': 'chinesePos',
  },
  '英文设置': {
    'font': 'englishFont', 'size': 'englishFont', '大小': 'englishFont', '字号': 'englishFont',
    'row': 'englishRow', 'rows': 'englishRow', '行数': 'englishRow',
    'show': 'englishShow', '显示': 'englishShow',
    'pos': 'englishPos', 'position': 'englishPos', '位置': 'englishPos',
  },
  '下划线设置': {
    'height': 'underlineHeight', '厚度': 'underlineHeight', 'thickness': 'underlineHeight',
    'bottom': 'underlineBottom', '底部': 'underlineBottom',
    'show': 'underlineShow', '显示': 'underlineShow',
  },
  '单元格设置': {
    'top': 'cellPaddingTop', 'left': 'cellPaddingLeft',
    'right': 'cellPaddingRight', 'bottom': 'cellPaddingBottom',
    'align': 'cellAlign', '对齐': 'cellAlign', '对齐方式': 'cellAlign',
    'background': 'cellBackground', 'bg': 'cellBackground', '背景': 'cellBackground',
    'v-space': 'cellVSpace', 'vspace': 'cellVSpace', '垂直间距': 'cellVSpace',
  },
}

function parseBool(val) {
  const v = String(val).trim().toLowerCase()
  if (['否', '不', '无', 'false', '0', 'no', 'n', 'off'].includes(v)) return false
  if (['是', '有', 'true', '1', 'yes', 'y', 'on'].includes(v)) return true
  return null
}

function parseConfig(text) {
  const result = { ...DEFAULTS }
  if (!text || typeof text !== 'string') return result

  const tokens = text.split(/[\r\n;]+/)
  let currentSection = null

  for (const rawToken of tokens) {
    const token = rawToken.trim()
    if (!token) continue

    const colonIdx = token.indexOf(':')
    if (colonIdx !== -1) {
      const sectionName = token.slice(0, colonIdx).trim()
      const canonical = SECTION_ALIASES[sectionName]
      if (canonical) {
        currentSection = canonical
        const rest = token.slice(colonIdx + 1).trim()
        if (rest) {
          for (const pair of rest.split(',')) {
            applyPair(result, currentSection, pair.trim())
          }
        }
        continue
      }
    }

    if (currentSection) {
      applyPair(result, currentSection, token)
    }
  }
  return result
}

function applyPair(result, section, pairStr) {
  if (!pairStr) return
  // 接受 = 或 : 作为键值分隔符
  const sepIdx = pairStr.search(/[=:]/)
  if (sepIdx === -1) return
  const rawKey = pairStr.slice(0, sepIdx).trim()
  const rawVal = pairStr.slice(sepIdx + 1).trim()
  const keyMap = KEY_ALIASES[section]
  if (!keyMap) return
  const canonicalKey = keyMap[rawKey]
  if (!canonicalKey) return

  if (BOOL_KEYS.has(canonicalKey)) {
    const b = parseBool(rawVal)
    if (b !== null) result[canonicalKey] = b
  } else if (canonicalKey === 'cellAlign') {
    const v = rawVal.toLowerCase()
    if (VALID_ALIGNS.includes(v)) result[canonicalKey] = v
  } else if (canonicalKey === 'cellBackground') {
    if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(rawVal)) result[canonicalKey] = rawVal
  } else {
    const n = Number(rawVal)
    if (Number.isFinite(n)) {
      const range = RANGES[canonicalKey]
      if (!range || (n >= range.min && n <= range.max)) {
        result[canonicalKey] = n
      }
    }
  }
}

const configText = ref(DEFAULT_CONFIG_TEXT)
const parsedConfig = computed(() => parseConfig(configText.value))

// 从解析结果派生的安全值
const safeTableRows = computed(() => parsedConfig.value.tableRows)
const safeTableCols = computed(() => parsedConfig.value.tableCols)
const safeTableShowBorder = computed(() => parsedConfig.value.tableShowBorder)
const safeTableBorderWidth = computed(() => parsedConfig.value.tableBorderWidth)
const safeChineseFont = computed(() => parsedConfig.value.chineseFont)
const safeChineseRow = computed(() => parsedConfig.value.chineseRow)
const safeChineseShow = computed(() => parsedConfig.value.chineseShow)
const safeChinesePos = computed(() => parsedConfig.value.chinesePos)
const safeEnglishFont = computed(() => parsedConfig.value.englishFont)
const safeEnglishRow = computed(() => parsedConfig.value.englishRow)
const safeEnglishShow = computed(() => parsedConfig.value.englishShow)
const safeEnglishPos = computed(() => parsedConfig.value.englishPos)
const safeUnderlineHeight = computed(() => parsedConfig.value.underlineHeight)
const safeUnderlineBottom = computed(() => parsedConfig.value.underlineBottom)
const safeUnderlineShow = computed(() => parsedConfig.value.underlineShow)
const safeCellPaddingTop = computed(() => parsedConfig.value.cellPaddingTop)
const safeCellPaddingLeft = computed(() => parsedConfig.value.cellPaddingLeft)
const safeCellPaddingRight = computed(() => parsedConfig.value.cellPaddingRight)
const safeCellPaddingBottom = computed(() => parsedConfig.value.cellPaddingBottom)
const safeCellAlign = computed(() => parsedConfig.value.cellAlign)
const safeCellBackground = computed(() => parsedConfig.value.cellBackground)
const safeCellVSpace = computed(() => parsedConfig.value.cellVSpace)
const safePagePaddingH = computed(() => parsedConfig.value.pagePaddingH)
const safePagePaddingV = computed(() => parsedConfig.value.pagePaddingV)

// 按 pos 排序的内容块（中文/英文）
const orderedBlocks = computed(() => {
  const blocks = []
  if (safeChineseShow.value) {
    blocks.push({ type: 'zh', pos: safeChinesePos.value })
  }
  if (safeEnglishShow.value) {
    blocks.push({ type: 'en', pos: safeEnglishPos.value })
  }
  return blocks.sort((a, b) => a.pos - b.pos)
})

function alignToJustify(align) {
  if (align === 'bottom') return 'flex-end'
  if (align === 'center') return 'center'
  return 'flex-start'
}

const printWords = ref([])
const exportingPdf = ref(false)
const printMode = ref(0)

function setPrintMode(val) {
  printMode.value = val
  if (MODE_CONFIGS[val] != null) {
    configText.value = MODE_CONFIGS[val]
  }
}

const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123
const HEADER_FONT_SIZE = 15
const HEADER_LINE_HEIGHT = Math.ceil(HEADER_FONT_SIZE * 1.35)
const HEADER_PADDING_BOTTOM = 10
const HEADER_BORDER_HEIGHT = 2
const HEADER_BLOCK_HEIGHT = HEADER_LINE_HEIGHT + HEADER_PADDING_BOTTOM + HEADER_BORDER_HEIGHT
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
    const matchTags = matchTagFilter(entry.tagIds, selectedTags, vocabularyStore.tagFilterRelation)
    const wrongCount = Math.max(0, (Number(entry.testTotalCount) || 0) - (Number(entry.testCorrectCount) || 0))
    const matchMin = min === null || wrongCount >= min
    const matchMax = max === null || wrongCount <= max
    return matchLevel && matchTags && matchMin && matchMax
  })
})

const wordsPerPage = computed(() => safeTableRows.value * safeTableCols.value)

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

const selectedTagNames = computed(() => {
  const ids = Array.isArray(tagFilter.value) ? tagFilter.value : []
  if (!ids.length) return '全部'
  const names = ids.map(id => {
    const tag = (defaultTags.value || []).find(t => t.id === id)
    return tag ? tag.name : ''
  }).filter(Boolean)
  return names.length ? names.join('，') : '全部'
})

function goVocabularySettings() {
  router.push('/vocabulary/settings')
}

const tagFilterRelationLabel = computed(() => vocabularyStore.tagFilterRelation === 'or' ? '（或）' : '（且）')

const selectedLevelLabels = computed(() => {
  const vals = Array.isArray(levelFilter.value) ? levelFilter.value : []
  if (!vals.length) return '全部'
  const labels = vals.map(v => {
    const level = VOCABULARY_LEVELS.find(l => l.value === v)
    return level ? level.label : ''
  }).filter(Boolean)
  return labels.length ? labels.join('，') : '全部'
})

function getPageStyle() {
  const padV = safePagePaddingV.value
  const bodyHeight = A4_HEIGHT_PX - padV * 3 - HEADER_BLOCK_HEIGHT
  return {
    '--page-padding-h': `${safePagePaddingH.value}px`,
    '--page-padding-v': `${padV}px`,
    '--a4-body-height': `${bodyHeight}px`,
    '--table-rows': safeTableRows.value,
    '--table-cols': safeTableCols.value,
    '--table-border-width': `${safeTableBorderWidth.value}px`,
    '--en-size': `${safeEnglishFont.value}px`,
    '--en-lines': safeEnglishRow.value,
    '--en-line-height': `${safeEnglishFont.value * 1.35}px`,
    '--en-block-height': `${safeEnglishFont.value * 1.35 * safeEnglishRow.value}px`,
    '--zh-size': `${safeChineseFont.value}px`,
    '--zh-lines': safeChineseRow.value,
    '--zh-line-height': `${safeChineseFont.value * 1.35}px`,
    '--zh-block-height': `${safeChineseFont.value * 1.35 * safeChineseRow.value}px`,
    '--underline-height': `${safeUnderlineHeight.value}px`,
    '--underline-bottom': `${safeUnderlineBottom.value}px`,
    '--cell-padding-top': `${safeCellPaddingTop.value}px`,
    '--cell-padding-left': `${safeCellPaddingLeft.value}px`,
    '--cell-padding-right': `${safeCellPaddingRight.value}px`,
    '--cell-padding-bottom': `${safeCellPaddingBottom.value}px`,
    '--cell-align-justify': alignToJustify(safeCellAlign.value),
    '--cell-background': safeCellBackground.value,
    '--cell-vspace': `${safeCellVSpace.value}px`,
  }
}

function getDisplayMeaning(entry) {
  return trimChineseMeaning(entry.meaning, getMeaningMaxLen())
}

function getMeaningMaxLen() {
  const zhSize = safeChineseFont.value
  const cols = safeTableCols.value
  const padH = safePagePaddingH.value
  const cellPadLR = safeCellPaddingLeft.value + safeCellPaddingRight.value
  const cellWidth = (A4_WIDTH_PX - padH * 2) / cols
  const charWidth = zhSize * 0.55
  return Math.max(8, Math.floor((cellWidth - cellPadLR) / charWidth))
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
  printWords.value = printOrder.value ? shuffleWords(candidates) : [...candidates]
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

watch([levelFilter, tagFilter, wrongCountMin, wrongCountMax, printOrder], () => {
  resamplePrintWords()
}, { deep: true, immediate: true })

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

  const rows = safeTableRows.value
  const cols = safeTableCols.value
  const padH = safePagePaddingH.value
  const padV = safePagePaddingV.value
  const showBorder = safeTableShowBorder.value
  const borderW = safeTableBorderWidth.value
  const enSize = safeEnglishFont.value
  const enLines = safeEnglishRow.value
  const zhSize = safeChineseFont.value
  const zhLines = safeChineseRow.value
  const ulHeight = safeUnderlineHeight.value
  const ulBottom = safeUnderlineBottom.value
  const cellPadTop = safeCellPaddingTop.value
  const cellPadLeft = safeCellPaddingLeft.value
  const cellPadRight = safeCellPaddingRight.value
  const cellPadBottom = safeCellPaddingBottom.value
  const cellAlign = safeCellAlign.value
  const cellVSpace = safeCellVSpace.value

  const contentWidth = A4_WIDTH_PX - padH * 2
  ctx.textBaseline = 'top'

  // 页眉
  const headerItems = [
    { text: '单词默写练习', bold: true, color: '#111827', size: HEADER_FONT_SIZE },
    { text: `单词本：${defaultBook.value?.name || '默认生词本'}`, bold: false, color: '#374151', size: HEADER_FONT_SIZE },
    { text: `标签：【${selectedTagNames.value}】${tagFilter.value.length > 1 ? tagFilterRelationLabel.value : ''}`, bold: false, color: '#374151', size: HEADER_FONT_SIZE },
    { text: `掌握水平：【${selectedLevelLabels.value}】`, bold: false, color: '#374151', size: HEADER_FONT_SIZE }
  ]
  let curX = padH
  headerItems.forEach(item => {
    ctx.font = `${item.bold ? '800' : '600'} ${item.size}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.fillStyle = item.color
    ctx.fillText(item.text, curX, padV)
    curX += ctx.measureText(item.text).width + 20
  })
  ctx.font = `600 12px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.fillStyle = '#6b7280'
  const pageNo = `第 ${pageIndex + 1} / ${totalPages} 页`
  ctx.fillText(pageNo, padH + contentWidth - ctx.measureText(pageNo).width, padV + 2)

  const headerLineY = padV + HEADER_LINE_HEIGHT + HEADER_PADDING_BOTTOM
  ctx.strokeStyle = '#2f6feb'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(padH, headerLineY + 1)
  ctx.lineTo(padH + contentWidth, headerLineY + 1)
  ctx.stroke()

  const bodyTop = headerLineY + HEADER_BORDER_HEIGHT + padV
  const bodyHeight = A4_HEIGHT_PX - bodyTop - padV
  const cellW = contentWidth / cols
  const cellH = bodyHeight / rows

  const enLh = enSize * 1.35
  const zhLh = zhSize * 1.35
  const cellInnerW = cellW - cellPadLeft - cellPadRight

  pageEntries.forEach((entry, index) => {
    if (index >= rows * cols) return
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = padH + col * cellW
    const y = bodyTop + row * cellH

    // 单元格背景
    const cellBg = safeCellBackground.value
    if (cellBg) {
      ctx.fillStyle = cellBg
      ctx.fillRect(x, y, cellW, cellH)
      ctx.fillStyle = '#111827'
    }

    // 单元格边框
    if (showBorder && borderW > 0) {
      ctx.strokeStyle = '#333'
      ctx.lineWidth = borderW
      ctx.strokeRect(x + borderW / 2, y + borderW / 2, cellW - borderW, cellH - borderW)
    }

    // 内容区起点（扣除单元格内边距）
    const contentX = x + cellPadLeft
    const contentY0 = y + cellPadTop
    const contentW = cellW - cellPadLeft - cellPadRight
    const contentH = cellH - cellPadTop - cellPadBottom

    // 下划线固定在单元格底部上方 ulBottom 像素处
    if (safeUnderlineShow.value && ulHeight > 0) {
      const ulCenterY = y + cellH - cellPadBottom - ulBottom - ulHeight / 2
      ctx.strokeStyle = '#333'
      ctx.lineWidth = ulHeight
      ctx.beginPath()
      ctx.moveTo(contentX, ulCenterY)
      ctx.lineTo(contentX + contentW, ulCenterY)
      ctx.stroke()
    }

    // 计算内容块总高度，按对齐方式定位（内容不受下划线影响，独立对齐）
    const enBlockH = enLines * enLh
    const zhBlockH = zhLines * zhLh
    let totalH = 0
    if (safeEnglishShow.value) totalH += enBlockH
    if (safeChineseShow.value) totalH += zhBlockH
    if (safeEnglishShow.value && safeChineseShow.value) totalH += cellVSpace

    let contentStartY
    if (cellAlign === 'bottom') {
      contentStartY = contentY0 + Math.max(0, contentH - totalH)
    } else if (cellAlign === 'center') {
      contentStartY = contentY0 + Math.max(0, (contentH - totalH) / 2)
    } else {
      contentStartY = contentY0
    }

    let curY = contentStartY
    const drawEn = () => {
      if (!safeEnglishShow.value) return
      ctx.font = `700 ${enSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.fillStyle = '#111827'
      ctx.textAlign = 'center'
      const word = entry.word || ''
      const lines = fitTextLines(word, enLines, cellInnerW, ctx)
      const drawn = lines.slice(0, enLines)
      const startY = curY
      drawn.forEach((line, i) => {
        ctx.fillText(line, contentX + contentW / 2, startY + i * enLh)
      })
      curY += enBlockH
    }
    const drawZh = () => {
      if (!safeChineseShow.value) return
      ctx.font = `600 ${zhSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.fillStyle = '#111827'
      ctx.textAlign = 'center'
      const meaning = trimChineseMeaning(entry.meaning, Math.floor(cellInnerW / (zhSize * 0.55)) * zhLines)
      const lines = fitTextLines(meaning, zhLines, cellInnerW, ctx)
      const drawn = lines.slice(0, zhLines)
      const startY = curY
      drawn.forEach((line, i) => {
        ctx.fillText(line, contentX + contentW / 2, startY + i * zhLh)
      })
      curY += zhBlockH
    }

    orderedBlocks.value.forEach((block, index) => {
      if (block.type === 'en') drawEn()
      else if (block.type === 'zh') drawZh()
      if (index < orderedBlocks.value.length - 1) curY += cellVSpace
    })
  })

  ctx.textAlign = 'left'
  return {
    width: canvas.width,
    height: canvas.height,
    bytes: base64ToBytes(canvas.toDataURL('image/jpeg', 0.96).split(',')[1])
  }
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

.tag-relation-line {
  font-size: 12px;
  color: #fff;
  width: 30px;
  height: 30px;
  line-height: 30px;
  text-align: center;
  border-radius: 15px;
  background: #609d80;

  cursor: pointer;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}



.tag-relation-link {
  padding: 0;
  border: none;
  background: none;
  color: #609d80;
  font-size: 13px;
  cursor: pointer;
}

.tag-relation-link:hover {
  text-decoration: underline;
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
  display: flex;
  align-items: center;
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

.layout-item :deep(.el-select) {
  flex: 1;
  min-width: 0;
}

.config-row {
  grid-column: 1 / -1;
  height: auto;
  min-height: 0;
  align-items: flex-start;
}

.print-mode-row {
  grid-column: 1 / -1;
}

.config-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.config-textarea {
  flex: 1;
  font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.help-icon {
  font-size: 20px;
  color: #11873a;
  cursor: help;
  flex-shrink: 0;
  margin-right: 4px;
  /* margin-top: 6px; */
}

.help-tooltip {
  max-width: 360px;
  font-size: 13px;
  line-height: 1.7;
  color: #333;
}

.help-title {
  font-weight: 800;
  font-size: 14px;
  margin-bottom: 8px;
  color: #111827;
}

.help-section {
  margin-top: 10px;
  margin-bottom: 2px;
  color: #1f2937;
}

.help-section b {
  color: #2f6feb;
}

.help-tooltip .help-section+div {
  padding-left: 4px;
}

.help-tip {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #d1d5db;
  color: #6b7280;
  font-size: 12px;
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
  padding: var(--page-padding-v) var(--page-padding-h);
  box-sizing: border-box;
  overflow: hidden;
}

.a4-page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 15px;
  font-weight: 800;
  color: #111827;
  padding-bottom: 10px;
  margin-bottom: var(--page-padding-v);
  border-bottom: 2px solid #2f6feb;
  white-space: nowrap;
  overflow: hidden;
}

.a4-page-title {
  font-weight: 800;
  color: #111827;
  flex-shrink: 0;
}

.a4-page-info {
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  flex-shrink: 0;
}

.a4-page-no {
  font-weight: 600;
  color: #6b7280;
  font-size: 12px;
  margin-left: auto;
  flex-shrink: 0;
}

.a4-body {
  display: grid;
  grid-template-columns: repeat(var(--table-cols), 1fr);
  grid-template-rows: repeat(var(--table-rows), 1fr);
  width: 100%;
  height: var(--a4-body-height);
}

.a4-body.show-border {
  border-top: var(--table-border-width) solid #333;
  border-left: var(--table-border-width) solid #333;
}

.word-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
  background: var(--cell-background, #ffffff);
  padding: var(--cell-padding-top) var(--cell-padding-right) var(--cell-padding-bottom) var(--cell-padding-left);
}

.word-cell.show-border {
  border-right: var(--table-border-width) solid #333;
  border-bottom: var(--table-border-width) solid #333;
}

.word-underline {
  position: absolute;
  left: var(--cell-padding-left);
  right: var(--cell-padding-right);
  bottom: calc(var(--underline-bottom) + var(--cell-padding-bottom));
  height: var(--underline-height);
  background: #333;
}

.word-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: var(--cell-align-justify);
  gap: var(--cell-vspace, 0px);
  min-height: 0;
}

.word-en {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--en-block-height);
  overflow: hidden;
}

.word-en-text {
  font-size: var(--en-size);
  font-weight: 700;
  line-height: var(--en-line-height);
  color: #111827;
  text-align: center;
  display: -webkit-box;
  display: box;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  -webkit-line-clamp: var(--en-lines);
  line-clamp: var(--en-lines);
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  max-width: 100%;
}

.word-zh {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--zh-block-height);
  overflow: hidden;
}

.word-zh-text {
  font-size: var(--zh-size);
  font-weight: 600;
  line-height: var(--zh-line-height);
  color: #111827;
  text-align: center;
  display: -webkit-box;
  display: box;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  -webkit-line-clamp: var(--zh-lines);
  line-clamp: var(--zh-lines);
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  white-space: normal;
  max-width: 100%;
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

  .config-row {
    grid-column: 1 / -1;
  }
}
</style>
