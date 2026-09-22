<template>
  <div class="cn-page">
    <header class="cn-header">
      <div class="cn-title-wrap">
        <el-button type="primary" @click="goBack">
          <el-icon>
            <ArrowLeft />
          </el-icon>
          返回
        </el-button>
        <h2 class="cn-title">中文生词本 · {{ activeBookName }}</h2>
      </div>
      <div class="cn-actions">
        <el-dropdown>
          <el-button title="菜单">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="openManualDialog">
                <el-icon>
                  <Edit />
                </el-icon>
                录入
              </el-dropdown-item>
              <el-dropdown-item @click="openBatchDialog" :disabled="selectedWords.length === 0">
                <el-icon>
                  <List />
                </el-icon>
                批量
              </el-dropdown-item>
              <el-dropdown-item @click="goPrint">
                <el-icon>
                  <Printer />
                </el-icon>
                打印
              </el-dropdown-item>
              <el-dropdown-item @click="openFormatDialog('import')">
                <el-icon>
                  <Upload />
                </el-icon>
                导入
              </el-dropdown-item>
              <el-dropdown-item @click="openFormatDialog('export')">
                <el-icon>
                  <Download />
                </el-icon>
                导出
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button @click="goSettings" title="设置">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </el-button>
      </div>
    </header>

    <section class="cn-toolbar">
      <el-input v-model="searchText" clearable placeholder="搜索中文词" class="cn-search" />
      <el-select v-model="levelFilter" class="cn-filter" popper-class="cn-level-popper" multiple collapse-tags
        collapse-tags-tooltip clearable placeholder="按水平筛选">
        <el-option v-for="level in CHINESE_LEVELS" :key="level.value" :class="levelClass(level.value)"
          :label="level.label" :value="level.value" />
      </el-select>
      <el-select v-model="tagFilter" class="cn-tag-filter" multiple collapse-tags collapse-tags-tooltip clearable
        placeholder="按标签筛选">
        <el-option v-for="tag in chineseStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
      </el-select>
      <div v-if="tagFilter.length > 1" class="cn-tag-relation-hint" @click="goSettings">
        {{ chineseStore.tagFilterRelation === 'or' ? '或' : '且' }}
      </div>
      <el-segmented v-model="sortMode" :options="sortOptions" class="cn-sort" />
    </section>

    <section class="cn-list">
      <div class="cn-list-head" :style="{ gridTemplateColumns }">
        <span class="cn-check-head">
          <el-checkbox :indeterminate="isIndeterminate" v-model="selectAll" @change="handleSelectAll" />
        </span>
        <span class="cn-idx-head">索引</span>
        <span>中文</span>
        <span class="cn-sound-head">发音</span>
        <span v-if="chineseStore.visibleColumns.pinyin" class="cn-pinyin-head">拼音</span>
        <span v-if="chineseStore.visibleColumns.tags" class="cn-tags-head">标签</span>
        <span v-if="chineseStore.visibleColumns.level" class="cn-level-head">掌握水平</span>
        <span v-if="chineseStore.visibleColumns.note" class="cn-note-head">备注</span>
        <span class="cn-action-head">操作</span>
      </div>

      <!-- 红框区骨架：加载数据时渲染占位行 -->
      <div v-if="listLoading" class="cn-list-skeleton" aria-label="加载中">
        <div v-for="n in 8" :key="`sk-${n}`" class="cn-row cn-skeleton-row" aria-hidden="true"
          :style="{ gridTemplateColumns }">
          <div class="cn-skeleton cn-skeleton-idx"></div>
          <div class="cn-skeleton cn-skeleton-word"></div>
          <div class="cn-skeleton cn-skeleton-sound"></div>
          <div class="cn-skeleton cn-skeleton-pinyin"></div>
          <div class="cn-skeleton cn-skeleton-tags"></div>
          <div class="cn-skeleton cn-skeleton-level"></div>
          <div class="cn-skeleton cn-skeleton-action"></div>
        </div>
      </div>

      <template v-else>
        <div v-if="!pagedWords.length" class="cn-empty">
          暂无词条。点击右上角菜单「录入」开始添加中文词。
        </div>

        <div v-for="entry in pagedWords" :key="entry.word" class="cn-row" :style="{ gridTemplateColumns }">
          <span class="cn-check">
            <el-checkbox v-model="selectedWords" :value="entry.word" />
          </span>
          <span class="cn-idx">{{ indexOfWord(entry) }}</span>
          <button class="cn-word" :class="{ 'cn-word-empty': !entry.pinyin }" @click="openWordDetail(entry.word)">{{
            entry.word }}</button>
          <div class="cn-sound">
            <button class="cn-sound-btn" :disabled="!entry.word || playingWord === entry.word" @click="playWord(entry)"
              :title="playingWord === entry.word ? '正在获取发音…' : '发音'">
              <el-icon v-if="playingWord === entry.word" class="is-loading cn-sound-loading">
                <Loading />
              </el-icon>
              <svg v-else viewBox="0 0 24 24" width="16" height="16">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <div v-if="chineseStore.visibleColumns.pinyin" class="cn-pinyin">
            {{ entry.pinyin || '-' }}
          </div>
          <div v-if="chineseStore.visibleColumns.tags" class="cn-tags">
            <el-tag v-for="tag in tagsForEntry(entry)" :key="tag.id" size="small" effect="plain">
              {{ tag.name }}
            </el-tag>
            <span v-if="!tagsForEntry(entry).length" class="cn-tag-empty">-</span>
          </div>
          <div v-if="chineseStore.visibleColumns.level" class="cn-level" @mouseenter="levelHoverWord = entry.word"
            @mouseleave="levelHoverWord = ''">
            <el-select v-if="isLevelActive(entry.word)" :class="['cn-level-select', levelClass(entry.level)]"
              :model-value="entry.level" size="small" popper-class="cn-level-popper"
              @visible-change="v => onLevelVisibleChange(entry.word, v)"
              @change="value => updateLevel(entry.word, value)">
              <el-option v-for="level in CHINESE_LEVELS" :key="level.value" :class="levelClass(level.value)"
                :label="level.label" :value="level.value" />
            </el-select>
            <span v-else class="cn-level-label" :class="levelClass(entry.level)">{{ levelLabel(entry.level) }}</span>
          </div>
          <div v-if="chineseStore.visibleColumns.note" class="cn-note">
            {{ entry.note || '-' }}
          </div>
          <div class="cn-action">
            <el-button size="small" plain @click="openTagDialog(entry)">设置</el-button>
          </div>
        </div>
      </template>
    </section>

    <section v-if="!listLoading" class="cn-pagination">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="pageSizes"
        :total="filteredWords.length" :pager-count="7" background size="small"
        layout="total, sizes, prev, pager, next, jumper" @size-change="onPageSizeChange"
        @current-change="onPageChange" />
    </section>

    <!-- 手动录入弹窗：格式1逗号间隔 / 格式2标签+文本 -->
    <el-dialog v-model="manualDialog.visible" title="录入词条" width="480px" class="cn-manual-dialog"
      :close-on-click-modal="!manualDialog.loading" :close-on-press-escape="!manualDialog.loading">
      <el-form @submit.prevent="submitManualWord" :label-width="'80px'">
        <el-form-item label="录入格式">
          <el-select v-model="manualDialog.format" size="small" :disabled="manualDialog.loading">
            <el-option label="格式1：逗号间隔" value="comma" />
            <el-option label="格式2：标签+文本" value="tag" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input type="textarea" ref="manualInputRef" v-model="manualDialog.word" :placeholder="manualDialog.format === 'comma'
            ? '单词之间用逗号隔开，支持多行；录入时本地自动补全拼音。示例：蝴蝶,蜻蜓,蚂蚁'
            : '[第2单元]\n蝴蝶:hú dié\n蜻蜓:qīng tíng\n\n标签写在方括号内，词组与拼音用冒号隔开；自带拼音直接入库，不再联网检索'" :rows="7" clearable
            :disabled="manualDialog.loading" />
        </el-form-item>
        <el-form-item v-if="manualDialog.format === 'comma'" label="标签">
          <el-select v-model="manualDialog.tagIds" multiple size="small" placeholder="选择标签（可选）">
            <el-option v-for="tag in chineseStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
          </el-select>
          <div v-if="!chineseStore.tags.length" class="cn-tag-dialog-empty">暂无标签</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="manualDialog.loading" @click="manualDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="manualDialog.loading" @click="submitManualWord">
          录入
        </el-button>
      </template>
    </el-dialog>

    <input ref="importInputRef" type="file" accept=".txt,.csv,text/plain" class="hidden-input" @change="handleImport" />

    <!-- 格式选择弹窗（导入/导出前必弹） -->
    <el-dialog v-model="formatDialog.visible" :title="formatDialog.mode === 'export' ? '选择导出格式' : '选择导入格式'"
      width="460px" class="cn-format-dialog" :close-on-click-modal="true">
      <div class="cn-format-dialog-body">
        <div v-for="fmt in chineseFormatList" :key="fmt.id" class="cn-format-option"
          :class="{ 'is-selected': formatDialog.selectedId === fmt.id }" @click="formatDialog.selectedId = fmt.id">
          <div class="cn-format-option-head">
            <span class="cn-format-option-dot"></span>
            <span class="cn-format-option-name">{{ fmt.name }}</span>
          </div>
          <p v-if="fmt.desc" class="cn-format-option-desc">{{ fmt.desc }}</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="formatDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmFormatDialog">
          {{ formatDialog.mode === 'export' ? '开始导出' : '选择文件' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量设置弹窗 -->
    <el-dialog v-model="batchDialog.visible" title="批量设置" width="460px" class="cn-batch-dialog"
      :close-on-click-modal="true">
      <div class="cn-batch-dialog-body">
        <div class="cn-batch-dialog-hint">已选择 {{ selectedWords.length }} 个词条</div>
        <div class="cn-batch-dialog-field">
          <div class="cn-batch-dialog-label">掌握水平</div>
          <el-select v-model="batchDialog.level" :class="['cn-batch-dialog-control', levelClass(batchDialog.level)]"
            popper-class="cn-level-popper" placeholder="不修改">
            <el-option v-for="level in CHINESE_LEVELS" :key="level.value" :class="levelClass(level.value)"
              :label="level.label" :value="level.value" />
          </el-select>
        </div>
        <div class="cn-batch-dialog-field">
          <div class="cn-batch-dialog-label">词条标签</div>
          <div class="cn-batch-dialog-control-wrap">
            <el-select v-model="batchDialog.tagIds" multiple clearable placeholder="选择标签（多选）"
              class="cn-batch-dialog-control">
              <el-option v-for="tag in chineseStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
            </el-select>
            <div v-if="!chineseStore.tags.length" class="cn-batch-dialog-empty">
              还没有标签，请先到设置里添加。
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="danger" @click="deleteSelectedWords">删除所选</el-button>
        <span class="cn-batch-dialog-spacer"></span>
        <el-button @click="batchDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="batchDialog.loading" @click="saveBatchSettings">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 设置标签弹窗 -->
    <el-dialog v-model="tagDialog.visible" title="设置标签" width="460px" class="cn-tag-dialog"
      :close-on-click-modal="true">
      <div class="cn-tag-dialog-body">
        <div class="cn-tag-dialog-word">词条：{{ tagDialog.word }}</div>
        <div class="cn-tag-dialog-field">
          <div class="cn-tag-dialog-label">拼音</div>
          <el-input v-model="tagDialog.pinyin" clearable placeholder="编辑拼音，如 shǒu zhū dài tù" />
        </div>
        <div class="cn-tag-dialog-field">
          <div class="cn-tag-dialog-label">选择标签</div>
          <el-select v-model="tagDialog.tagIds" multiple clearable placeholder="选择标签">
            <el-option v-for="tag in chineseStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <el-button @click="tagDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveWordTags">保存</el-button>
      </template>
    </el-dialog>

    <!-- 统计浮窗（和 vocabulary 页保持一致） -->
    <div v-if="chineseStore.statsVisible" ref="statsBarRef" class="cn-stats-bar"
      :class="{ 'is-dragging': statsDrag.dragging }" :style="statsBarStyle" aria-label="词条统计"
      @pointerdown="startStatsDrag">
      <span class="cn-stat cn-stat-total">
        <span class="cn-stat-label">总词条</span>
        <span class="cn-stat-value">{{ levelStats.total }}</span>
      </span>
      <span class="cn-stat level-unknown">
        <span class="cn-stat-label">不认识</span>
        <span class="cn-stat-value">{{ levelStats.unknown }}</span>
      </span>
      <span class="cn-stat level-learning">
        <span class="cn-stat-label">已了解</span>
        <span class="cn-stat-value">{{ levelStats.learning }}</span>
      </span>
      <span class="cn-stat level-mastered">
        <span class="cn-stat-label">已掌握</span>
        <span class="cn-stat-value">{{ levelStats.mastered }}</span>
      </span>
      <span class="cn-stat level-familiar">
        <span class="cn-stat-label">已熟记</span>
        <span class="cn-stat-value">{{ levelStats.familiar }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Edit, Upload, Download, Printer, List, Loading } from '@element-plus/icons-vue'
import { useChineseStore } from '../../stores/chinese.js'
import { CHINESE_LEVELS } from '../../types/index.js'
import { getChineseFormatList, getChineseFormat, parseTagText } from '../../utils/chineseFormats.js'
import { toPinyin } from '../../utils/chinesePinyin.js'
import { clampPage, slicePage } from '../../utils/pagination.js'
import { matchTagFilter } from '../../utils/tagFilter.js'
import { playChineseAudio } from '../../api/hanyu/index.js'

const router = useRouter()
// 懒加载：先构造 reactive 空壳，骨架渲染后再加载昂贵数据
const chineseStore = useChineseStore({ lazy: true })

// ========================== 红框区骨架加载 ==========================
const listLoading = ref(true)

async function runWithListLoading(fn) {
  listLoading.value = true
  try {
    await nextTick()
    await new Promise(r => setTimeout(r, 0))
    if (typeof fn === 'function') await fn()
  } finally {
    listLoading.value = false
  }
}

// ========================== 筛选 / 排序状态 ==========================
const searchText = ref(router.currentRoute.value.query.searchText || '')
const levelFilter = ref((router.currentRoute.value.query.levelFilter || '').split(',').filter(Boolean))
const tagFilter = ref((router.currentRoute.value.query.tagFilter || '').split(',').filter(Boolean))
const sortMode = ref(router.currentRoute.value.query.sortMode || 'pinyin')

const selectedWords = ref([])
const selectAll = ref(false)
const isIndeterminate = ref(false)

const batchDialog = reactive({
  visible: false,
  loading: false,
  level: '',
  tagIds: []
})

// ========================== 筛选 + 排序结果 ==========================
const filteredWords = computed(() => {
  const keyword = searchText.value.trim()
  let words = chineseStore.words.filter(entry => {
    const matchKeyword = !keyword || entry.word.includes(keyword)
    const selectedLevels = Array.isArray(levelFilter.value) ? levelFilter.value : []
    const matchLevel = !selectedLevels.length || selectedLevels.includes(entry.level)
    const selectedTags = Array.isArray(tagFilter.value) ? tagFilter.value : []
    const matchTags = matchTagFilter(entry.tagIds, selectedTags, chineseStore.tagFilterRelation)
    return matchKeyword && matchLevel && matchTags
  })
  if (sortMode.value === 'createdAt') {
    words = [...words].sort((a, b) => b.createdAt - a.createdAt)
  } else {
    // 按拼音字母排序，拼音相同时按创建时间
    words = [...words].sort((a, b) => {
      const pa = a.pinyin || ''
      const pb = b.pinyin || ''
      if (pa && pb) return pa.localeCompare(pb, 'zh')
      if (pa) return -1
      if (pb) return 1
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
  }
  return words
})

const gridTemplateColumns = computed(() => {
  // 发音固定 100px，标签固定 150px，中文和拼音平分剩余
  const cols = ['48px', '48px', '1fr', '100px']
  if (chineseStore.visibleColumns.pinyin) cols.push('1fr')
  if (chineseStore.visibleColumns.tags) cols.push('150px')
  if (chineseStore.visibleColumns.level) cols.push('96px')
  if (chineseStore.visibleColumns.note) cols.push('minmax(60px, 120px)')
  cols.push('56px')
  return cols.join(' ')
})

// ========================== 分页 ==========================
const pageSizes = [10, 20, 50, 100, 200]
const pageSize = ref(Number(router.currentRoute.value.query.pageSize) || 10)
const page = ref(Number(router.currentRoute.value.query.page) || 1)

const pagedWords = computed(() =>
  slicePage(filteredWords.value, page.value, pageSize.value)
)

function updateRouteQuery() {
  router.replace({
    query: {
      ...router.currentRoute.value.query,
      page: page.value,
      pageSize: pageSize.value,
      searchText: searchText.value,
      levelFilter: levelFilter.value.join(','),
      tagFilter: tagFilter.value.join(','),
      sortMode: sortMode.value
    }
  })
}

function onPageChange(p) {
  page.value = clampPage(filteredWords.value.length, p, pageSize.value)
  updateRouteQuery()
}
function onPageSizeChange(size) {
  pageSize.value = Math.max(1, Number(size) || 10)
  page.value = clampPage(filteredWords.value.length, page.value, pageSize.value)
  updateRouteQuery()
}

watch([searchText, levelFilter, tagFilter, sortMode], () => {
  page.value = 1
  updateRouteQuery()
})

watch(() => filteredWords.value.length, (n) => {
  const clamped = clampPage(n, page.value, pageSize.value)
  if (clamped !== page.value) page.value = clamped
})

watch(() => chineseStore.activeBookId, (newId, oldId) => {
  if (oldId != null && newId !== oldId) {
    page.value = 1
    runWithListLoading(() => chineseStore.ensureLoaded())
  }
})

onMounted(() => {
  runWithListLoading(() => chineseStore.ensureLoaded()).then(() => {
    // 本地拼音库补全缺拼音的存量词条（纯本地计算，不联网、不抓详情）
    backfillMissingPinyin()
  })
})

// ========================== 弹窗 / 状态变量 ==========================
const importInputRef = ref(null)
const manualInputRef = ref(null)
const statsBarRef = ref(null)
const statsPosition = ref(null)
const statsDrag = ref({
  dragging: false,
  pointerId: null,
  offsetX: 0,
  offsetY: 0
})
const manualDialog = ref({
  visible: false,
  word: '',
  format: 'comma',
  loading: false,
  tagIds: []
})
const formatDialog = ref({
  visible: false,
  mode: 'import',
  selectedId: 'comma'
})
const tagDialog = ref({
  visible: false,
  word: '',
  tagIds: [],
  pinyin: ''
})
const chineseFormatList = getChineseFormatList()

const sortOptions = [
  { label: '拼音排序', value: 'pinyin' },
  { label: '添加时间', value: 'createdAt' }
]

const statsBarStyle = computed(() => {
  if (!statsPosition.value) return {}
  return {
    left: `${statsPosition.value.left}px`,
    top: `${statsPosition.value.top}px`,
    right: 'auto',
    bottom: 'auto',
    transform: 'none'
  }
})

const activeBookName = computed(() => chineseStore.getActiveBook()?.name || '默认中文生词本')

const levelStats = computed(() => {
  const stats = {
    total: filteredWords.value.length,
    unknown: 0,
    learning: 0,
    mastered: 0,
    familiar: 0
  }
  filteredWords.value.forEach(entry => {
    if (Object.prototype.hasOwnProperty.call(stats, entry.level)) {
      stats[entry.level] += 1
    } else {
      stats.unknown += 1
    }
  })
  return stats
})

// ========================== 工具函数 ==========================
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/home')
  }
}

function goSettings() {
  router.push('/chinese/settings')
}

function goPrint() {
  router.push('/chinese/print')
}

function levelClass(level) {
  return `level-${level || 'unknown'}`
}

function levelLabel(level) {
  return CHINESE_LEVELS.find(l => l.value === level)?.label || '不认识'
}

function tagsForEntry(entry) {
  const ids = entry.tagIds || []
  return chineseStore.tags.filter(t => ids.includes(t.id))
}

// 索引：基于 filteredWords 全集的位置（不是当前页位置）
function indexOfWord(entry) {
  const idx = filteredWords.value.findIndex(w => w.word === entry.word)
  return idx >= 0 ? idx + 1 : ''
}

// 列表播放：只检索发音（TTS）并朗读，不抓取释义等其他数据
const playingWord = ref('')

async function playWord(entry) {
  if (!entry?.word || playingWord.value) return
  playingWord.value = entry.word
  try {
    await playChineseAudio(entry.word)
  } catch {
    // 发音失败静默处理（playChineseAudio 内部已有兜底）
  } finally {
    playingWord.value = ''
  }
}

function openWordDetail(word) {
  router.push(`/chinese/${encodeURIComponent(word)}`)
}

function handleSelectAll(val) {
  if (val) {
    selectedWords.value = pagedWords.value.map(item => item.word)
  } else {
    selectedWords.value = []
  }
}

// ========================== 统计浮窗拖拽 ==========================
function clampStatsPosition(left, top) {
  const bar = statsBarRef.value
  const width = bar?.offsetWidth || 0
  const height = bar?.offsetHeight || 0
  const padding = 12
  const maxLeft = Math.max(padding, window.innerWidth - width - padding)
  const maxTop = Math.max(padding, window.innerHeight - height - padding)
  return {
    left: Math.min(Math.max(left, padding), maxLeft),
    top: Math.min(Math.max(top, padding), maxTop)
  }
}

function startStatsDrag(event) {
  if (event.button !== undefined && event.button !== 0) return
  const bar = statsBarRef.value
  if (!bar) return
  const rect = bar.getBoundingClientRect()
  statsDrag.value = {
    dragging: true,
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  }
  statsPosition.value = { left: rect.left, top: rect.top }
  bar.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', moveStatsBar)
  window.addEventListener('pointerup', stopStatsDrag)
  window.addEventListener('pointercancel', stopStatsDrag)
}

function moveStatsBar(event) {
  if (!statsDrag.value.dragging) return
  statsPosition.value = clampStatsPosition(
    event.clientX - statsDrag.value.offsetX,
    event.clientY - statsDrag.value.offsetY
  )
}

function stopStatsDrag(event) {
  if (!statsDrag.value.dragging) return
  statsBarRef.value?.releasePointerCapture?.(event.pointerId)
  statsDrag.value = { dragging: false, pointerId: null, offsetX: 0, offsetY: 0 }
  window.removeEventListener('pointermove', moveStatsBar)
  window.removeEventListener('pointerup', stopStatsDrag)
  window.removeEventListener('pointercancel', stopStatsDrag)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', moveStatsBar)
  window.removeEventListener('pointerup', stopStatsDrag)
  window.removeEventListener('pointercancel', stopStatsDrag)
})

// ========================== 录入功能 ==========================
async function openManualDialog() {
  manualDialog.value = {
    visible: true,
    word: '',
    format: 'comma',
    loading: false,
    tagIds: []
  }
  await nextTick()
  manualInputRef.value?.focus?.()
}

async function submitManualWord() {
  if (manualDialog.value.loading) return

  const input = String(manualDialog.value.word || '').trim()
  if (!input) {
    ElMessage.warning('请输入要录入的内容')
    return
  }

  // 统一解析为 { word, pinyin, tagIds }
  let wordEntries = []
  if (manualDialog.value.format === 'comma') {
    // 格式1：逗号间隔（兼容中文逗号与换行），无拼音，本地即时补全
    const words = input.split(/[,，\n\r]+/).map(w => String(w || '').trim()).filter(Boolean)
    if (!words.length) {
      ElMessage.warning('没有有效的词条，请输入中文词，用逗号隔开')
      return
    }
    const seen = new Set()
    for (const word of words) {
      if (seen.has(word)) continue
      seen.add(word)
      wordEntries.push({
        word,
        pinyin: toPinyin(word), // 只检索拼音，释义/组词/例句等其他数据一律不检索
        tagIds: [...manualDialog.value.tagIds]
      })
    }
  } else {
    // 格式2：[标签]\n词组:拼音 —— 自带拼音直接入库，不做任何检索（即使没拼音也不检索）
    wordEntries = await resolveTagTextEntries(input)
    if (!wordEntries.length) {
      ElMessage.warning('未解析到有效的词条，请使用 [标签]\\n词组:拼音 格式')
      return
    }
  }

  manualDialog.value.loading = true
  let successCount = 0
  let failedCount = 0
  try {
    for (const entry of wordEntries) {
      try {
        await chineseStore.addWord({
          word: entry.word,
          pinyin: entry.pinyin || '',
          tagIds: entry.tagIds
        })
        successCount++
      } catch (err) {
        console.warn(`录入词条「${entry.word}」失败:`, err)
        failedCount++
      }
    }

    manualDialog.value.visible = false
    if (failedCount === 0) {
      ElMessage.success(`已录入 ${successCount} 个词条`)
    } else {
      ElMessage.success(`录入完成：成功 ${successCount} 个，失败 ${failedCount} 个`)
    }
  } catch (error) {
    ElMessage.error(`录入失败：${error.message || '请稍后重试'}`)
  } finally {
    manualDialog.value.loading = false
  }
}

// 将「标签+文本」解析结果中的标签名解析为当前生词本的真实标签 id
async function resolveTagTextEntries(text) {
  const { words, tagNames } = parseTagText(text)
  const tagNameToId = new Map()
  for (const name of tagNames) {
    const tag = await chineseStore.addTag(name)
    if (tag) tagNameToId.set(name, tag.id)
  }
  return words.map(item => ({
    word: item.word,
    pinyin: item.pinyin,
    tagIds: item.tagNames.map(name => tagNameToId.get(name)).filter(Boolean)
  }))
}

// ========================== 批量 ==========================
function openBatchDialog() {
  batchDialog.visible = true
}

async function saveBatchSettings() {
  if (!selectedWords.value.length) {
    ElMessage.warning('请先选择要设置的词条')
    return
  }
  batchDialog.loading = true
  try {
    const updates = {}
    if (batchDialog.level) updates.level = batchDialog.level
    if (batchDialog.tagIds && batchDialog.tagIds.length > 0) updates.tagIds = [...batchDialog.tagIds]
    await chineseStore.batchUpdateWords(selectedWords.value, updates)
    ElMessage.success(`成功更新 ${selectedWords.value.length} 个词条`)
    batchDialog.visible = false
    selectedWords.value = []
  } finally {
    batchDialog.loading = false
    batchDialog.level = ''
    batchDialog.tagIds = []
  }
}

async function deleteSelectedWords() {
  const count = selectedWords.value.length
  if (!count) {
    ElMessage.warning('请先选择要删除的词条')
    return
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${count} 个词条吗？此操作不可恢复。`, '提示', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await chineseStore.batchRemoveWords(selectedWords.value)
    ElMessage.success(`已删除 ${count} 个词条`)
    batchDialog.visible = false
    selectedWords.value = []
  } catch {
    // 用户取消
  }
}

// ========================== 单词标签设置 ==========================
function openTagDialog(entry) {
  tagDialog.value = {
    visible: true,
    word: entry.word,
    tagIds: [...(entry.tagIds || [])],
    pinyin: entry.pinyin || ''
  }
}

async function saveWordTags() {
  if (!tagDialog.value.word) return
  await chineseStore.updateWord(tagDialog.value.word, {
    pinyin: tagDialog.value.pinyin,
    tagIds: tagDialog.value.tagIds
  })
  ElMessage.success('已保存')
  tagDialog.value.visible = false
}

// ========================== 掌握水平 ==========================
// 默认显示水平徽章，鼠标悬浮该行水平格时才切换为下拉；下拉展开期间鼠标移出也保持显示
const levelHoverWord = ref('')
const levelOpenWord = ref('')

function isLevelActive(word) {
  return levelHoverWord.value === word || levelOpenWord.value === word
}

function onLevelVisibleChange(word, visible) {
  if (visible) {
    levelOpenWord.value = word
  } else if (levelOpenWord.value === word) {
    levelOpenWord.value = ''
  }
}

async function updateLevel(word, level) {
  await chineseStore.updateLevel(word, level)
}

// ========================== 导入 / 导出 ==========================
function openFormatDialog(mode) {
  formatDialog.value = {
    visible: true,
    mode,
    selectedId: 'comma'
  }
}

function confirmFormatDialog() {
  if (formatDialog.value.mode === 'export') {
    doExport(formatDialog.value.selectedId)
    formatDialog.value.visible = false
  } else {
    // 触发文件选择
    importInputRef.value?.click()
  }
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) {
    formatDialog.value.visible = true  // 用户取消选文件，回到格式弹窗
    return
  }
  formatDialog.value.visible = false

  const fmt = getChineseFormat(formatDialog.value.selectedId)
  if (!fmt) {
    ElMessage.error('未找到导入格式')
    return
  }

  try {
    const text = await file.text()
    const { words, tags } = fmt.deserialize(text)

    // 先导入标签，拿到 tagIdMap（格式2 标签在文本内）
    let tagIdMap = new Map()
    if (Array.isArray(tags) && tags.length) {
      const r = await chineseStore.importTags(tags)
      tagIdMap = r.tagIdMap
    }
    const count = await chineseStore.importWords(words, 'active', tagIdMap)

    // 格式1：没有拼音，本地拼音库批量补全（不联网、不抓其他数据）
    // 格式2：自带拼音直接使用，即使没有拼音也不检索
    if (fmt.id === 'comma') {
      const items = words
        .map(w => ({ word: w.word, pinyin: toPinyin(w.word) }))
        .filter(item => item.pinyin)
      await chineseStore.batchFillPinyin(items)
    }

    ElMessage.success(`已导入 ${count} 个词条`)
  } catch (err) {
    ElMessage.error(`导入失败：${err.message || '请检查文件格式'}`)
  } finally {
    // 清空 input value，便于下次选同一文件
    event.target.value = ''
  }
}

// 本地拼音库补全缺拼音的存量词条（含历史数据）；纯本地计算，单次落库，不联网、不抓详情
async function backfillMissingPinyin() {
  const items = chineseStore.words
    .filter(w => !w.pinyin)
    .map(w => ({ word: w.word, pinyin: toPinyin(w.word) }))
    .filter(item => item.pinyin)
  if (!items.length) return
  try {
    await chineseStore.batchFillPinyin(items)
  } catch (err) {
    console.warn('本地补全拼音失败：', err)
  }
}

function doExport(formatId) {
  const fmt = getChineseFormat(formatId)
  if (!fmt) {
    ElMessage.error('未找到导出格式')
    return
  }
  const book = chineseStore.getActiveBook()
  if (!book || !book.words.length) {
    ElMessage.warning('当前生词本为空，无可导出内容')
    return
  }
  const { content, ext } = fmt.serialize(book.words, book.tags, { bookName: book.name })
  const bom = '\uFEFF'  // 加 BOM 让 Excel 正确识别 UTF-8
  const blob = new Blob([bom + content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${book.name || '中文生词本'}.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${book.words.length} 个词条`)
}
</script>

<style scoped>
.cn-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24px 28px 80px;
  background: linear-gradient(135deg, #fef6ec 0%, #f8f5f0 48%, #fdf4ea 100%);
  color: #1c1408;
}

.cn-header {
  max-width: 1280px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cn-title-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cn-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #1c1408;
}

.cn-actions {
  display: flex;
  gap: 8px;
}

.cn-toolbar {
  max-width: 1280px;
  margin: 0 auto 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  padding: 14px 18px;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(184, 72, 15, 0.08);
}

.cn-search-mode {
  width: 110px;
}

.cn-search {
  flex: 1;
  min-width: 200px;
}

.cn-filter,
.cn-tag-filter {
  width: 160px;
}

.cn-tag-relation-hint {
  font-size: 12px;
  color: #fff;
  width: 30px;
  height: 30px;
  line-height: 30px;
  text-align: center;
  border-radius: 15px;
  background: #b8480f;

  cursor: pointer;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.cn-sort {
  min-width: 200px;
}

.cn-list {
  max-width: 1280px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  padding: 12px 18px;
  box-shadow: 0 4px 16px rgba(184, 72, 15, 0.08);
}

.cn-list-head,
.cn-row {
  display: grid;
  gap: 10px;
  align-items: center;
  padding: 10px 6px;
}

.cn-list-head {
  border-bottom: 2px solid #fbe6d4;
  font-size: 12px;
  font-weight: 800;
  color: #7a563a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cn-row {
  border-bottom: 1px solid #f7e8d6;
  transition: background 120ms ease;
}

.cn-row:hover {
  background: #fff7ee;
}

.cn-check,
.cn-check-head,
.cn-idx,
.cn-idx-head {
  display: grid;
  place-items: center;
  font-size: 13px;
  color: #8b6645;
  font-weight: 700;
}

.cn-word {
  background: none;
  border: none;
  padding: 0;
  font-size: 18px;
  font-weight: 800;
  color: #1c1408;
  cursor: pointer;
  text-align: left;
  font-family: "Songti SC", "STSong", "SimSun", serif;
}

.cn-word:hover {
  color: #b8480f;
}

.cn-word-empty {
  color: #9b7558;
}

.cn-sound-head,
.cn-sound {
  display: grid;
  place-items: center;
}

.cn-sound-btn {
  background: #fbe6d4;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #b8480f;
  cursor: pointer;
  transition: all 160ms ease;
}

.cn-sound-btn:hover {
  background: #f4c79d;
}

.cn-sound-btn:disabled {
  color: #c5a88e;
  cursor: not-allowed;
}

.cn-sound-loading {
  font-size: 16px;
  color: #b8480f;
}

.cn-pinyin-head,
.cn-pinyin {
  font-size: 14px;
  color: #8b6645;
  font-family: "PingFang SC", system-ui, sans-serif;
}

.cn-tags-head,
.cn-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cn-tag-empty {
  color: #c5a88e;
}

.cn-level-head,
.cn-level {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cn-level-label {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.level-unknown {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.12);
}

.level-learning {
  color: #409eff;
  background: rgba(64, 158, 255, 0.12);
}

.level-mastered {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.12);
}

.level-familiar {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.12);
}

.cn-level-select {
  width: 80px;
}

.cn-level-select.level-unknown :deep(.el-select__wrapper) {
  color: #f56c6c;
}

.cn-level-select.level-learning :deep(.el-select__wrapper) {
  color: #409eff;
}

.cn-level-select.level-mastered :deep(.el-select__wrapper) {
  color: #e6a23c;
}

.cn-level-select.level-familiar :deep(.el-select__wrapper) {
  color: #67c23a;
}

.cn-note-head,
.cn-note {
  font-size: 13px;
  color: #6b4d2f;
}

.cn-action-head,
.cn-action {
  display: grid;
  place-items: center;
}

.cn-empty {
  padding: 60px 20px;
  text-align: center;
  color: #8b6645;
  font-size: 14px;
}

/* 骨架加载 */
.cn-list-skeleton {
  display: grid;
  gap: 0;
}

.cn-skeleton-row {
  border-bottom: 1px solid #f7e8d6;
}

.cn-skeleton {
  background: linear-gradient(90deg, #f4e4d2 0%, #fff8ee 50%, #f4e4d2 100%);
  background-size: 200% 100%;
  animation: cn-shimmer 1.2s ease-in-out infinite;
  border-radius: 6px;
  height: 22px;
}

@keyframes cn-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

.cn-skeleton-idx,
.cn-skeleton-word,
.cn-skeleton-sound,
.cn-skeleton-pinyin,
.cn-skeleton-tags,
.cn-skeleton-level,
.cn-skeleton-action {
  height: 22px;
}

.cn-pagination {
  max-width: 1280px;
  margin: 16px auto 0;
  display: flex;
  justify-content: flex-end;
}

/* 录入弹窗 */
.cn-tag-dialog-empty {
  color: #b89672;
  font-size: 12px;
  margin-top: 4px;
}

/* 格式选择弹窗 */
.cn-format-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cn-format-option {
  padding: 14px 16px;
  border: 1px solid #e5d5bd;
  border-radius: 10px;
  background: #fffdfa;
  cursor: pointer;
  transition: all 160ms ease;
}

.cn-format-option:hover {
  border-color: #d9a667;
}

.cn-format-option.is-selected {
  border-color: #d97706;
  background: #fef6ec;
}

.cn-format-option-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cn-format-option-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #c9a478;
  flex-shrink: 0;
  position: relative;
}

.cn-format-option.is-selected .cn-format-option-dot {
  border-color: #d97706;
}

.cn-format-option.is-selected .cn-format-option-dot::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #d97706;
}

