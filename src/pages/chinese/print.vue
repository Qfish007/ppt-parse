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
            {{ activeBookName }} · 可打印 {{ availableWords.length }} 个词条 ·
            每页 {{ rows * cols }} 个词语 · 共 {{ printPages.length }} 页
          </p>
        </div>
      </div>
      <el-button type="primary" :disabled="!printPages.length" class="cn-print-do" @click="doPrint">
        <el-icon>
          <Printer />
        </el-icon>
        打印 / 导出PDF
      </el-button>
    </header>

    <!-- 设置面板（打印时自动隐藏） -->
    <section class="cn-print-panel">
      <div class="cn-panel-block">
        <h3 class="cn-panel-title">筛选条件</h3>
        <div class="cn-panel-grid">
          <div class="cn-panel-item">
            <label>掌握水平</label>
            <el-select v-model="levelFilter" multiple collapse-tags collapse-tags-tooltip clearable placeholder="全部水平">
              <el-option v-for="level in CHINESE_LEVELS" :key="level.value" :label="level.label" :value="level.value" />
            </el-select>
          </div>
          <div class="cn-panel-item">
            <label>词条标签</label>
            <el-select v-model="tagFilter" multiple collapse-tags collapse-tags-tooltip clearable placeholder="全部标签">
              <el-option v-for="tag in chineseStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
            </el-select>
          </div>
          <div class="cn-panel-item">
            <label>排序方式</label>
            <el-select v-model="printOrder">
              <el-option label="拼音顺序" value="pinyin" />
              <el-option label="随机打乱" value="random" />
            </el-select>
          </div>
        </div>
      </div>

      <div class="cn-panel-block">
        <h3 class="cn-panel-title">练习与格子设置</h3>
        <div class="cn-panel-grid">
          <div class="cn-panel-item">
            <label>练习模式</label>
            <el-radio-group v-model="practiceMode">
              <el-radio-button label="pinyin2hanzi">拼音写汉字</el-radio-button>
              <el-radio-button label="hanzi2pinyin">看汉字写拼音</el-radio-button>
            </el-radio-group>
          </div>
          <div class="cn-panel-item">
            <label>格子类型</label>
            <el-radio-group v-model="gridType">
              <el-radio-button label="tian">田字格</el-radio-button>
              <el-radio-button label="kou">口字格</el-radio-button>
              <el-radio-button label="mi">米字格</el-radio-button>
            </el-radio-group>
          </div>
          <div class="cn-panel-item">
            <label>每行词语数：{{ cols }}</label>
            <el-slider v-model="cols" :min="2" :max="6" :step="1" show-stops />
          </div>
          <div class="cn-panel-item">
            <label>每页行数：{{ rows }}</label>
            <el-slider v-model="rows" :min="3" :max="10" :step="1" show-stops />
          </div>
          <div class="cn-panel-item">
            <label>
              {{ practiceMode === 'pinyin2hanzi' ? `每词抄写遍数：${copies}` : `拼音横线条数：${copies}` }}
            </label>
            <el-slider v-model="copies" :min="1" :max="5" :step="1" show-stops />
          </div>
          <div class="cn-panel-item">
            <label>格子线条颜色</label>
            <div class="cn-color-row">
              <el-color-picker v-model="gridColor" />
              <el-button v-for="c in presetColors" :key="c" class="cn-color-dot" :style="{ background: c }" :title="c"
                @click="gridColor = c" />
            </div>
          </div>
          <div class="cn-panel-item cn-panel-item-wide">
            <el-checkbox v-model="showAnswer">首格显示淡色示范字（答案 / 描红字帖模式）</el-checkbox>
          </div>
          <div class="cn-panel-item cn-panel-item-wide">
            <el-checkbox v-model="showHeader">打印标题与姓名日期栏</el-checkbox>
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
      <div v-for="(page, pageIdx) in printPages" :key="pageIdx" class="cn-a4-page" :style="pageStyle">
        <div v-if="showHeader" class="cn-a4-head" :style="{ height: '46px' }">
          <span class="cn-a4-title">{{ practiceMode === 'pinyin2hanzi' ? '看拼音写词语练习' : '看词语写拼音练习' }}</span>
          <span class="cn-a4-meta">
            <span class="cn-a4-blank">姓名：</span>
            <span class="cn-a4-blank">日期：</span>
            <span class="cn-a4-page-no">第 {{ pageIdx + 1 }} / {{ printPages.length }} 页</span>
          </span>
        </div>

        <div class="cn-sheet-body" :style="bodyGridStyle">
          <div v-for="(group, gIdx) in page" :key="`${pageIdx}-${gIdx}`" class="cn-sheet-group">
            <!-- 模式一：拼音写汉字 -->
            <template v-if="practiceMode === 'pinyin2hanzi'">
              <div class="cn-pinyin-strip" :style="{ width: group.chars.length * layout.cellPx + 'px' }">
                <template v-if="group.pinyinMatched">
                  <span v-for="(syl, i) in group.syllables" :key="i" class="cn-pinyin-slot"
                    :style="{ width: layout.cellPx + 'px' }">{{ syl }}</span>
                </template>
                <span v-else class="cn-pinyin-full" :style="{ width: group.chars.length * layout.cellPx + 'px' }">{{
                  group.pinyin
                  }}</span>
              </div>
              <div class="cn-cell-row">
                <template v-for="copy in group.copies" :key="copy">
                  <div v-for="(char, ci) in group.chars" :key="`${copy}-${ci}`" class="cn-cell"
                    :class="['cn-cell-' + gridType]">
                    <span v-if="gridType !== 'kou'" class="cn-gl cn-gl-h"></span>
                    <span v-if="gridType !== 'kou'" class="cn-gl cn-gl-v"></span>
                    <span v-if="gridType === 'mi'" class="cn-gl cn-gl-d1"></span>
                    <span v-if="gridType === 'mi'" class="cn-gl cn-gl-d2"></span>
                    <span v-if="showAnswer && copy === 0" class="cn-cell-answer">{{ char }}</span>
                  </div>
                </template>
              </div>
            </template>

            <!-- 模式二：看汉字写拼音 -->
            <template v-else>
              <div class="cn-cell-row">
                <div v-for="(char, ci) in group.chars" :key="ci" class="cn-cell" :class="['cn-cell-' + gridType]">
                  <span v-if="gridType !== 'kou'" class="cn-gl cn-gl-h"></span>
                  <span v-if="gridType !== 'kou'" class="cn-gl cn-gl-v"></span>
                  <span v-if="gridType === 'mi'" class="cn-gl cn-gl-d1"></span>
                  <span v-if="gridType === 'mi'" class="cn-gl cn-gl-d2"></span>
                  <span class="cn-cell-char">{{ char }}</span>
                </div>
              </div>
              <div v-for="copy in group.copies" :key="`line-${copy}`" class="cn-pinyin-line"></div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Printer } from '@element-plus/icons-vue'
