<template>
  <div class="cn-print-page">
    <header class="cn-print-header">
      <div class="cn-print-title-wrap">
        <el-button type="primary" @click="goBack">
          <el-icon>
            <ArrowLeft />
          </el-icon>
          返回
        </el-button>
        <div>
          <h2 class="cn-print-title">中文练习打印</h2>
          <p class="cn-print-subtitle">
            {{ activeBookName }} · {{ subtitleModeHint }} · 共 {{ printPages.length }} 页
          </p>
        </div>
      </div>
      <el-button type="primary" :disabled="!printPages.length" class="cn-print-do" @click="doExportPdf">
        <el-icon>
          <Download />
        </el-icon>
        导出PDF
      </el-button>
    </header>

    <!-- 设置面板（打印时自动隐藏） -->
    <section class="cn-print-panel">
      <div class="cn-panel-section">
        <h3 class="cn-panel-section-title">筛选条件</h3>
        <div class="cn-filter-grid">
          <div class="cn-filter-item">
            <span class="cn-filter-label">掌握水平：</span>
            <el-select v-model="levelFilter" multiple collapse-tags collapse-tags-tooltip clearable placeholder="全部水平">
              <el-option v-for="level in CHINESE_LEVELS" :key="level.value" :label="level.label" :value="level.value" />
            </el-select>
          </div>
          <div class="cn-filter-item">
            <span class="cn-filter-label">词条标签：</span>
            <el-select v-model="tagFilter" multiple collapse-tags collapse-tags-tooltip clearable placeholder="全部标签">
              <el-option v-for="tag in chineseStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
            </el-select>
          </div>
          <div class="cn-filter-item">
            <span class="cn-filter-label">排序方式：</span>
            <el-select v-model="printOrder" placeholder="排序">
              <el-option label="拼音顺序" :value="false" />
              <el-option label="随机打乱" :value="true" />
            </el-select>
          </div>
          <div class="cn-filter-item">
            <span class="cn-filter-label">格子颜色：</span>
            <div class="cn-color-row">
              <el-color-picker v-model="gridColor" />
              <el-button v-for="c in presetColors" :key="c" class="cn-color-dot" :style="{ background: c }" :title="c"
                @click="gridColor = c" />
            </div>
          </div>
        </div>
      </div>

      <div class="cn-panel-section">
        <h3 class="cn-panel-section-title">布局设置</h3>
        <div class="cn-config-row">
          <div class="cn-config-label">
            <el-tooltip placement="right" effect="light">
              <template #content>
                <div class="cn-help-tooltip">
                  <div class="cn-help-title">配置说明</div>
                  <div class="cn-help-section"><b>页面设置</b></div>
                  <div>• H：页面左右内边距（px）</div>
                  <div>• V：页面上下内边距（px）</div>
                  <div class="cn-help-section"><b>中文设置</b></div>
                  <div>• font：中文字号（px）</div>
                  <div>• row：中文占几行高度（每行一组汉字格子）</div>
                  <div>• show：是否显示中文文字（0/1，不影响 grid 格子）</div>
                  <div>• pos：显示顺序（数字小的在上）</div>
                  <div>• grid：格子类型（0无/1米/2田/3口/4横线/5三横线/6四横线）</div>
                  <div class="cn-help-section"><b>拼音设置</b></div>
                  <div>• font：拼音字号（px）</div>
                  <div>• row：拼音占几行高度</div>
                  <div>• show：是否显示拼音文字（0/1，不影响 grid 格子）</div>
                  <div>• pos：显示顺序</div>
                  <div>• grid：格子类型（同上）</div>
                  <div class="cn-help-section"><b>单词设置</b></div>
                  <div>• top/left/right/bottom：单词内边距（px）</div>
                  <div>• align：内容垂直对齐（top/bottom/center）</div>
                  <div>• text-align：内容水平对齐（left/center/right）</div>
                  <div>• background：单词背景色</div>
                  <div>• space：中文与拼音的上下间距（px）</div>
                  <div>• h-space：单词之间的水平间距（px）</div>
                  <div>• v-space：换行后单词之间的垂直间距（px）</div>
                  <div>• mode：打印模式（0默认/1练字/2自由）</div>
                  <div class="cn-help-tip">流式排版：单词按内容宽度排列，末尾放不下时自动换行</div>
                  <div class="cn-help-tip">grid 可用数字 0-6 或名称：无/米/田/口/横/三/四</div>
                </div>
              </template>
              <el-icon class="cn-help-icon">
                <QuestionFilled />
              </el-icon>
            </el-tooltip>
            <div>配置：</div>
          </div>
          <div class="cn-config-wrap">
            <el-input v-model="configText" type="textarea" :rows="7" class="cn-config-textarea" resize="vertical" />
          </div>
        </div>
      </div>
    </section>

    <section v-if="!activeWords.length" class="cn-a4-page cn-a4-empty">
      当前生词本暂无词条，请先回到列表录入或导入中文词。
    </section>
    <section v-else-if="!availableWords.length" class="cn-a4-page cn-a4-empty">
      当前筛选条件下没有可打印的词条，请调整筛选后再试。
    </section>

    <!-- 打印内容区：A4 分页 -->
    <div v-else id="cnPrintContent">
      <div v-for="(page, pageIdx) in printPages" :key="pageIdx" class="cn-a4-page"
        :class="'cn-print-mode-' + safePrintMode" :style="pageStyle">
        <div class="cn-a4-header">
          <span class="cn-a4-title">{{ headerTitle }}</span>
          <span class="cn-a4-info">生词本：{{ activeBookName }}</span>
          <span class="cn-a4-info">模式：【{{ modeName }}】</span>
          <span class="cn-a4-info">标签：【{{ selectedTagNames }}】</span>
          <span class="cn-a4-info">水平：【{{ selectedLevelLabels }}】</span>
          <span class="cn-a4-page-no">第 {{ pageIdx + 1 }} / {{ printPages.length }} 页</span>
        </div>
        <div class="cn-a4-body">
          <!-- 真实单词 cell（默认模式 / 练字模式的第 1 个） -->
          <template v-for="(item, i) in page" :key="(item.type || 'word') + '-' + (item.idx ?? i)">
            <div v-if="item.type === 'word'" class="cn-word-cell" :style="{ width: item.width + 'px' }">
              <div class="cn-cell-content" :style="contentAlignStyle">
                <template v-for="block in printBlocks" :key="block.type">
                  <!-- 中文 block：只显示一遍 -->
                  <div v-if="block.type === 'zh'" class="cn-block cn-block-zh">
                    <div class="cn-zh-row" :style="{ height: gridSizeOf(item) + 'px' }">
                      <div v-for="(char, ci) in charsOf(item.entry)" :key="ci" class="cn-char-cell"
                        :class="'grid-' + safeChineseGrid" :style="gridCellStyle(item)">
                        <span class="cn-gl cn-gl-h"></span>
                        <span class="cn-gl cn-gl-v"></span>
                        <span class="cn-gl cn-gl-d1"></span>
                        <span class="cn-gl cn-gl-d2"></span>
                        <span class="cn-gl cn-gl-h13"></span>
                        <span class="cn-gl cn-gl-h23"></span>
                        <span class="cn-gl cn-gl-h14"></span>
                        <span class="cn-gl cn-gl-h34"></span>
                        <span v-if="safeChineseShow" class="cn-char-text"
                          :style="{ fontSize: safeChineseFont + 'px' }">{{
                            char }}</span>
                      </div>
                    </div>
                  </div>
                  <!-- 拼音 block：只显示一遍 -->
                  <div v-else-if="block.type === 'pinyin'" class="cn-block cn-block-pinyin">
                    <div class="cn-pinyin-row" :class="'pgrid-' + safePinyinGrid"
                      :style="{ height: layout.pinyinLineH + 'px' }">
                      <span v-if="safePinyinShow" class="cn-pinyin-text" :style="{ fontSize: safePinyinFont + 'px' }">{{
                        item.entry.pinyin || '' }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
            <!-- 空 cell：练字模式=与例词同字数的空格组；自由模式=整行共边空格 -->
            <div v-else-if="item.type === 'empty'" class="cn-word-cell cn-empty-cell"
              :class="{ 'is-fill-row': item.fill }" :style="{ width: item.width + 'px' }">
              <div class="cn-cell-content" :style="contentAlignStyle">
                <template v-for="block in printBlocks" :key="'e-' + block.type">
                  <div v-if="block.type === 'zh'" class="cn-block cn-block-zh">
                    <div class="cn-zh-row" :style="{ height: gridSizeOf(item) + 'px' }">
                      <div v-for="n in (item.charCount || 1)" :key="n" class="cn-char-cell"
                        :class="['grid-' + safeChineseGrid, { 'is-fill': item.fill }]" :style="gridCellStyle(item)">
                        <span class="cn-gl cn-gl-h"></span>
                        <span class="cn-gl cn-gl-v"></span>
                        <span class="cn-gl cn-gl-d1"></span>
                        <span class="cn-gl cn-gl-d2"></span>
                        <span class="cn-gl cn-gl-h13"></span>
                        <span class="cn-gl cn-gl-h23"></span>
                        <span class="cn-gl cn-gl-h14"></span>
                        <span class="cn-gl cn-gl-h34"></span>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="block.type === 'pinyin'" class="cn-block cn-block-pinyin">
                    <div class="cn-pinyin-row" :class="'pgrid-' + safePinyinGrid"
                      :style="{ height: layout.pinyinLineH + 'px' }"></div>
                  </div>
                </template>
              </div>
            </div>
            <!-- 逻辑行强制换行（练字模式） -->
            <div v-else class="cn-line-break" aria-hidden="true"></div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Download, QuestionFilled } from '@element-plus/icons-vue'
