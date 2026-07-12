<template>
  <div class="vocab-page">
    <header class="vocab-header">
      <div class="vocab-title-wrap">
        <el-button type="primary" @click="goBack">
          <el-icon>
            <ArrowLeft />
          </el-icon>
          返回
        </el-button>
        <h2 class="vocab-title">生词本 · {{ activeBookName }}</h2>
      </div>
      <div class="vocab-actions">
        <el-button type="primary" plain @click="openManualDialog">
          <el-icon>
            <Plus />
          </el-icon>
          手动录入
        </el-button>
        <el-button @click="goTest">测试</el-button>
        <el-button @click="openFormatDialog('import')">导入</el-button>
        <el-button type="primary" @click="openFormatDialog('export')">导出</el-button>
        <el-button @click="goSettings">设置</el-button>
      </div>
    </header>

    <section class="vocab-toolbar">
      <el-input v-model="searchText" clearable placeholder="搜索单词或中文意思" class="vocab-search" />
      <el-select v-model="levelFilter" class="vocab-filter" popper-class="vocab-level-popper" multiple collapse-tags
        collapse-tags-tooltip clearable placeholder="按水平筛选">
        <el-option v-for="level in VOCABULARY_LEVELS" :key="level.value" :class="levelClass(level.value)"
          :label="level.label" :value="level.value" />
      </el-select>
      <el-select v-model="tagFilter" class="vocab-tag-filter" multiple collapse-tags collapse-tags-tooltip clearable
        placeholder="按标签筛选">
        <el-option v-for="tag in vocabularyStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
      </el-select>
      <el-segmented v-model="sortMode" :options="sortOptions" class="vocab-sort" />
    </section>

    <section class="vocab-list">
      <div class="vocab-list-head">
        <span>单词</span>
        <span>发音</span>
        <span class="vocab-memory-head">辅助记忆</span>
        <span>中文意思</span>
        <span class="vocab-tags-head">标签</span>
        <span class="vocab-level-head">掌握水平</span>
        <span class="vocab-action-head">操作</span>
      </div>

      <!-- 红框区骨架：加载数据时渲染 N 行占位，视觉上立即有内容、不阻塞 -->
      <div v-if="listLoading" class="vocab-list-skeleton" aria-label="加载中">
        <div v-for="n in 8" :key="`sk-${n}`" class="vocab-row vocab-skeleton-row" aria-hidden="true">
          <div class="vocab-skeleton vocab-skeleton-word"></div>
          <div class="vocab-skeleton vocab-skeleton-pronunciation"></div>
          <div class="vocab-skeleton vocab-skeleton-memory"></div>
          <div class="vocab-skeleton vocab-skeleton-meaning"></div>
          <div class="vocab-skeleton vocab-skeleton-tags"></div>
          <div class="vocab-skeleton vocab-skeleton-level"></div>
          <div class="vocab-skeleton vocab-skeleton-action"></div>
        </div>
      </div>

      <template v-else>
        <div v-if="!pagedWords.length" class="vocab-empty">
          暂无生词。
        </div>

        <div v-for="entry in pagedWords" :key="entry.word" class="vocab-row">
          <button class="vocab-word" @click="openWordDetail(entry.word)">{{ entry.word }}</button>
          <div class="vocab-pronunciation">
            <button class="vocab-sound" @click="playWord(entry)">
              <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"></path>
              </svg>
            </button>
            <span>{{ entry.phonetic || '-' }}</span>
          </div>
          <div class="vocab-memory">
            <template v-for="(part, index) in memoryPartsForEntry(entry)" :key="`${entry.word}-${index}-${part}`">
              <span class="memory-part" :class="`memory-part-${index % 4}`">{{ part }}</span>
              <span v-if="index < memoryPartsForEntry(entry).length - 1" class="memory-dot">·</span>
            </template>
          </div>
          <div class="vocab-meaning">{{ entry.meaning || '暂无释义' }}</div>
          <div class="vocab-tags">
            <el-tag v-for="tag in tagsForEntry(entry)" :key="tag.id" size="small" effect="plain">
              {{ tag.name }}
            </el-tag>
            <span v-if="!tagsForEntry(entry).length" class="vocab-tag-empty">-</span>
          </div>
          <div class="vocab-level">
            <span class="vocab-level-label" :class="levelClass(entry.level)">{{ levelLabel(entry.level) }}</span>
            <el-select :class="['vocab-level-select', levelClass(entry.level)]" :model-value="entry.level" size="small"
              popper-class="vocab-level-popper" @change="value => updateLevel(entry.word, value)">
              <el-option v-for="level in VOCABULARY_LEVELS" :key="level.value" :class="levelClass(level.value)"
                :label="level.label" :value="level.value" />
            </el-select>
          </div>
          <div class="vocab-action">
            <el-button size="small" plain @click="openTagDialog(entry)">设置</el-button>
          </div>
        </div>
      </template>
    </section>

    <!-- 分页条：与生词本三大块共用相同布局 token → 自动对齐 -->
    <section v-if="!listLoading" class="vocab-pagination">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="pageSizes"
        :total="filteredWords.length" :pager-count="7" background size="small"
        layout="total, sizes, prev, pager, next, jumper" @size-change="onPageSizeChange"
        @current-change="onPageChange" />
    </section>

    <Teleport to="body">
      <div v-if="tagDialog.visible" class="tag-dialog-overlay" @click.self="tagDialog.visible = false">
        <div class="tag-dialog">
          <div class="tag-dialog-header">
            <div>
              <h3>设置单词</h3>
              <p>调整掌握水平、标签和移除操作。</p>
            </div>
            <button class="tag-dialog-close" @click="tagDialog.visible = false">&times;</button>
          </div>
          <div class="tag-dialog-body">
            <div class="tag-dialog-field">
              <div class="tag-dialog-label">单词名称</div>
              <div class="tag-dialog-word">{{ tagDialog.word }}</div>
            </div>
            <div class="tag-dialog-field">
              <div class="tag-dialog-label">掌握水平</div>
              <el-select v-model="tagDialog.level" :class="['tag-dialog-control', levelClass(tagDialog.level)]"
                popper-class="vocab-level-popper" :teleported="false">
                <el-option v-for="level in VOCABULARY_LEVELS" :key="level.value" :class="levelClass(level.value)"
                  :label="level.label" :value="level.value" />
              </el-select>
            </div>
            <div class="tag-dialog-field">
              <div class="tag-dialog-label">辅助记忆</div>
              <el-input v-model="tagDialog.memoryText" class="tag-dialog-control" placeholder="例如：fa.mous" clearable />
            </div>
            <div class="tag-dialog-field">
              <div class="tag-dialog-label">单词标签</div>
              <div class="tag-dialog-control-wrap">
                <el-select v-model="tagDialog.tagIds" multiple clearable placeholder="选择标签" class="tag-dialog-control"
                  :teleported="false">
                  <el-option v-for="tag in vocabularyStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
                </el-select>
                <div v-if="!vocabularyStore.tags.length" class="tag-dialog-empty">
                  还没有标签，请先到设置里添加。
                </div>
              </div>
            </div>
          </div>
          <div class="tag-dialog-footer">
            <el-button type="danger" plain @click="removeWordFromDialog">移除单词</el-button>
            <span class="tag-dialog-spacer"></span>
            <el-button @click="tagDialog.visible = false">取消</el-button>
            <el-button type="primary" @click="saveWordTags">保存</el-button>
          </div>
        </div>
      </div>
    </Teleport>

    <el-dialog v-model="manualDialog.visible" title="手动录入" width="420px" class="manual-word-dialog"
      :close-on-click-modal="!manualDialog.loading" :close-on-press-escape="!manualDialog.loading">
      <el-form @submit.prevent="submitManualWord">
        <el-form-item label="单词">
          <el-input ref="manualInputRef" v-model="manualDialog.word" placeholder="输入一个英文单词" clearable
            :disabled="manualDialog.loading" @keyup.enter="submitManualWord" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="manualDialog.loading" @click="manualDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="manualDialog.loading" @click="submitManualWord">
          录入
        </el-button>
      </template>
    </el-dialog>

    <input ref="importInputRef" type="file" accept=".json,.txt,.csv,application/json,text/plain" class="hidden-input"
      @change="handleImport" />

    <el-dialog v-model="formatDialog.visible" :title="formatDialog.mode === 'export' ? '选择导出格式' : '选择导入格式'"
      width="460px" class="vocab-format-dialog" :close-on-click-modal="true">
      <div class="format-dialog-body">
        <el-radio-group v-model="formatDialog.selectedId">
          <div v-for="fmt in vocabFormatList" :key="fmt.id" class="format-option"
            :class="{ 'is-selected': formatDialog.selectedId === fmt.id }" @click="formatDialog.selectedId = fmt.id">
            <el-radio :label="fmt.id" :value="fmt.id" class="format-option-radio">
              <span class="format-option-name">{{ fmt.name }}</span>
            </el-radio>
            <p v-if="fmt.desc" class="format-option-desc">{{ fmt.desc }}</p>
          </div>
        </el-radio-group>
      </div>
      <template #footer>
        <el-button @click="formatDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmFormatDialog">
          {{ formatDialog.mode === 'export' ? '开始导出' : '选择文件' }}
        </el-button>
      </template>
    </el-dialog>

    <div v-if="vocabularyStore.statsVisible" ref="statsBarRef" class="vocab-stats-bar"
      :class="{ 'is-dragging': statsDrag.dragging }" :style="statsBarStyle" aria-label="生词统计"
      @pointerdown="startStatsDrag">
      <span class="vocab-stat vocab-stat-total">
        <span class="vocab-stat-label">总词汇</span>
        <span class="vocab-stat-value">{{ levelStats.total }}</span>
      </span>
      <span class="vocab-stat level-unknown">
        <span class="vocab-stat-label">不认识</span>
        <span class="vocab-stat-value">{{ levelStats.unknown }}</span>
      </span>
      <span class="vocab-stat level-learning">
        <span class="vocab-stat-label">已了解</span>
        <span class="vocab-stat-value">{{ levelStats.learning }}</span>
      </span>
      <span class="vocab-stat level-mastered">
        <span class="vocab-stat-label">已掌握</span>
        <span class="vocab-stat-value">{{ levelStats.mastered }}</span>
      </span>
      <span class="vocab-stat level-familiar">
        <span class="vocab-stat-label">已熟记</span>
        <span class="vocab-stat-value">{{ levelStats.familiar }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { speak } from '../../api/voice/index.js'
import { useBookStore } from '../../stores/book.js'
import { useProjectsStore } from '../../stores/projects.js'
import { useVocabularyStore } from '../../stores/vocabulary.js'
import { VOCABULARY_LEVELS } from '../../types/index.js'
import { getVocabFormatList, getVocabFormat } from '../../utils/vocabFormats.js'
import { clampPage, slicePage, totalPagesOf } from '../../utils/pagination.js'

const router = useRouter()
const projectsStore = useProjectsStore()
// 懒加载：只构造 reactive 空壳（<1ms），把昂贵 JSON.parse + normalize 延后到骨架渲染之后
const vocabularyStore = useVocabularyStore({ lazy: true })
const bookStore = useBookStore()

// ========================================================================
//  红框区本地骨架加载：不阻塞 header/toolbar，只让列表区闪一下骨架
//  真实耗时大头 = Vue patch（大表 → DOM 几千节点），分页直接根治
// ========================================================================
const listLoading = ref(true)  // 默认 true：挂载瞬间骨架先显示

async function runWithListLoading(fn) {
  listLoading.value = true
  try {
    // 让浏览器先画骨架，避免同步重任务直接阻塞导致"白屏卡一下"
    await nextTick()
    await new Promise(r => setTimeout(r, 0))
    if (typeof fn === 'function') await fn()
  } finally {
    listLoading.value = false
  }
}

// —— 筛选 / 排序状态：必须在 watcher 与 filteredWords 之前声明，避免 TDZ ——
const searchText = ref('')
const levelFilter = ref([])
const tagFilter = ref([])
const sortMode = ref('alphabet')

// —— 筛选 + 排序结果（后续所有 computed/watch 依赖它，必须最早就绪） ——
const filteredWords = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  let words = vocabularyStore.words.filter(entry => {
    const matchKeyword = !keyword
      || entry.word.includes(keyword)
      || String(entry.meaning || '').toLowerCase().includes(keyword)
    const selectedLevels = Array.isArray(levelFilter.value) ? levelFilter.value : []
    const matchLevel = !selectedLevels.length || selectedLevels.includes(entry.level)
    const selectedTags = Array.isArray(tagFilter.value) ? tagFilter.value : []
    const matchTags = !selectedTags.length || selectedTags.every(tagId => (entry.tagIds || []).includes(tagId))
    return matchKeyword && matchLevel && matchTags
  })
  if (sortMode.value === 'createdAt') {
    words = [...words].sort((a, b) => b.createdAt - a.createdAt)
  } else {
    words = [...words].sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }))
  }
  return words
})

