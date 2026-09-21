<template>
  <div class="cn-settings-page">
    <header class="cn-settings-header">
      <el-button type="primary" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2 class="cn-settings-title">中文生词本设置</h2>
    </header>

    <!-- 列表显示设置 -->
    <section class="cn-settings-card cn-card-column">
      <div class="cn-card-header">列表显示设置</div>
      <div class="cn-card-body">
        <p class="cn-setting-desc">控制中文生词本列表中各列的显示与隐藏，以及右下角悬浮统计的显示。</p>
        <div class="cn-column-settings">
          <div class="cn-column-row">
            <span class="cn-column-name">拼音</span>
            <el-switch :model-value="chineseStore.visibleColumns.pinyin"
              @change="value => updateVisibleColumn('pinyin', value)" />
          </div>
          <div class="cn-column-row">
            <span class="cn-column-name">标签</span>
            <el-switch :model-value="chineseStore.visibleColumns.tags"
              @change="value => updateVisibleColumn('tags', value)" />
          </div>
          <div class="cn-column-row">
            <span class="cn-column-name">掌握水平</span>
            <el-switch :model-value="chineseStore.visibleColumns.level"
              @change="value => updateVisibleColumn('level', value)" />
          </div>
          <div class="cn-column-row">
            <span class="cn-column-name">备注</span>
            <el-switch :model-value="chineseStore.visibleColumns.note"
              @change="value => updateVisibleColumn('note', value)" />
          </div>
          <div class="cn-column-row">
            <span class="cn-column-name">统计浮窗</span>
            <el-switch :model-value="chineseStore.statsVisible" @change="toggleStatsVisible" />
          </div>
        </div>
      </div>
    </section>

    <!-- 生词本管理 -->
    <section class="cn-settings-card cn-card-book">
      <div class="cn-card-header">生词本管理</div>
      <div class="cn-card-body">
        <div class="cn-input-row">
          <el-input v-model="bookName" clearable placeholder="例如：一年级上册、成语专项、易错字"
            @keyup.enter="addBook" />
          <el-button type="primary" @click="addBook">添加生词本</el-button>
        </div>

        <div class="cn-book-list">
          <div v-for="book in chineseStore.books" :key="book.id" class="cn-book-row">
            <div class="cn-book-info">
              <span class="cn-book-name">{{ book.name }}</span>
              <el-tag v-if="book.id === chineseStore.activeBookId" size="small" type="warning" effect="plain">
                当前
              </el-tag>
              <span class="cn-book-count">{{ book.words.length }} 个词条 · {{ book.tags.length }} 个标签</span>
            </div>
            <div class="cn-book-actions">
              <el-button size="small" plain :disabled="book.id === chineseStore.activeBookId"
                @click="setActiveBook(book)">切换</el-button>
              <el-button size="small" plain @click="renameBook(book)">重命名</el-button>
              <el-button size="small" type="danger" plain :disabled="chineseStore.books.length <= 1"
                :title="chineseStore.books.length <= 1 ? '至少保留一个生词本' : '删除此生词本及其中全部词条'"
                @click="removeBook(book)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 标签管理 -->
    <section class="cn-settings-card cn-card-tag">
      <div class="cn-card-header">
        当前生词本标签：{{ chineseStore.getActiveBook()?.name || '默认中文生词本' }}
      </div>
      <div class="cn-card-body">
        <div class="cn-input-row">
          <el-input v-model="tagName" clearable placeholder="例如：第1页、本周、成语"
            @keyup.enter="addTag" />
          <el-button type="primary" @click="addTag">添加</el-button>
        </div>

        <div class="cn-tag-list">
          <div v-if="!chineseStore.tags.length" class="cn-tag-empty">暂无自定义标签。</div>
          <div v-for="tag in chineseStore.tags" :key="tag.id" class="cn-tag-pill">
            <span class="cn-tag-name">{{ tag.name }}</span>
            <button class="cn-tag-remove" title="删除" @click="removeTag(tag)">&times;</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 百度汉语缓存 -->
    <section class="cn-settings-card cn-card-cache">
      <div class="cn-card-header">百度汉语数据缓存</div>
      <div class="cn-card-body">
        <p class="cn-setting-desc">
          录入词条时会通过本地服务从百度汉语抓取拼音、释义、组词、例句等数据，并缓存到浏览器本地数据库
          （独立于英语生词本）。清理缓存后，下次刷新词条会重新抓取，不影响已保存的词条内容。
        </p>
        <div class="cn-cache-actions">
          <el-button type="warning" plain :loading="clearingCache" @click="clearHanyuCache">
            清空百度汉语缓存
          </el-button>
          <el-button plain @click="clearMemoCache">清空短期内存缓存</el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useChineseStore } from '../../stores/chinese.js'