import { useChineseStore } from '../../stores/chinese.js'
import { CHINESE_LEVELS } from '../../types/index.js'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const router = useRouter()
const chineseStore = useChineseStore({ lazy: true })

// ===== A4 常量（96dpi） =====
const A4_W = 794
const A4_H = 1123

// ===== 筛选状态 =====
const levelFilter = ref([])
const tagFilter = ref([])
const printOrder = ref(false)
const gridColor = ref('#d4a0a0')
const presetColors = ['#d4a0a0', '#4a90d9', '#8a8a8a', '#d97706']

// ===== 配置文本框（参照 vocabulary/print） =====
const DEFAULT_CONFIG_TEXT = `页面设置:H=20,V=30;
中文设置:font=22;row=2;show=1;pos=3;grid=1
拼音设置:font=18;row=1;show=1;pos=2;grid=0
单词设置:top=10,left=2,right=2,bottom=0;align:top;background:#ffffff;text-align:left;h-space:50;v-space:20;mode=0`

const DEFAULTS = {
  pagePaddingH: 20,
  pagePaddingV: 30,
  chineseFont: 22,
  chineseRow: 2,
  chineseShow: true,
  chinesePos: 3,
  chineseGrid: 1,
  pinyinFont: 18,
  pinyinRow: 1,
  pinyinShow: true,
  pinyinPos: 2,
  pinyinGrid: 0,
  cellPaddingTop: 10,
  cellPaddingLeft: 2,
  cellPaddingRight: 2,
  cellPaddingBottom: 0,
  cellAlign: 'top',
  cellBackground: '#ffffff',
  cellTextAlign: 'left',
  cellSpace: 10,
  wordHSpace: 50,
  wordVSpace: 20,
  printMode: 0,
}