import { useChineseStore } from '../../stores/chinese.js'
import { CHINESE_LEVELS } from '../../types/index.js'

const router = useRouter()
const chineseStore = useChineseStore({ lazy: true })

// ===== A4 常量（96dpi） =====
const A4_W = 794
const A4_H = 1123
const PAGE_PAD_X = 30
const PAGE_PAD_TOP = 22
const PAGE_PAD_BOTTOM = 24
const HEADER_H = 46
const PINYIN_STRIP_H = 26
const PINYIN_LINE_H = 30
const CELL_MIN = 16
const CELL_MAX = 60

// ===== 筛选 / 排版状态 =====
const levelFilter = ref([])
const tagFilter = ref([])
const printOrder = ref('pinyin')

const practiceMode = ref('pinyin2hanzi') // pinyin2hanzi | hanzi2pinyin
const gridType = ref('tian')             // tian | kou | mi
const cols = ref(4)
const rows = ref(7)
const copies = ref(2)
const gridColor = ref('#e08181')
const showAnswer = ref(false)
const showHeader = ref(true)

const presetColors = ['#e08181', '#4a90d9', '#8a8a8a', '#d97706']

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

// ===== 格子尺寸自适应（保证一定在 A4 内） =====
const layout = computed(() => {
  const contentW = A4_W - PAGE_PAD_X * 2
  const bodyH = A4_H - PAGE_PAD_TOP - PAGE_PAD_BOTTOM - (showHeader.value ? HEADER_H : 0)
  const maxChars = Math.max(1, ...printViewModels.value.map(g => g.chars.length))

  let cellPx
  if (practiceMode.value === 'pinyin2hanzi') {
    const maxCellsAcross = maxChars * copies.value
    const sizeByWidth = Math.floor(contentW / (cols.value * maxCellsAcross))
    const sizeByHeight = Math.floor(bodyH / rows.value - PINYIN_STRIP_H)
    cellPx = Math.min(sizeByWidth, sizeByHeight)
  } else {
    const sizeByWidth = Math.floor(contentW / (cols.value * maxChars))
    const sizeByHeight = Math.floor((bodyH / rows.value - copies.value * PINYIN_LINE_H))
    cellPx = Math.min(sizeByWidth, sizeByHeight)
  }
  cellPx = Math.max(CELL_MIN, Math.min(CELL_MAX, cellPx))
  return { cellPx, contentW, bodyH }
})