import { clearHanyuMemo } from '../../api/hanyu/index.js'

const router = useRouter()
const chineseStore = useChineseStore({ lazy: true })

const bookName = ref('')
const tagName = ref('')
const clearingCache = ref(false)

onMounted(() => {
  chineseStore.ensureLoaded()
})

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/chinese')
  }
}

function toggleStatsVisible(visible) {
  chineseStore.setStatsVisible(visible)
  ElMessage.success(visible ? '已显示统计浮窗' : '已隐藏统计浮窗')
}

function updateVisibleColumn(column, value) {
  chineseStore.setVisibleColumns({
    ...chineseStore.visibleColumns,
    [column]: value
  })
}

async function addBook() {
  const name = bookName.value.trim()
  if (!name) {
    ElMessage.warning('请输入生词本名称')
    return
  }
  const existing = chineseStore.books.find(book => book.name === name)
  const book = await chineseStore.addBook(name)
  bookName.value = ''
  ElMessage.success(existing ? `生词本「${book.name}」已存在` : `已添加生词本「${book.name}」`)
}

async function setActiveBook(book) {
  const switched = await chineseStore.setActiveBook(book.id)
  if (switched) {
    ElMessage.success(`已切换到「${book.name}」`)
  }
}

async function renameBook(book) {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的生词本名称', `重命名「${book.name}」`, {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValue: book.name,
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空'
    })
    const name = String(value || '').trim()
    if (!name) return
    const updated = await chineseStore.renameBook(book.id, name)
    if (!updated) {
      ElMessage.warning('生词本名称已存在')
      return
    }
    ElMessage.success(`已重命名为「${updated.name}」`)
  } catch {
    // 用户取消
  }
}