const RANGES = {
  pagePaddingH: { min: 0, max: 200 },
  pagePaddingV: { min: 0, max: 200 },
  chineseFont: { min: 6, max: 80 },
  chineseRow: { min: 1, max: 10 },
  chinesePos: { min: 0, max: 99 },
  chineseGrid: { min: 0, max: 6 },
  pinyinFont: { min: 6, max: 80 },
  pinyinRow: { min: 1, max: 10 },
  pinyinPos: { min: 0, max: 99 },
  pinyinGrid: { min: 0, max: 6 },
  cellPaddingTop: { min: 0, max: 100 },
  cellPaddingLeft: { min: 0, max: 100 },
  cellPaddingRight: { min: 0, max: 100 },
  cellPaddingBottom: { min: 0, max: 100 },
  cellSpace: { min: 0, max: 100 },
  wordHSpace: { min: 0, max: 200 },
  wordVSpace: { min: 0, max: 200 },
  printMode: { min: 0, max: 2 },
}

const VALID_ALIGNS = ['top', 'bottom', 'center']
const VALID_TEXT_ALIGNS = ['left', 'center', 'right']
const BOOL_KEYS = new Set(['chineseShow', 'pinyinShow'])

// grid 名称 → 数字映射
const GRID_NAMES = {
  '无': 0, 'none': 0, 'no': 0,
  '米': 1, 'mi': 1,
  '田': 2, 'tian': 2,
  '口': 3, 'kou': 3,
  '横': 4, 'heng': 4, 'line': 4,
  '三': 5, 'san': 5, 'three': 5,
  '四': 6, 'si': 6, 'four': 6,
}

const SECTION_ALIASES = {
  '页面设置': '页面设置', '页面': '页面设置', 'page': '页面设置',
  '中文设置': '中文设置', '中文': '中文设置', 'zh': '中文设置', 'chinese': '中文设置',
  '拼音设置': '拼音设置', '拼音': '拼音设置', 'pinyin': '拼音设置',
  '单词设置': '单词设置', '单词': '单词设置', 'word': '单词设置',
  // 兼容旧配置中的「单元格设置 / 表格设置」写法
  '单元格设置': '单词设置', '单元格': '单词设置', 'cell': '单词设置',
  '表格设置': '单词设置', '表格': '单词设置', 'table': '单词设置',
}

const KEY_ALIASES = {
  '页面设置': {
    'H': 'pagePaddingH', 'h': 'pagePaddingH', 'horizontal': 'pagePaddingH', '左右': 'pagePaddingH',
    'V': 'pagePaddingV', 'v': 'pagePaddingV', 'vertical': 'pagePaddingV', '上下': 'pagePaddingV',
  },
  '中文设置': {
    'font': 'chineseFont', 'size': 'chineseFont', '大小': 'chineseFont', '字号': 'chineseFont',
    'row': 'chineseRow', 'rows': 'chineseRow', '行数': 'chineseRow', '行': 'chineseRow',
    'show': 'chineseShow', '显示': 'chineseShow',
    'pos': 'chinesePos', 'position': 'chinesePos', '位置': 'chinesePos',
    'grid': 'chineseGrid', '格子': 'chineseGrid',
  },
  '拼音设置': {
    'font': 'pinyinFont', 'size': 'pinyinFont', '大小': 'pinyinFont', '字号': 'pinyinFont',
    'row': 'pinyinRow', 'rows': 'pinyinRow', '行数': 'pinyinRow', '行': 'pinyinRow',
    'show': 'pinyinShow', '显示': 'pinyinShow',
    'pos': 'pinyinPos', 'position': 'pinyinPos', '位置': 'pinyinPos',
    'grid': 'pinyinGrid', '格子': 'pinyinGrid',
  },
  '单词设置': {
    'top': 'cellPaddingTop', 'left': 'cellPaddingLeft',
    'right': 'cellPaddingRight', 'bottom': 'cellPaddingBottom',
    'align': 'cellAlign', '对齐': 'cellAlign', '对齐方式': 'cellAlign',
    'background': 'cellBackground', 'bg': 'cellBackground', '背景': 'cellBackground',
    'text-align': 'cellTextAlign', 'textAlign': 'cellTextAlign', '文本对齐': 'cellTextAlign', '文字对齐': 'cellTextAlign',
    'space': 'cellSpace', 'gap': 'cellSpace', '间距': 'cellSpace', '上下间距': 'cellSpace',
    'h-space': 'wordHSpace', 'hspace': 'wordHSpace', 'hSpace': 'wordHSpace',
    '水平间距': 'wordHSpace', '横向间距': 'wordHSpace',
    'v-space': 'wordVSpace', 'vspace': 'wordVSpace', 'vSpace': 'wordVSpace',
    '垂直间距': 'wordVSpace', '纵向间距': 'wordVSpace',
    'mode': 'printMode', '打印模式': 'printMode',
  },
}

function parseBool(val) {
  const v = String(val).trim().toLowerCase()
  if (['否', '不', '无', 'false', '0', 'no', 'n', 'off'].includes(v)) return false
  if (['是', '有', 'true', '1', 'yes', 'y', 'on'].includes(v)) return true
  return null
}