// ========================== 分页（根治列表 DOM 卡顿） ==========================
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
      pageSize: pageSize.value
    }
  })
}

function onPageChange(p) {
  page.value = clampPage(filteredWords.value.length, p, pageSize.value)
  updateRouteQuery()
}
function onPageSizeChange(size) {
  pageSize.value = Math.max(1, Number(size) || 50)
  page.value = clampPage(filteredWords.value.length, page.value, pageSize.value)
  updateRouteQuery()
}

// —— 筛选/排序变化 → 回到第一页 ——
watch([searchText, levelFilter, tagFilter, sortMode], () => {
  page.value = 1
  updateRouteQuery()
})

// —— 列表总数变化 → 若当前页已越界则回落到最后一页 ——
watch(() => filteredWords.value.length, (n) => {
  const clamped = clampPage(n, page.value, pageSize.value)
  if (clamped !== page.value) page.value = clamped
})

// —— 切词库触发（设置页切换 activeBook → 切回词汇页时）：重加载 + 复位 ——
let lastActiveBookId = null
watch(() => vocabularyStore.activeBookId, (newId, oldId) => {
  if (newId === lastActiveBookId) return
  lastActiveBookId = newId
  if (oldId != null) {
    page.value = 1
    runWithListLoading(() => vocabularyStore.ensureLoaded())
  }
})