async function removeBook(book) {
  if (chineseStore.books.length <= 1) {
    ElMessage.warning('至少需要保留一个生词本')
    return
  }
  const count = Array.isArray(book.words) ? book.words.length : 0
  const isActive = book.id === chineseStore.activeBookId
  const warnActive = isActive ? '当前正在使用的生词本，删除后将自动切换到第一本。\n' : ''
  const warnWords = count > 0 ? `将永久删除其中的 ${count} 个词条。\n` : ''
  try {
    await ElMessageBox.confirm(
      `确定删除生词本「${book.name}」吗？\n${warnActive}${warnWords}此操作不可撤销。`,
      '删除生词本',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    const ok = await chineseStore.removeBook(book.id)
    if (!ok) {
      ElMessage.error('删除失败，请稍后重试')
      return
    }
    ElMessage.success(`已删除生词本「${book.name}」`)
  } catch {
    // 用户取消
  }
}

async function addTag() {
  const name = tagName.value.trim()
  if (!name) {
    ElMessage.warning('请输入标签名称')
    return
  }
  const existing = chineseStore.tags.find(tag => tag.name === name)
  const tag = await chineseStore.addTag(name)
  tagName.value = ''
  ElMessage.success(existing ? `标签「${tag.name}」已存在` : `已添加标签「${tag.name}」`)
}

async function removeTag(tag) {
  try {
    await ElMessageBox.confirm(`删除标签「${tag.name}」后，会从所有词条上移除这个标签。`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await chineseStore.removeTag(tag.id)
    ElMessage.success('已删除')
  } catch {
    // 用户取消
  }
}

async function clearHanyuCache() {
  try {
    await ElMessageBox.confirm(
      '清空百度汉语本地缓存后，下次刷新词条需要重新联网抓取（较慢）。确定继续？',
      '清空缓存',
      { confirmButtonText: '清空', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  clearingCache.value = true
  try {
    await chineseStore.clearHanyuCache()
    clearHanyuMemo()
    ElMessage.success('百度汉语缓存已清空')
  } finally {
    clearingCache.value = false
  }
}

function clearMemoCache() {
  clearHanyuMemo()
  ElMessage.success('短期内存缓存已清空')
}
</script>

<style scoped>
.cn-settings-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24px 28px 80px;
  background: linear-gradient(135deg, #fef6ec 0%, #f8f5f0 48%, #fdf4ea 100%);
}

.cn-settings-header,
.cn-settings-card {
  max-width: 960px;
  margin-left: auto;
  margin-right: auto;
}

.cn-settings-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}

.cn-settings-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #1c1408;
}

.cn-settings-card {
  margin-bottom: 16px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #f4e2cc;
  box-shadow: 0 6px 20px rgba(184, 72, 15, 0.07);
  background: rgba(255, 255, 255, 0.96);
}

.cn-card-header {
  padding: 16px 22px;
  font-size: 16px;
  font-weight: 800;
  color: #1c1408;
}

.cn-card-column .cn-card-header {
  background: linear-gradient(135deg, #fde8d4 0%, #fbd0a8 100%);
}

.cn-card-book .cn-card-header {
  background: linear-gradient(135deg, #fff1d6 0%, #ffd591 100%);
}

.cn-card-tag .cn-card-header {
  background: linear-gradient(135deg, #f6e7fb 0%, #e3c2f4 100%);
}

.cn-card-cache .cn-card-header {
  background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%);
}

.cn-card-body {
  padding: 18px 22px;
}

.cn-setting-desc {
  margin: 0 0 14px;
  color: #8b6645;
  font-size: 13px;
  line-height: 1.7;
}

.cn-column-settings {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.cn-column-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid #f7e8d6;
  border-radius: 10px;
  background: #fff9f2;
}

.cn-column-name {
  color: #1c1408;
  font-size: 14px;
  font-weight: 600;
}

.cn-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cn-input-row .el-input {
  flex: 1;
}

.cn-book-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #f7e8d6;
}

.cn-book-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid #f7e8d6;
  border-radius: 10px;
  background: #fff9f2;
}

.cn-book-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cn-book-name {
  color: #1c1408;
  font-size: 16px;
  font-weight: 800;
}

.cn-book-count {
  color: #a0795a;
  font-size: 13px;
}

.cn-book-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.cn-book-actions :deep(.el-button) {
  margin-left: 0;
}

.cn-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #f7e8d6;
}

.cn-tag-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #e5b07f;
  border-radius: 999px;
  background: #fef6ec;
  color: #b8480f;
}

.cn-tag-name {
  font-size: 14px;
  font-weight: 700;
}

.cn-tag-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #f2b8b8;
  border-radius: 999px;
  background: #fff;
  color: #e5484d;
  cursor: pointer;
  font-size: 18px;
  line-height: 18px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}

.cn-tag-pill:hover .cn-tag-remove {
  opacity: 1;
  pointer-events: auto;
}

.cn-tag-empty {
  width: 100%;
  padding: 10px 0 0;
  color: #a0795a;
  text-align: center;
}

.cn-cache-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .cn-column-settings {
    grid-template-columns: 1fr;
  }

  .cn-book-row,
  .cn-input-row {
    align-items: stretch;
    flex-direction: column;
  }

  .cn-book-actions {
    justify-content: flex-start;
  }
}
</style>