function parseGrid(val) {
  const v = String(val).trim().toLowerCase()
  if (GRID_NAMES[v] !== undefined) return GRID_NAMES[v]
  const n = Number(v)
  if (Number.isFinite(n) && n >= 0 && n <= 6) return n
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
  const sepIdx = pairStr.search(/[=:]/)
  if (sepIdx === -1) return
  const rawKey = pairStr.slice(0, sepIdx).trim()
  const rawVal = pairStr.slice(sepIdx + 1).trim()
  const keyMap = KEY_ALIASES[section]
  if (!keyMap) return
  const canonicalKey = keyMap[rawKey]
  if (!canonicalKey) return

  // grid 参数特殊处理：支持名称和数字
  if (canonicalKey === 'chineseGrid' || canonicalKey === 'pinyinGrid') {
    const g = parseGrid(rawVal)
    if (g !== null) result[canonicalKey] = g
    return
  }

  if (BOOL_KEYS.has(canonicalKey)) {
    const b = parseBool(rawVal)
    if (b !== null) result[canonicalKey] = b
  } else if (canonicalKey === 'cellAlign') {
    const v = rawVal.toLowerCase()
    if (VALID_ALIGNS.includes(v)) result[canonicalKey] = v
  } else if (canonicalKey === 'cellTextAlign') {
    const v = rawVal.toLowerCase()
    if (VALID_TEXT_ALIGNS.includes(v)) result[canonicalKey] = v
  } else if (canonicalKey === 'cellBackground') {
    if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(rawVal) || rawVal === '#') {
      result[canonicalKey] = rawVal === '#' ? '#ffffff' : rawVal
    }
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

// 安全值
const safePagePaddingH = computed(() => parsedConfig.value.pagePaddingH)
const safePagePaddingV = computed(() => parsedConfig.value.pagePaddingV)
const safeChineseFont = computed(() => parsedConfig.value.chineseFont)
const safeChineseShow = computed(() => parsedConfig.value.chineseShow)
const safeChinesePos = computed(() => parsedConfig.value.chinesePos)
const safeChineseGrid = computed(() => parsedConfig.value.chineseGrid)
const safePinyinFont = computed(() => parsedConfig.value.pinyinFont)
const safePinyinShow = computed(() => parsedConfig.value.pinyinShow)
const safePinyinPos = computed(() => parsedConfig.value.pinyinPos)
const safePinyinGrid = computed(() => parsedConfig.value.pinyinGrid)
const safeCellPaddingTop = computed(() => parsedConfig.value.cellPaddingTop)
const safeCellPaddingLeft = computed(() => parsedConfig.value.cellPaddingLeft)
const safeCellPaddingRight = computed(() => parsedConfig.value.cellPaddingRight)
const safeCellPaddingBottom = computed(() => parsedConfig.value.cellPaddingBottom)
const safeCellAlign = computed(() => parsedConfig.value.cellAlign)
const safeCellTextAlign = computed(() => parsedConfig.value.cellTextAlign)
const safeCellBackground = computed(() => parsedConfig.value.cellBackground)
const safeCellSpace = computed(() => parsedConfig.value.cellSpace)
const safeWordHSpace = computed(() => parsedConfig.value.wordHSpace)
const safeWordVSpace = computed(() => parsedConfig.value.wordVSpace)
const safePrintMode = computed(() => parsedConfig.value.printMode || 0)

// 内容块是否渲染：show 只控制文字显隐；只要 grid>0（有格子线），即使 show=0 也必须保留整个块
const zhBlockVisible = computed(() => safeChineseShow.value || safeChineseGrid.value > 0)
const pinyinBlockVisible = computed(() => safePinyinShow.value || safePinyinGrid.value > 0)

// 按 pos 排序的内容块
const orderedBlocks = computed(() => {
  const blocks = []
  if (zhBlockVisible.value) blocks.push({ type: 'zh', pos: safeChinesePos.value })
  if (pinyinBlockVisible.value) blocks.push({ type: 'pinyin', pos: safePinyinPos.value })
  return blocks.sort((a, b) => a.pos - b.pos)
})

function alignToJustify(align) {
  if (align === 'bottom') return 'flex-end'
  if (align === 'center') return 'center'
  return 'flex-start'
}

// ===== 数据 =====
const activeWords = computed(() => chineseStore.words)
const activeBookName = computed(() => chineseStore.getActiveBook()?.name || '默认中文生词本')

const availableWords = computed(() => {
  const levels = Array.isArray(levelFilter.value) ? levelFilter.value : []
  const tags = Array.isArray(tagFilter.value) ? tagFilter.value : []
  return activeWords.value.filter(entry => {
    const matchLevel = !levels.length || levels.includes(entry.level)
    const matchTags = !tags.length || tags.every(id => (entry.tagIds || []).includes(id))
    return matchLevel && matchTags
  })
})

const printWords = ref([])

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

watch([levelFilter, tagFilter, printOrder], () => resamplePrintWords(), { deep: true, immediate: true })
watch(availableWords, () => {
  if (availableWords.value.length > 0 && !printWords.value.length) resamplePrintWords()
})



const selectedTagNames = computed(() => {
  const ids = Array.isArray(tagFilter.value) ? tagFilter.value : []
  if (!ids.length) return '全部'
  const names = ids.map(id => {
    const tag = (chineseStore.tags || []).find(t => t.id === id)
    return tag ? tag.name : ''
  }).filter(Boolean)
  return names.length ? names.join('，') : '全部'
})

const selectedLevelLabels = computed(() => {
  const vals = Array.isArray(levelFilter.value) ? levelFilter.value : []
  if (!vals.length) return '全部'
  const labels = vals.map(v => {
    const level = CHINESE_LEVELS.find(l => l.value === v)
    return level ? level.label : ''
  }).filter(Boolean)
  return labels.length ? labels.join('，') : '全部'
})

const headerTitle = computed(() => {
  const mode = safePrintMode.value
  if (mode === 1) return '练字模式'
  if (mode === 2) return '自由练字'
  if (!safeChineseShow.value && safePinyinShow.value) return '看拼音写词语练习'
  if (safeChineseShow.value && !safePinyinShow.value) return '汉字书写练习'
  if (!safeChineseShow.value && !safePinyinShow.value) return '词语练习'
  return '看拼音写词语练习'
})

const modeName = computed(() => {
  const m = safePrintMode.value
  return m === 1 ? '练字模式' : m === 2 ? '自由模式' : '默认模式'
})

// 实际参与渲染的内容块：自由模式只保留中文 grid，不输出拼音行
const printBlocks = computed(() => {
  if (safePrintMode.value === 2) {
    return safeChineseGrid.value > 0 ? [{ type: 'zh', pos: 0 }] : []
  }
  return orderedBlocks.value
})

// 空格子尺寸：自由模式使用等分整行后的尺寸
function gridSizeOf(item) {
  return item?.gridSize || layout.value.charGridSize
}
function gridCellStyle(item) {
  const size = gridSizeOf(item)
  return {
    height: `${size}px`,
    width: item?.fill ? undefined : `${size}px`
  }
}

const subtitleModeHint = computed(() => {
  const m = safePrintMode.value
  if (m === 1) return `练字模式：每行 1 个词组 + 空格填充（${availableWords.value.length} 个词组）`
  if (m === 2) return '自由模式：整页空白字帖（横向共边铺满，行距受 v-space 控制）'
  return `可打印 ${availableWords.value.length} 个词条 · 流式排版`
})

// ===== 拆字 =====
function charsOf(entry) {
  return Array.from(String(entry?.word || '').trim())
}

// ===== 流式布局计算 =====
const HEADER_LINE_H = 26
const HEADER_PADDING = 14
const HEADER_BORDER = 2
const HEADER_BLOCK_H = HEADER_LINE_H + HEADER_PADDING + HEADER_BORDER

// canvas 文本测量（用于计算拼音实际占位宽度）
let measureCtx = null
function measureTextPx(text) {
  if (!measureCtx) {
    if (typeof document === 'undefined') return 0
    measureCtx = document.createElement('canvas').getContext('2d')
  }
  measureCtx.font = `600 ${safePinyinFont.value}px "Times New Roman", "PingFang SC", serif`
  return measureCtx.measureText(String(text || '')).width
}

const layout = computed(() => {
  // 页面可用内容区域
  const contentW = A4_W - safePagePaddingH.value * 2
  const bodyH = A4_H - safePagePaddingV.value * 2 - HEADER_BLOCK_H

  // 格子尺寸严格跟随字体：约 1.75 倍（如 font=22 → 格子 39px）
  const charGridSize = Math.round(safeChineseFont.value * 1.75)

  // 单词块高度：show=0 但 grid>0 时格子块依然占位
  const pinyinLineH = safePinyinFont.value * 1.6
  const zhH = zhBlockVisible.value ? charGridSize : 0
  const pyH = pinyinBlockVisible.value ? pinyinLineH : 0
  const blockGap = zhBlockVisible.value && pinyinBlockVisible.value ? safeCellSpace.value : 0
  const contentH = zhH + pyH + blockGap
  // 同一行所有单词高度一致（字号/行数固定），加上下内边距即为行高
  const lineH = contentH + safeCellPaddingTop.value + safeCellPaddingBottom.value

  return { contentW, bodyH, charGridSize, pinyinLineH, lineH }
})

// 每个单词按自身内容计算宽度：取「汉字格子行」与「拼音行」的较大值
const laidItems = computed(() => (printWords.value || []).map((entry, idx) => {
  const charCount = charsOf(entry).length
  const zhW = charCount * layout.value.charGridSize
  let pyW = 0
  if (pinyinBlockVisible.value) {
    pyW = Math.ceil(measureTextPx(entry.pinyin))
    if (safePinyinGrid.value > 0) pyW += 2 // 拼音格上下/左右边框补偿
  }
  const contentW = Math.max(zhW, pyW)
  const width = Math.ceil(contentW + safeCellPaddingLeft.value + safeCellPaddingRight.value)
  return { entry, idx, width }
}))

// 流式分页：先按模式装箱（mode=0 贪心、mode=1 每行一词+同字数空组、mode=2 全页共边空字帖），再按行高切页
const printPages = computed(() => {
  const mode = safePrintMode.value
  const { contentW, bodyH, lineH, charGridSize } = layout.value
  const hGap = safeWordHSpace.value
  const vGap = safeWordVSpace.value

  let lines = []
  let modeLineH = lineH
  let modeVGap = vGap

  if (mode === 0) {
    // 默认模式：横向贪心装箱（不改现有逻辑）
    if (!laidItems.value.length) return []
    let line = []
    let usedW = 0
    for (const item of laidItems.value) {
      if (!line.length) {
        line.push({ type: 'word', ...item })
        usedW = item.width
      } else if (usedW + hGap + item.width <= contentW) {
        line.push({ type: 'word', ...item })
        usedW += hGap + item.width
      } else {
        lines.push(line)
        line = [{ type: 'word', ...item }]
        usedW = item.width
      }
    }
    if (line.length) lines.push(line)
  } else if (mode === 1) {
    // 练字模式：每行 1 个真实词组，后面按该词字数成组填空，只放完整组（放不下不显示）
    if (!laidItems.value.length) return []
    for (const item of laidItems.value) {
      const groupW = item.width
      const charCount = charsOf(item.entry).length
      // 剩余空间能放几个完整组（每组前都有 h-space 间隔，放不下整组就不显示）
      const remain = contentW - item.width
      const emptyCount = Math.max(0, Math.floor(remain / (groupW + hGap)))
      const line = [{ type: 'word', ...item }]
      for (let i = 0; i < emptyCount; i++) {
        line.push({ type: 'empty', width: groupW, charCount })
      }
      // 强制换行，防止下一个词挤入本行剩余空间
      line.push({ type: 'break' })
      lines.push(line)
    }
  } else {
    // 自由模式：整页空白临摹字帖——横向共边铺满、无拼音；行距由单词设置 v-space 控制
    if (safeChineseGrid.value === 0) return []
    // 列数按字号格子宽度取整，实际格子宽度等分整行，保证正方形且铺满
    const nCols = Math.max(1, Math.round(contentW / charGridSize))
    const cellSize = contentW / nCols
    modeLineH = cellSize
    modeVGap = vGap
    // 行数需扣除行与行之间的 v-space
    const nRows = Math.max(1, Math.floor((bodyH + vGap) / (cellSize + vGap)))
    for (let r = 0; r < nRows; r++) {
      lines.push([{ type: 'empty', width: contentW, charCount: nCols, gridSize: cellSize, fill: true }])
    }
  }

  if (!lines.length) return []

  // 纵向分页
  const linesPerPage = Math.max(1, Math.floor((bodyH + modeVGap) / (modeLineH + modeVGap)))
  const pages = []
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage).flat())
  }
  return pages
})