// —— 组件挂载：首屏骨架 → 跑重数据 → 关骨架 ——
onMounted(() => {
  runWithListLoading(() => {
    vocabularyStore.ensureLoaded()
    lastActiveBookId = vocabularyStore.activeBookId || null
  })
})
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
  loading: false
})
const tagDialog = ref({
  visible: false,
  word: '',
  level: 'unknown',
  memoryText: '',
  tagIds: []
})
const formatDialog = ref({
  visible: false,
  mode: 'import', // 'import' | 'export'
  selectedId: 'default'
})
const lastImportFormatId = ref('default')
const vocabFormatList = getVocabFormatList()

const sortOptions = [
  { label: '字母排序', value: 'alphabet' },
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

const activeBookName = computed(() => vocabularyStore.getActiveBook()?.name || '默认生词本')

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

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/home')
  }
}

function goSettings() {
  router.push('/vocabulary/settings')
}

function goTest() {
  router.push('/vocabulary/test')
}

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
  statsPosition.value = {
    left: rect.left,
    top: rect.top
  }
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
  statsDrag.value = {
    dragging: false,
    pointerId: null,
    offsetX: 0,
    offsetY: 0
  }
  window.removeEventListener('pointermove', moveStatsBar)
  window.removeEventListener('pointerup', stopStatsDrag)
  window.removeEventListener('pointercancel', stopStatsDrag)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', moveStatsBar)
  window.removeEventListener('pointerup', stopStatsDrag)
  window.removeEventListener('pointercancel', stopStatsDrag)
})