.cn-format-option-name {
  font-weight: 700;
  color: #1c1408;
  font-size: 14px;
}

.cn-format-option-desc {
  font-size: 12px;
  color: #8b6645;
  margin: 6px 0 0 24px;
}

/* 批量弹窗 */
.cn-batch-dialog-hint {
  font-size: 13px;
  color: #8b6645;
  margin-bottom: 14px;
}

.cn-batch-dialog-field {
  margin-bottom: 12px;
}

.cn-batch-dialog-label {
  font-size: 12px;
  color: #7a563a;
  margin-bottom: 6px;
  font-weight: 700;
}

.cn-batch-dialog-control {
  width: 100%;
}

.cn-batch-dialog-empty {
  color: #b89672;
  font-size: 12px;
  margin-top: 4px;
}

.cn-batch-dialog-spacer {
  flex: 1;
}

/* 标签设置弹窗 */
.cn-tag-dialog-word {
  font-size: 14px;
  font-weight: 700;
  color: #1c1408;
  margin-bottom: 14px;
}

.cn-tag-dialog-label {
  font-size: 12px;
  color: #7a563a;
  margin-bottom: 6px;
  font-weight: 700;
}

/* 统计浮窗（与 vocabulary 页完全一致） */
.cn-stats-bar {
  position: fixed;
  top: 50%;
  right: 18px;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 7px;
  max-width: calc(100vw - 24px);
  padding: 7px;
  border: 1px solid rgba(207, 217, 214, 0.85);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 12px 32px rgba(22, 32, 31, 0.18);
  backdrop-filter: blur(16px);
  color: #40504c;
  cursor: grab;
  text-align: center;
  transform: translateY(-50%);
  user-select: none;
  touch-action: none;
}