const pageStyle = computed(() => ({
  '--cn-grid-color': gridColor.value,
  '--cn-cell-bg': safeCellBackground.value,
  '--cn-cell-pad-t': `${safeCellPaddingTop.value}px`,
  '--cn-cell-pad-l': `${safeCellPaddingLeft.value}px`,
  '--cn-cell-pad-r': `${safeCellPaddingRight.value}px`,
  '--cn-cell-pad-b': `${safeCellPaddingBottom.value}px`,
  '--cn-word-h': `${layout.value.lineH}px`,
  '--cn-h-gap': `${safeWordHSpace.value}px`,
  '--cn-v-gap': `${safeWordVSpace.value}px`,
  paddingTop: `${safePagePaddingV.value}px`,
  paddingBottom: `${safePagePaddingV.value}px`,
  paddingLeft: `${safePagePaddingH.value}px`,
  paddingRight: `${safePagePaddingH.value}px`,
}))

const contentAlignStyle = computed(() => ({
  justifyContent: alignToJustify(safeCellAlign.value),
  alignItems: textAlignToAlignItems(safeCellTextAlign.value),
  '--cn-justify': textAlignToJustify(safeCellTextAlign.value),
  '--cn-block-gap': `${safeCellSpace.value}px`,
}))

function textAlignToAlignItems(align) {
  if (align === 'center') return 'center'
  if (align === 'right') return 'flex-end'
  return 'flex-start'
}

