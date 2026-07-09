<template>
  <div class="vocab-page">
    <header class="vocab-header">
      <div class="vocab-title-wrap">
        <el-button type="primary" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回主页面
        </el-button>
        <h2 class="vocab-title">生词本</h2>
      </div>
      <div class="vocab-actions">
        <el-button @click="triggerImport">导入</el-button>
        <el-button type="primary" @click="exportWords">导出</el-button>
        <el-button @click="goSettings">设置</el-button>
      </div>
    </header>

    <section class="vocab-toolbar">
      <el-input
        v-model="searchText"
        clearable
        placeholder="搜索单词或中文意思"
        class="vocab-search"
      />
      <el-select v-model="levelFilter" class="vocab-filter">
        <el-option label="全部" value="all" />
        <el-option
          v-for="level in VOCABULARY_LEVELS"
          :key="level.value"
          :label="level.label"
          :value="level.value"
        />
      </el-select>
      <el-select
        v-model="tagFilter"
        class="vocab-tag-filter"
        multiple
        collapse-tags
        collapse-tags-tooltip
        clearable
        placeholder="按标签筛选"
      >
        <el-option
          v-for="tag in vocabularyStore.tags"
          :key="tag.id"
          :label="tag.name"
          :value="tag.id"
        />
      </el-select>
      <el-segmented
        v-model="sortMode"
        :options="sortOptions"
        class="vocab-sort"
      />
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

      <div v-if="!filteredWords.length" class="vocab-empty">
        暂无生词。
      </div>

      <div
        v-for="entry in filteredWords"
        :key="entry.word"
        class="vocab-row"
      >
        <strong class="vocab-word">{{ entry.word }}</strong>
        <div class="vocab-pronunciation">
          <button class="vocab-sound" @click="playWord(entry)">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
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
          <el-tag
            v-for="tag in tagsForEntry(entry)"
            :key="tag.id"
            size="small"
            effect="plain"
          >
            {{ tag.name }}
          </el-tag>
          <span v-if="!tagsForEntry(entry).length" class="vocab-tag-empty">-</span>
        </div>
        <div class="vocab-level">
          <span class="vocab-level-label">{{ levelLabel(entry.level) }}</span>
          <el-select
            class="vocab-level-select"
            :model-value="entry.level"
            size="small"
            @change="value => updateLevel(entry.word, value)"
          >
            <el-option
              v-for="level in VOCABULARY_LEVELS"
              :key="level.value"
              :label="level.label"
              :value="level.value"
            />
          </el-select>
        </div>
        <div class="vocab-action">
          <el-button size="small" plain @click="openTagDialog(entry)">设置</el-button>
        </div>
      </div>
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
              <el-select
                v-model="tagDialog.level"
                class="tag-dialog-control"
                :teleported="false"
              >
                <el-option
                  v-for="level in VOCABULARY_LEVELS"
                  :key="level.value"
                  :label="level.label"
                  :value="level.value"
                />
              </el-select>
            </div>
            <div class="tag-dialog-field">
              <div class="tag-dialog-label">辅助记忆</div>
              <el-input
                v-model="tagDialog.memoryText"
                class="tag-dialog-control"
                placeholder="例如：fa.mous"
                clearable
              />
            </div>
            <div class="tag-dialog-field">
              <div class="tag-dialog-label">单词标签</div>
              <div class="tag-dialog-control-wrap">
                <el-select
                  v-model="tagDialog.tagIds"
                  multiple
                  clearable
                  placeholder="选择标签"
                  class="tag-dialog-control"
                  :teleported="false"
                >
                  <el-option
                    v-for="tag in vocabularyStore.tags"
                    :key="tag.id"
                    :label="tag.name"
                    :value="tag.id"
                  />
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

    <input
      ref="importInputRef"
      type="file"
      accept="application/json,.json"
      class="hidden-input"
      @change="handleImport"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { speak } from '../../api/voice/index.js'