// ===== 把词条转成打印视图模型 =====
function toViewModel(entry) {
  const chars = Array.from(String(entry.word || '').trim())
  const syllables = String(entry.pinyin || '').trim().split(/\s+/).filter(Boolean)
  return {
    word: entry.word,
    pinyin: entry.pinyin || '',
    chars,
    syllables,
    pinyinMatched: syllables.length === chars.length,
    copies: copies.value
  }
}

const orderedWords = computed(() => {
  const list = [...availableWords.value]
  if (printOrder.value === 'random') {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[list[i], list[j]] = [list[j], list[i]]
    }
  }
  return list
})

const printViewModels = computed(() => orderedWords.value.map(toViewModel))

const groupsPerPage = computed(() => cols.value * rows.value)

const printPages = computed(() => {
  const models = printViewModels.value
  const perPage = groupsPerPage.value
  const pages = []
  for (let i = 0; i < models.length; i += perPage) {
    pages.push(models.slice(i, i + perPage))
  }
  return pages
})

const pageStyle = computed(() => ({
  '--cn-grid-color': gridColor.value,
  '--cn-cell-px': `${layout.value.cellPx}px`,
  '--cn-pinyin-strip-h': `${PINYIN_STRIP_H}px`,
  '--cn-pinyin-line-h': `${PINYIN_LINE_H}px`,
  paddingTop: `${PAGE_PAD_TOP}px`,
  paddingBottom: `${PAGE_PAD_BOTTOM}px`,
  paddingLeft: `${PAGE_PAD_X}px`,
  paddingRight: `${PAGE_PAD_X}px`
}))

const bodyGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${cols.value}, 1fr)`,
  gridTemplateRows: `repeat(${rows.value}, 1fr)`,
  height: `${layout.value.bodyH}px`
}))

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/chinese')
  }
}

async function doPrint() {
  if (!printPages.value.length) return
  await new Promise(resolve => setTimeout(resolve, 60))
  window.print()
}

onMounted(() => {
  chineseStore.ensureLoaded()
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
  max-width: 820px;
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
  max-width: 820px;
  margin: 0 auto 22px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.cn-panel-block {
  padding: 18px 22px;
}

.cn-panel-block+.cn-panel-block {
  border-top: 1px solid #f0e8dd;
}

.cn-panel-title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 800;
  color: #b8480f;
}

.cn-panel-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 22px;
}

.cn-panel-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cn-panel-item label {
  font-size: 12px;
  font-weight: 700;
  color: #7a563a;
}

.cn-panel-item-wide {
  grid-column: 1 / -1;
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

.cn-a4-head {
  height: var(--cn-header-reserve, 46px);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cn-a4-title {
  font-size: 18px;
  font-weight: 800;
  color: #1c1408;
}

.cn-a4-meta {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 13px;
  color: #333;
}

.cn-a4-blank {
  display: inline-block;
}

.cn-a4-page-no {
  color: #666;
}

/* ===== 练习格子区 ===== */
.cn-sheet-body {
  display: grid;
  width: 100%;
}

.cn-sheet-group {
  display: flex;
  flex-direction: column;
  justify-content: start;
  padding: 0 6px;
  min-width: 0;
}

.cn-pinyin-strip {
  display: flex;
  align-items: flex-end;
  height: var(--cn-pinyin-strip-h);
}

.cn-pinyin-slot {
  flex-shrink: 0;
  text-align: center;
  font-size: 14px;
  color: #333;
  font-family: "Times New Roman", "PingFang SC", serif;
  letter-spacing: 0;
  overflow: hidden;
}

.cn-pinyin-full {
  text-align: center;
  font-size: 13px;
  color: #333;
}

.cn-cell-row {
  display: flex;
}

.cn-cell {
  position: relative;
  flex-shrink: 0;
  width: var(--cn-cell-px);
  height: var(--cn-cell-px);
  box-sizing: border-box;
  border: 1px solid var(--cn-grid-color);
  background: #fff;
}

/* 内部辅助线：十字虚线（田字格 / 米字格） */
.cn-gl {
  position: absolute;
  pointer-events: none;
}

.cn-gl-h {
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px dashed var(--cn-grid-color);
}

.cn-gl-v {
  top: 0;
  bottom: 0;
  left: 50%;
  border-left: 1px dashed var(--cn-grid-color);
}

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

/* 淡色示范字（描红 / 答案） */
.cn-cell-answer {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: calc(var(--cn-cell-px) * 0.82);
  color: rgba(0, 0, 0, 0.16);
  line-height: 1;
}

/* 看汉字写拼音：实心示范汉字 */
.cn-cell-char {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: calc(var(--cn-cell-px) * 0.82);
  color: #1c1408;
  line-height: 1;
}

.cn-pinyin-line {
  height: var(--cn-pinyin-line-h);
  border-bottom: 1px solid #555;
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
</style>