.cn-stats-bar.is-dragging {
  cursor: grabbing;
  box-shadow: 0 22px 60px rgba(22, 32, 31, 0.26);
}

.cn-stat {
  --stat-color: #40504c;
  --stat-bg: #f4f7f6;
  --stat-border: #d7dfdc;
  display: grid;
  grid-template-rows: auto auto;
  gap: 5px;
  min-width: 48px;
  padding: 7px 7px 6px;
  border: 1px solid var(--stat-border);
  border-radius: 11px;
  background: linear-gradient(180deg, #ffffff 0%, var(--stat-bg) 100%);
  box-shadow: 0 5px 13px rgba(22, 32, 31, 0.08);
  color: var(--stat-color) !important;
  line-height: 1.1;
  white-space: nowrap;
}

.cn-stat-label {
  font-size: 10px;
  font-weight: 800;
}

.cn-stat-value {
  display: grid;
  place-items: center;
  min-width: 32px;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--stat-color);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.12);
  color: #fff;
  font-size: 16px;
  font-weight: 900;
}

.cn-stat.cn-stat-total {
  --stat-color: #16201f;
  --stat-bg: #eef2f1;
  --stat-border: #cfd9d6;
  color: #16201f;
}

.cn-stat.level-unknown {
  --stat-color: #f56c6c;
}

.cn-stat.level-learning {
  --stat-color: #409eff;
}

.cn-stat.level-mastered {
  --stat-color: #e6a23c;
}

.cn-stat.level-familiar {
  --stat-color: #67c23a;
}

.hidden-input {
  display: none;
}

@media (max-width: 720px) {
  .cn-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .cn-filter,
  .cn-tag-filter,
  .cn-sort {
    width: 100%;
  }

  .cn-title {
    font-size: 18px;
  }

  .cn-stats-bar {
    right: 12px;
    gap: 5px;
    padding: 5px;
    border-radius: 12px;
  }

  .cn-stat {
    min-width: 40px;
    padding: 5px;
  }

  .cn-stat-value {
    min-width: 28px;
    min-height: 18px;
    font-size: 14px;
  }
}
</style>