import { useBookStore } from '../../stores/book.js'
import { useProjectsStore } from '../../stores/projects.js'
import { useVocabularyStore, VOCABULARY_LEVELS } from '../../stores/vocabulary.js'

const router = useRouter()
const projectsStore = useProjectsStore()
const vocabularyStore = useVocabularyStore()
const bookStore = useBookStore()

const searchText = ref('')
const levelFilter = ref('all')
const tagFilter = ref([])
const sortMode = ref('alphabet')
const importInputRef = ref(null)
const tagDialog = ref({
  visible: false,
  word: '',
  level: 'unknown',
  memoryText: '',
  tagIds: []
})

const sortOptions = [
  { label: '字母排序', value: 'alphabet' },
  { label: '添加时间', value: 'createdAt' }
]

const filteredWords = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  let words = vocabularyStore.words.filter(entry => {
    const matchKeyword = !keyword
      || entry.word.includes(keyword)
      || String(entry.meaning || '').toLowerCase().includes(keyword)
    const matchLevel = levelFilter.value === 'all' || entry.level === levelFilter.value
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

function goBack() {
  const active = projectsStore.getActiveProject()
  router.push(`/main/${active?.index || '001'}`)
}

function goSettings() {
  router.push('/vocabulary/settings')
}

function levelLabel(level) {
  return VOCABULARY_LEVELS.find(item => item.value === level)?.label || '不认识'
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

function exportWords() {
  const payload = {
    schema: 'bilingual-reader-vocabulary',
    version: 1,
    exportedAt: new Date().toISOString(),
    tags: vocabularyStore.tags,
    words: vocabularyStore.words
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '生词本.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('已导出生词本')
}

function triggerImport() {
  importInputRef.value?.click()
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || '{}')))
      } catch {
        reject(new Error('导入文件不是有效的 JSON'))
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    const payload = await readJsonFile(file)
    const words = Array.isArray(payload)
      ? payload
      : (payload.schema === 'bilingual-reader-vocabulary' ? payload.words : null)
    if (!Array.isArray(words)) throw new Error('不支持的生词本文件')
    if (payload?.schema === 'bilingual-reader-vocabulary') {
      vocabularyStore.importTags(payload.tags)
    }
    const count = vocabularyStore.importWords(words)
    ElMessage.success(`已导入 ${count} 个单词`)
  } catch (error) {
    ElMessage.error(`导入失败：${error.message || '请检查文件后重试'}`)
  }
}
</script>

<style scoped>
.vocab-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28px;
  background: linear-gradient(135deg, #eef4f1 0%, #f8f7f2 48%, #edf1f8 100%);
}

.vocab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1180px;
  margin: 0 auto 18px;
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

.vocab-toolbar {
  max-width: 1180px;
  margin: 0 auto 12px;
  padding: 14px;
  border: 1px solid #d7dfdc;
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
  max-width: 1180px;
  margin: 0 auto;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
}

.vocab-list-head,
.vocab-row {
  display: grid;
  grid-template-columns: minmax(120px, 0.8fr) minmax(130px, 0.85fr) minmax(150px, 1fr) minmax(220px, 1.6fr) minmax(140px, 0.9fr) 130px 120px;
  align-items: center;
  gap: 12px;
}

.vocab-list-head {
  padding: 12px 16px;
  color: #63706d;
  font-size: 12px;
  font-weight: 700;
  background: #f0f4f3;
}

.vocab-row {
  min-height: 58px;
  padding: 10px 16px;
  border-top: 1px solid #edf1ef;
}

.vocab-row:hover {
  background: #fbfdfc;
}

.vocab-word {
  color: #101919;
  font-size: 18px;
  font-weight: 800;
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
  color: #63706d;
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
  .vocab-header,
  .vocab-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .vocab-list {
    overflow-x: auto;
  }

  .vocab-list-head,
  .vocab-row {
    min-width: 1120px;
  }
}
</style>