function textAlignToJustify(align) {
  if (align === 'center') return 'center'
  if (align === 'right') return 'flex-end'
  return 'flex-start'
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/chinese')
  }
}

async function doExportPdf() {
  if (!printPages.value.length) return
  const container = document.getElementById('cnPrintContent')
  if (!container) return
  const pages = container.querySelectorAll('.cn-a4-page')
  if (!pages.length) return

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'p' })
  const pageWmm = 210
  const pageHmm = 297

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage()
    const canvas = await html2canvas(pages[i], {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    })
    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    // 等比缩放贴满 A4
    const ratio = Math.min(pageWmm / canvas.width, pageHmm / canvas.height)
    const w = canvas.width * ratio
    const h = canvas.height * ratio
    const x = (pageWmm - w) / 2
    const y = (pageHmm - h) / 2
    pdf.addImage(imgData, 'JPEG', x, y, w, h)
  }

  const bookName = chineseStore.getActiveBook()?.name || '中文生词本'
  const stamp = new Date().toISOString().slice(0, 10)
  pdf.save(`${bookName}-${stamp}.pdf`)
}

onMounted(() => {
  chineseStore.ensureLoaded()
  if (availableWords.value.length) resamplePrintWords()
})
</script>

<style scoped>
.cn-print-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24px 28px 60px;
  background: #efece6;
}

.cn-print-header {
  max-width: 860px;
  margin: 0 auto 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.cn-print-title-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cn-print-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #1c1408;
}

.cn-print-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #8b6645;
}

/* ===== 设置面板 ===== */
.cn-print-panel {
  max-width: 860px;
  margin: 0 auto 22px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.cn-panel-section {
  padding: 18px 22px;
}

.cn-panel-section+.cn-panel-section {
  border-top: 1px solid #f0e8dd;
}

.cn-panel-section-title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 800;
  color: #b8480f;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0e8dd;
}

.cn-filter-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 22px;
  align-items: center;
}

.cn-filter-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.cn-filter-label {
  font-size: 13px;
  font-weight: 700;
  color: #7a563a;
  flex-shrink: 0;
  white-space: nowrap;
  width: 80px;
  text-align: right;
}

.cn-filter-item :deep(.el-select) {
  flex: 1;
  min-width: 0;
}