function normalizeManualWord(value) {
  return String(value || '').trim().toLowerCase()
}

function isSingleEnglishWord(value) {
  return /^[a-z]+(?:[-'][a-z]+)?$/i.test(value)
}

async function openManualDialog() {
  manualDialog.value = {
    visible: true,
    word: '',
    loading: false
  }
  await nextTick()
  manualInputRef.value?.focus?.()
}

async function submitManualWord() {
  if (manualDialog.value.loading) return

  const word = normalizeManualWord(manualDialog.value.word)
  if (!word) {
    ElMessage.warning('请输入要录入的单词')
    return
  }
  if (!isSingleEnglishWord(word)) {
    ElMessage.warning('手动录入只支持一个英文单词')
    return
  }

  manualDialog.value.loading = true
  try {
    const result = await bookStore.translateWordToChinese(word)
    const meaning = typeof result === 'object'
      ? String(result?.meaning || '').trim()
      : String(result || '').trim()
    const phonetic = typeof result === 'object'
      ? String(result?.phonetic || '').trim()
      : ''

    vocabularyStore.addWord({
      word,
      meaning,
      phonetic,
      memoryParts: autoMemoryParts(word)
    })
    manualDialog.value.visible = false
    ElMessage.success(`已录入「${word}」`)
  } catch (error) {
    ElMessage.error(`录入失败：${error.message || '请稍后重试'}`)
  } finally {
    manualDialog.value.loading = false
  }
}

function openWordDetail(word) {
  router.push(`/vocabulary/${encodeURIComponent(word)}`)
}

function levelLabel(level) {
  return VOCABULARY_LEVELS.find(item => item.value === level)?.label || '不认识'
}

function levelClass(level) {
  return `level-${VOCABULARY_LEVELS.some(item => item.value === level) ? level : 'unknown'}`
}

function updateLevel(word, level) {
  vocabularyStore.updateLevel(word, level)
}

function tagsForEntry(entry) {
  const tagIds = new Set(entry.tagIds || [])
  return vocabularyStore.tags.filter(tag => tagIds.has(tag.id))
}

function splitMemoryText(text) {
  return String(text || '')
    .split(/[.\s/|,，、;；]+/)
    .map(part => part.trim())
    .filter(Boolean)
}

function autoMemoryParts(word) {
  const value = String(word || '').trim()
  const compoundMap = {
    everywhere: ['every', 'where'],
    somewhere: ['some', 'where'],
    anywhere: ['any', 'where'],
    nowhere: ['no', 'where']
  }
  if (compoundMap[value.toLowerCase()]) return compoundMap[value.toLowerCase()]
  if (value.length <= 4) return value ? [value] : []
  if (value.length <= 6) return [value.slice(0, 2), value.slice(2)]
  if (value.endsWith('ing') && value.length > 5) return [value.slice(0, -3), 'ing']
  if (value.endsWith('ed') && value.length > 5) return [value.slice(0, -2), 'ed']
  return [value.slice(0, 3), value.slice(3)]
}

function memoryPartsForEntry(entry) {
  return Array.isArray(entry.memoryParts) && entry.memoryParts.length
    ? entry.memoryParts
    : autoMemoryParts(entry.word)
}

function openTagDialog(entry) {
  tagDialog.value = {
    visible: true,
    word: entry.word,
    level: entry.level || 'unknown',
    memoryText: (entry.memoryParts?.length ? entry.memoryParts : autoMemoryParts(entry.word)).join('.'),
    tagIds: [...(entry.tagIds || [])]
  }
}

function saveWordTags() {
  vocabularyStore.updateWord(tagDialog.value.word, {
    level: tagDialog.value.level,
    memoryParts: splitMemoryText(tagDialog.value.memoryText),
    tagIds: tagDialog.value.tagIds
  })
  tagDialog.value.visible = false
  ElMessage.success('已保存设置')
}

async function playWord(entry) {
  speak(entry.word, 'en-US')
  if (entry.phonetic) return
  try {
    const result = await bookStore.translateWordToChinese(entry.word)
    const phonetic = typeof result === 'object' ? result?.phonetic : ''
    const meaning = typeof result === 'object' ? result?.meaning : ''
    if (phonetic) {
      vocabularyStore.updateWord(entry.word, {
        phonetic,
        meaning: entry.meaning || meaning || ''
      })
    }
  } catch {
    // 发音不受音标补查失败影响
  }
}

async function removeWord(word) {
  try {
    await ElMessageBox.confirm(`确定从生词本移除「${word}」吗？`, '提示', {
      confirmButtonText: '移除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    vocabularyStore.removeWord(word)
    ElMessage.success('已移除')
    return true
  } catch {
    // 用户取消
    return false
  }
}

async function removeWordFromDialog() {
  const word = tagDialog.value.word
  tagDialog.value.visible = false
  await nextTick()
  const removed = await removeWord(word)
}

function openFormatDialog(mode) {
  const defaultId = mode === 'import' ? lastImportFormatId.value : 'default'
  const exists = vocabFormatList.some(f => f.id === defaultId)
  formatDialog.value = {
    visible: true,
    mode,
    selectedId: exists ? defaultId : 'default'
  }
}

function downloadBlob(content, mime, filename) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportWordsWithFormat(formatId) {
  const fmt = getVocabFormat(formatId)
  if (!fmt) {
    ElMessage.error('未知的导出格式')
    return
  }
  const safeBookName = activeBookName.value.replace(/[\\/:*?"<>|]+/g, '_') || '生词本'
  const result = fmt.serialize(vocabularyStore.words, vocabularyStore.tags, {
    bookName: activeBookName.value,
    exportedAt: new Date().toISOString()
  })
  downloadBlob(result.content, result.mime, `${safeBookName}.${result.ext}`)
  ElMessage.success(`已以「${fmt.name}」导出生词本`)
}

function confirmFormatDialog() {
  const fmtId = formatDialog.value.selectedId
  const fmt = getVocabFormat(fmtId)
  if (!fmt) {
    ElMessage.error('请选择一个格式')
    return
  }
  const mode = formatDialog.value.mode
  formatDialog.value.visible = false

  if (mode === 'export') {
    nextTick(() => exportWordsWithFormat(fmtId))
    return
  }

  // 导入：根据所选格式设置 accept 后触发文件选择
  lastImportFormatId.value = fmtId
  nextTick(() => {
    const input = importInputRef.value
    if (input) {
      input.accept = fmt.importAccept || ''
      input.dataset.formatId = fmtId
      input.value = ''
      input.click()
    }
  })
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  const fmtId = event.target.dataset?.formatId || lastImportFormatId.value || 'default'
  const fmt = getVocabFormat(fmtId)
  if (!fmt) {
    ElMessage.error('未知的导入格式')
    return
  }

  try {
    const rawText = await readTextFile(file)
    const { words, tags } = fmt.deserialize(rawText)
    if (!Array.isArray(words) || !words.length) throw new Error('未解析到任何单词')
    if (fmtId === 'default' && Array.isArray(tags) && tags.length) {
      vocabularyStore.importTags(tags)
    }
    const count = await vocabularyStore.importWords(words)
    ElMessage.success(`已通过「${fmt.name}」导入 ${count} 个单词到「${activeBookName.value}」`)
  } catch (error) {
    ElMessage.error(`「${fmt.name}」导入失败：${error.message || '请检查文件后重试'}`)
  }
}
</script>

<style scoped>
/* =========================================================
   红框列表区骨架 + shimmer：只在列表 body 显示 loading
   ========================================================= */
.vocab-list-skeleton {
  position: relative;
  overflow: hidden;
}

.vocab-skeleton-row {
  min-height: 64px;
}

.vocab-skeleton {
  position: relative;
  border-radius: 4px;
  background: linear-gradient(90deg,
      #eef1ee 0%,
      #f4f7f5 40%,
      #eef1ee 80%);
  background-size: 200% 100%;
  animation: vocab-shimmer 1.3s linear infinite;
  overflow: hidden;
  min-height: 16px;
}

.vocab-skeleton-word {
  width: 62%;
  min-height: 18px;
}

.vocab-skeleton-pronunciation {
  width: 75%;
  min-height: 18px;
}

.vocab-skeleton-memory {
  width: 55%;
  min-height: 18px;
}

.vocab-skeleton-meaning {
  width: 92%;
  min-height: 18px;
}

.vocab-skeleton-tags {
  width: 42%;
  min-height: 18px;
}

.vocab-skeleton-level {
  width: 68%;
  min-height: 22px;
  border-radius: 14px;
}

.vocab-skeleton-action {
  width: 62%;
  min-height: 22px;
  border-radius: 14px;
}

@keyframes vocab-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

/* 分页条：与 header/toolbar/list 保持完全同宽同起点 */
.vocab-pagination {
  width: 100% !important;
  max-width: var(--section-max) !important;
  margin-left: auto !important;
  margin-right: auto !important;
  margin-top: 16px;
  box-sizing: border-box !important;
  padding: 10px var(--section-inner-hpad);
  display: flex;
  justify-content: flex-end;
  background: rgba(255, 255, 255, 0.94);
  border: var(--section-border) solid #d7dfdc;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(22, 32, 31, 0.06);
}

:deep(.vocab-pagination .el-pagination) {
  justify-content: flex-end;
}

.vocab-page {
  /* 生词本三大区域统一宽度/间距 token：修改时只改这里 */
  --section-max: 1500px;
  --section-hpad: 16px;
  /* 页面级视觉衬垫：三块共同的水平外边距 */
  --section-border: 1px;
  /* toolbar/list 的 border 厚度 */
  --section-inner-hpad: calc(var(--section-hpad) - var(--section-border));
  /* toolbar/list 内部 padding(=15) + border(=1) = 与页面衬垫对齐 */

  min-height: 100vh;
  box-sizing: border-box;
  padding: 28px var(--section-hpad);
  /* ← 关键：整个页面 16px 水平衬垫，让三块视觉边缘从同一起点开始 */
  background: linear-gradient(135deg, #eef4f1 0%, #f8f7f2 48%, #edf1f8 100%);
}

/* ===== 四处统一宽度规则：完全同一条规则保证外框等宽（含分页条） ===== */
.vocab-header,
.vocab-toolbar,
.vocab-list,
.vocab-pagination {
  width: 100% !important;
  max-width: var(--section-max) !important;
  margin-left: auto !important;
  margin-right: auto !important;
  box-sizing: border-box !important;
}

.vocab-header {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
  padding: 0 !important;
  /* ← 关键：页面级 padding 已承担水平衬垫，header 自身归零，让返回按钮外边缘直接对齐 toolbar/list 卡片外边缘 */
}

.vocab-title-wrap,
.vocab-actions,
.vocab-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vocab-title {
  margin: 0;
  color: #16201f;
  font-size: 22px;
  font-weight: 700;
}

.vocab-stats-bar {
  position: fixed;
  top: 50%;
  right: 18px;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  max-width: calc(100vw - 24px);
  padding: 10px;
  border: 1px solid rgba(207, 217, 214, 0.85);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 48px rgba(22, 32, 31, 0.18);
  backdrop-filter: blur(16px);
  color: #40504c;
  cursor: grab;
  text-align: center;
  transform: translateY(-50%);
  user-select: none;
  touch-action: none;
}

.vocab-stats-bar.is-dragging {
  cursor: grabbing;
  box-shadow: 0 22px 60px rgba(22, 32, 31, 0.26);
}

.vocab-stat {
  --stat-color: #40504c;
  --stat-bg: #f4f7f6;
  --stat-border: #d7dfdc;
  display: grid;
  grid-template-rows: auto auto;
  gap: 7px;
  min-width: 72px;
  padding: 10px 10px 9px;
  border: 1px solid var(--stat-border);
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, var(--stat-bg) 100%);
  box-shadow: 0 8px 20px rgba(22, 32, 31, 0.08);
  color: var(--stat-color) !important;
  line-height: 1.1;
  white-space: nowrap;
}

.vocab-stat-label {
  font-size: 13px;
  font-weight: 800;
}

.vocab-stat-value {
  display: grid;
  place-items: center;
  min-width: 48px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--stat-color);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.12);
  color: #fff;
  font-size: 24px;
  font-weight: 900;
}

.vocab-stat-total {
  --stat-color: #16201f;
  --stat-bg: #eef2f1;
  --stat-border: #cfd9d6;
  color: #16201f;
}

.vocab-actions {
  justify-self: end;
}

.vocab-toolbar {
  margin-bottom: 12px;
  padding: 14px var(--section-inner-hpad);
  border: var(--section-border) solid #d7dfdc;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
}

.vocab-search {
  flex: 1;
  min-width: 220px;
}

.vocab-filter {
  width: 170px;
}

.vocab-tag-filter {
  width: 190px;
}

.vocab-sort {
  flex-shrink: 0;
}

.vocab-list {
  border: var(--section-border) solid #d7dfdc;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
}

.vocab-list-head,
.vocab-row {
  display: grid;
  grid-template-columns: 150px 150px 150px minmax(220px, 1.6fr) 100px 80px 60px;
  align-items: center;
  gap: 12px;
}

.vocab-list-head {
  padding: 12px var(--section-inner-hpad);
  color: #63706d;
  font-size: 12px;
  font-weight: 700;
  background: #f0f4f3;
}

.vocab-row {
  min-height: 58px;
  padding: 10px var(--section-inner-hpad);
  border-top: 1px solid #edf1ef;
}

.vocab-row:hover {
  background: #fbfdfc;
}

.vocab-word {
  display: inline-flex;
  width: fit-content;
  border: 0;
  padding: 0;
  background: transparent;
  color: #101919;
  cursor: pointer;
  font-size: 18px;
  font-weight: 800;
  text-align: left;
}

.vocab-word:hover {
  color: #126b62;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.vocab-pronunciation {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #126b62;
  font-size: 14px;
  font-weight: 700;
}

.vocab-sound {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #b8d6cb;
  border-radius: 999px;
  background: #eef7f4;
  color: #0c514b;
  cursor: pointer;
}

.vocab-sound svg {
  width: 13px;
  height: 13px;
  fill: currentColor;
}

.vocab-meaning {
  color: #40504c;
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-wrap;
}

.vocab-memory-head,
.vocab-memory {
  text-align: center;
}

.vocab-memory {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0;
}

.memory-part {
  line-height: 1.2;
}

.memory-part-0 {
  color: #1d68b3;
}

.memory-part-1 {
  color: #ff7a00;
}

.memory-part-2 {
  color: #19a974;
}

.memory-part-3 {
  color: #8f4fd8;
}

.memory-dot {
  color: #b8c2bf;
  font-weight: 700;
  padding: 0 2px;
}

.vocab-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  text-align: center;
}

.vocab-tag-empty {
  color: #8c9996;
}

.vocab-tags-head {
  text-align: center;
}

.vocab-action-head,
.vocab-action {
  text-align: center;
}

.vocab-level-head {
  text-align: center;
}

.vocab-action {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.vocab-action :deep(.el-button) {
  margin-left: 0;
  background: #fff;
}

.vocab-level {
  position: relative;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.vocab-level-label {
  font-size: 13px;
  font-weight: 700;
}

.vocab-level-select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}

.vocab-row:hover .vocab-level-select {
  opacity: 1;
  pointer-events: auto;
}

.vocab-row:hover .vocab-level-label {
  opacity: 0;
}

.level-unknown {
  --stat-color: #e5484d;
  --stat-bg: #fff1f1;
  --stat-border: #ffd1d1;
  color: #e5484d !important;
}

.level-learning {
  --stat-color: #1d68d8;
  --stat-bg: #eef5ff;
  --stat-border: #cfe1ff;
  color: #1d68d8 !important;
}

.level-mastered {
  --stat-color: #f08a24;
  --stat-bg: #fff6ea;
  --stat-border: #ffdfb8;
  color: #f08a24 !important;
}

.level-familiar {
  --stat-color: #19a974;
  --stat-bg: #effaf5;
  --stat-border: #c8efd9;
  color: #19a974 !important;
}

.vocab-level-select.level-unknown :deep(.el-select__placeholder),
.tag-dialog-control.level-unknown :deep(.el-select__placeholder) {
  color: #e5484d;
}

.vocab-level-select.level-learning :deep(.el-select__placeholder),
.tag-dialog-control.level-learning :deep(.el-select__placeholder) {
  color: #1d68d8;
}

.vocab-level-select.level-mastered :deep(.el-select__placeholder),
.tag-dialog-control.level-mastered :deep(.el-select__placeholder) {
  color: #f08a24;
}

.vocab-level-select.level-familiar :deep(.el-select__placeholder),
.tag-dialog-control.level-familiar :deep(.el-select__placeholder) {
  color: #19a974;
}

:global(.vocab-level-popper .level-unknown) {
  color: #e5484d;
}

:global(.vocab-level-popper .level-learning) {
  color: #1d68d8;
}

:global(.vocab-level-popper .level-mastered) {
  color: #f08a24;
}

:global(.vocab-level-popper .level-familiar) {
  color: #19a974;
}

:global(.vocab-level-popper .el-select-dropdown__item.is-selected) {
  font-weight: 800;
}

.vocab-empty {
  padding: 42px 16px;
  color: #8c9996;
  text-align: center;
}

.hidden-input {
  display: none;
}

.tag-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.42);
}

.tag-dialog {
  width: 520px;
  max-width: 92vw;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.tag-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px 14px;
  border-bottom: 1px solid #edf1ef;
}

.tag-dialog-header h3 {
  margin: 0;
  color: #16201f;
  font-size: 18px;
}

.tag-dialog-header p {
  margin: 6px 0 0;
  color: #8c9996;
  font-size: 13px;
}

.tag-dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #63706d;
  cursor: pointer;
  font-size: 22px;
}

.tag-dialog-close:hover {
  background: #f0f4f3;
  color: #16201f;
}

.tag-dialog-body {
  padding: 18px 14px 8px;
}

.tag-dialog-field {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 8px 0;
}

.tag-dialog-label {
  color: #40504c;
  font-size: 14px;
  font-weight: 700;
  text-align: right;
}

.tag-dialog-word {
  color: #101919;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
}

.tag-dialog-control,
.tag-dialog-control-wrap {
  width: 100%;
  min-width: 0;
}

.tag-dialog-empty {
  margin-top: 8px;
  color: #8c9996;
  font-size: 13px;
}

.tag-dialog-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 22px 20px;
  border-top: 1px solid #edf1ef;
}

.tag-dialog-spacer {
  flex: 1;
}

@media (max-width: 900px) {
  .vocab-header {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .vocab-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .vocab-actions {
    justify-self: start;
  }

  .vocab-stats-bar {
    right: 12px;
    gap: 6px;
    padding: 8px;
    border-radius: 18px;
  }

  .vocab-stat {
    min-width: 60px;
    padding: 8px;
  }

  .vocab-stat-value {
    min-width: 40px;
    min-height: 28px;
    font-size: 20px;
  }

  .vocab-list {
    overflow-x: auto;
  }

  .vocab-list-head,
  .vocab-row {
    min-width: 1120px;
  }
}

:global(.vocab-format-dialog) {
  --fmt-border: #e1ebe7;
  --fmt-bg: #f7faf9;
  --fmt-active-border: #5ec4a9;
  --fmt-active-bg: #ecfbf6;
}

:global(.vocab-format-dialog .el-dialog__body) {
  padding-top: 8px;
}

.format-dialog-body {
  width: 100%;
  padding: 0;
  box-sizing: border-box;
}

.format-dialog-body :deep(.el-radio-group) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  row-gap: 0;
}

.format-option {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  margin-bottom: 10px;
  border: 1px solid var(--fmt-border, #e1ebe7);
  border-radius: 8px;
  background: var(--fmt-bg, #f7faf9);
  cursor: pointer;
  transition: all 0.15s ease;
}

.format-option:last-child {
  margin-bottom: 0;
}

.format-option:hover {
  border-color: #b7e0d3;
  background: #f3fbf8;
}

.format-option.is-selected {
  border-color: var(--fmt-active-border, #5ec4a9);
  background: var(--fmt-active-bg, #ecfbf6);
  box-shadow: 0 4px 14px rgba(94, 196, 169, 0.15);
}

.format-option :deep(.el-radio) {
  display: inline-flex;
  align-items: center;
  margin-right: 0;
  width: 100%;
}

.format-option :deep(.el-radio__input) {
  align-self: center;
  margin-top: 0;
}

.format-option :deep(.el-radio__label) {
  display: inline-flex;
  align-items: center;
  padding-left: 8px;
  flex: 1;
  min-height: 20px;
}

.format-option-name {
  font-size: 15px;
  font-weight: 700;
  color: #16201f;
  line-height: 1.2;
}

.format-option-desc {
  margin: 8px 0 0 28px;
  padding: 0;
  color: #63706d;
  font-size: 13px;
  line-height: 1.5;
}
</style>