.cn-color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cn-color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.1);
  padding: 0;
  cursor: pointer;
}

.cn-config-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.cn-config-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: #7a563a;
  flex-shrink: 0;
  white-space: nowrap;
}

.cn-help-icon {
  font-size: 20px;
  color: #b8480f;
  cursor: help;
  flex-shrink: 0;
}

.cn-help-tooltip {
  max-width: 360px;
  font-size: 13px;
  line-height: 1.7;
  color: #333;
}

.cn-help-title {
  font-weight: 800;
  font-size: 14px;
  margin-bottom: 8px;
}

.cn-help-section {
  margin-top: 10px;
  margin-bottom: 2px;
}

.cn-help-section b {
  color: #b8480f;
}

.cn-help-tip {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #d1d5db;
  color: #6b7280;
  font-size: 12px;
}

.cn-config-wrap {
  flex: 1;
  min-width: 0;
}

.cn-config-textarea {
  font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

/* ===== A4 页面 ===== */
.cn-a4-page {
  width: 794px;
  height: 1123px;
  box-sizing: border-box;
  margin: 0 auto 24px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  position: relative;
  overflow: hidden;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.cn-a4-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b6645;
  font-size: 16px;
  padding: 40px;
  text-align: center;
}

.cn-a4-header {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 15px;
  font-weight: 800;
  color: #1c1408;
  padding-bottom: 14px;
  margin-bottom: 20px;
  border-bottom: 2px solid #b8480f;
  white-space: nowrap;
  overflow: hidden;
}

.cn-a4-title {
  font-weight: 800;
  color: #1c1408;
  flex-shrink: 0;
}

.cn-a4-info {
  font-weight: 600;
  color: #4a3320;
  font-size: 13px;
  flex-shrink: 0;
}

.cn-a4-page-no {
  font-weight: 600;
  color: #8b6645;
  font-size: 12px;
  margin-left: auto;
  flex-shrink: 0;
}

/* ===== 流式单词区域 ===== */
.cn-a4-body {
  display: flex;
  flex-flow: row wrap;
  align-content: flex-start;
  align-items: stretch;
  column-gap: var(--cn-h-gap, 50px);
  row-gap: var(--cn-v-gap, 20px);
  width: 100%;
}

.cn-word-cell {
  position: relative;
  display: flex;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
  height: var(--cn-word-h, auto);
  background: var(--cn-cell-bg, #fff);
  padding: var(--cn-cell-pad-t) var(--cn-cell-pad-r) var(--cn-cell-pad-b) var(--cn-cell-pad-l);
}

.cn-cell-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--cn-block-gap, 0);
  min-height: 0;
}

/* ===== 练字模式（mode=1）：逻辑行强制换行标记 ===== */
.cn-line-break {
  flex: 0 0 100%;
  width: 100%;
  height: 0;
  padding: 0;
  border: 0;
  /* 抵消自身产生的额外行间距，保持正常 v-space */
  margin-top: calc(-1 * var(--cn-v-gap, 20px));
}

/* ===== 自由模式（mode=2）：整页空白临摹字帖（横向共边，行距受 v-space 控制） ===== */
.cn-print-mode-2 .cn-a4-body {
  column-gap: 0;
  /* 上下行距使用单词设置 v-space（--cn-v-gap） */
  row-gap: var(--cn-v-gap, 20px);
}

.cn-print-mode-2 .cn-word-cell {
  padding: 0;
  height: auto;
}

.cn-print-mode-2 .cn-cell-content {
  gap: 0;
}

.cn-print-mode-2 .cn-block-zh {
  gap: 0;
}

.cn-print-mode-2 .cn-zh-row {
  flex-wrap: nowrap;
  row-gap: 0;
}

/* 格子等分铺满整行 */
.cn-print-mode-2 .cn-char-cell.is-fill {
  flex: 1 1 0;
  min-width: 0;
}

/* 相邻格子边框重叠为 1px（仅横向共边；行距交给 v-space） */
.cn-print-mode-2 .cn-char-cell.is-fill+.cn-char-cell.is-fill {
  margin-left: -1px;
}

/* ===== 中文 block ===== */
.cn-block-zh {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.cn-zh-row {
  display: flex;
  flex-wrap: wrap;
  row-gap: 2px;
  justify-content: var(--cn-justify, center);
}

/* ===== 汉字格子 ===== */
.cn-char-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow: hidden;
}

/* 所有格子线默认隐藏 */
.cn-char-cell .cn-gl {
  position: absolute;
  pointer-events: none;
  display: none;
}

/* grid-0：无格子 */
.cn-char-cell.grid-0 {
  border: none;
}

/* grid-1：米字格 */
.cn-char-cell.grid-1 {
  border: 1px solid var(--cn-grid-color);
}

.cn-char-cell.grid-1 .cn-gl-h {
  display: block;
}

.cn-char-cell.grid-1 .cn-gl-v {
  display: block;
}

.cn-char-cell.grid-1 .cn-gl-d1 {
  display: block;
}

.cn-char-cell.grid-1 .cn-gl-d2 {
  display: block;
}

/* grid-2：田字格 */
.cn-char-cell.grid-2 {
  border: 1px solid var(--cn-grid-color);
}

.cn-char-cell.grid-2 .cn-gl-h {
  display: block;
}

.cn-char-cell.grid-2 .cn-gl-v {
  display: block;
}

/* grid-3：口字格 */
.cn-char-cell.grid-3 {
  border: 1px solid var(--cn-grid-color);
}

/* grid-4：只显示横线 */
.cn-char-cell.grid-4 {
  border-top: 1px solid var(--cn-grid-color);
  border-bottom: 1px solid var(--cn-grid-color);
}

.cn-char-cell.grid-4 .cn-gl-h {
  display: block;
}

/* grid-5：三横线（类似英语书写） */
.cn-char-cell.grid-5 {
  border-top: 1px solid var(--cn-grid-color);
  border-bottom: 1px solid var(--cn-grid-color);
}

.cn-char-cell.grid-5 .cn-gl-h13 {
  display: block;
}

.cn-char-cell.grid-5 .cn-gl-h23 {
  display: block;
}

/* grid-6：四横线（上下实线 + 1/4、1/2、3/4 三条虚线，四等分） */
.cn-char-cell.grid-6 {
  border-top: 1px solid var(--cn-grid-color);
  border-bottom: 1px solid var(--cn-grid-color);
}

.cn-char-cell.grid-6 .cn-gl-h14 {
  display: block;
}

.cn-char-cell.grid-6 .cn-gl-h {
  display: block;
}

.cn-char-cell.grid-6 .cn-gl-h34 {
  display: block;
}

/* 横线（居中虚线） */
.cn-gl-h {
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px dashed var(--cn-grid-color);
}

/* 竖线（居中虚线） */
.cn-gl-v {
  top: 0;
  bottom: 0;
  left: 50%;
  border-left: 1px dashed var(--cn-grid-color);
}

/* 对角线 */
.cn-gl-d1,
.cn-gl-d2 {
  top: 50%;
  left: 50%;
  width: 141.5%;
  border-top: 1px dashed var(--cn-grid-color);
  transform-origin: center;
}

.cn-gl-d1 {
  transform: translate(-50%, -50%) rotate(45deg);
}

.cn-gl-d2 {
  transform: translate(-50%, -50%) rotate(-45deg);
}

/* 1/3 横线 */
.cn-gl-h13 {
  left: 0;
  right: 0;
  top: 33.33%;
  border-top: 1px dashed var(--cn-grid-color);
}

/* 2/3 横线 */
.cn-gl-h23 {
  left: 0;
  right: 0;
  top: 66.67%;
  border-top: 1px dashed var(--cn-grid-color);
}

/* 1/4 横线 */
.cn-gl-h14 {
  left: 0;
  right: 0;
  top: 25%;
  border-top: 1px dashed var(--cn-grid-color);
}

/* 3/4 横线 */
.cn-gl-h34 {
  left: 0;
  right: 0;
  top: 75%;
  border-top: 1px dashed var(--cn-grid-color);
}

/* 汉字文本 */
.cn-char-text {
  position: relative;
  z-index: 1;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-weight: 600;
  color: #1c1408;
  line-height: 1;
}

/* ===== 拼音 block ===== */
.cn-block-pinyin {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.cn-pinyin-row {
  display: flex;
  align-items: center;
  justify-content: var(--cn-justify, center);
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

/* 拼音格子类型 */
.cn-pinyin-row.pgrid-0 {
  border: none;
}

.cn-pinyin-row.pgrid-1 {
  border: 1px solid var(--cn-grid-color);
}

.cn-pinyin-row.pgrid-1::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px dashed var(--cn-grid-color);
}

.cn-pinyin-row.pgrid-1::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  border-left: 1px dashed var(--cn-grid-color);
}

.cn-pinyin-row.pgrid-2 {
  border: 1px solid var(--cn-grid-color);
}

.cn-pinyin-row.pgrid-2::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px dashed var(--cn-grid-color);
}

.cn-pinyin-row.pgrid-3 {
  border: 1px solid var(--cn-grid-color);
}

.cn-pinyin-row.pgrid-4 {
  border-top: 1px solid var(--cn-grid-color);
  border-bottom: 1px solid var(--cn-grid-color);
}

.cn-pinyin-row.pgrid-5 {
  border-top: 1px solid var(--cn-grid-color);
  border-bottom: 1px solid var(--cn-grid-color);
}

.cn-pinyin-row.pgrid-5::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px dashed var(--cn-grid-color);
}

/* pgrid-6：四横线（上下实线 + 1/4、1/2、3/4 三条虚线，伪元素不够用，改用三层渐变背景） */
.cn-pinyin-row.pgrid-6 {
  border-top: 1px solid var(--cn-grid-color);
  border-bottom: 1px solid var(--cn-grid-color);
  background-image:
    repeating-linear-gradient(to right, var(--cn-grid-color) 0 4px, transparent 4px 9px),
    repeating-linear-gradient(to right, var(--cn-grid-color) 0 4px, transparent 4px 9px),
    repeating-linear-gradient(to right, var(--cn-grid-color) 0 4px, transparent 4px 9px);
  background-size: 100% 1px;
  background-repeat: no-repeat;
  background-position: 0 25%, 0 50%, 0 75%;
}

.cn-pinyin-text {
  position: relative;
  z-index: 1;
  font-family: "Times New Roman", "PingFang SC", serif;
  font-weight: 600;
  color: #333;
  line-height: 1;
  text-align: center;
}

/* ===== 打印输出 ===== */
@page {
  size: A4;
  margin: 0;
}

@media print {
  .cn-print-page {
    padding: 0;
    background: #fff;
  }

  .cn-print-header,
  .cn-print-panel {
    display: none !important;
  }

  #cnPrintContent {
    display: block;
  }

  .cn-a4-page {
    margin: 0;
    box-shadow: none;
    page-break-after: always;
    break-after: page;
  }

  .cn-a4-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
}

@media (max-width: 720px) {
  .cn-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
