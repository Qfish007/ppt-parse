<template>
  <div class="project-sidebar">
    <div class="project-header">
      <h2 class="project-title">📚 我的书籍</h2>
      <div class="project-header-actions">
        <el-button type="primary" size="small" :icon="Plus" @click="openAddDialog">添加</el-button>
      </div>
    </div>

    <!-- 项目列表 -->
    <div class="project-list">
      <div v-for="project in projectsStore.projects" :key="project.id" class="project-item"
        :class="{ active: project.id === projectsStore.activeProjectId }" @click="selectProject(project.id)">
        <div class="project-index">{{ project.index }}</div>
        <div class="project-info">
          <div class="project-name">{{ project.name }}</div>
          <div class="project-meta">
            <span class="project-type-text">
              <template v-if="project.type === 'default'">内置书籍</template>
              <template v-else>
                <span>{{ typeLabel(project.type) }}</span>
                <template v-if="project.pageCount"> · {{ project.pageCount }} 页</template>
              </template>
            </span>
            <span class="project-actions">
              <el-button text size="small" @click.stop="importProject" :icon="Upload" title="导入" />
              <el-button text size="small" @click.stop="exportProject(project)" :icon="Download" title="导出" />
              <el-button v-if="project.deletable !== false" text size="small" @click.stop="deleteProject(project.id)"
                :icon="Delete" title="删除" />
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加项目弹窗：只填名称+类型，置顶显示 -->
    <Teleport to="body">
      <div v-if="dialogVisible" class="dialog-overlay" @click.self="dialogVisible = false">
        <div class="dialog-card">
          <div class="dialog-header">
            <h3>添加新项目</h3>
            <button type="button" class="dialog-close" @click="dialogVisible = false">&times;</button>
          </div>
          <div class="dialog-body">
            <label class="form-label">项目名称</label>
            <el-input v-model="formData.name" placeholder="请输入项目名称" size="large" @keyup.enter="confirmAdd"
              ref="nameInputRef" />
            <label class="form-label" style="margin-top: 20px">项目类型</label>
            <el-select v-model="formData.type" placeholder="请选择项目类型" size="large" style="width: 100%"
              :teleported="false" :popper-append-to-body="false" popper-class="add-project-select-dropdown">
              <el-option v-for="opt in typeOptions" :key="opt.value" :value="opt.value" :label="opt.label">
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                  <el-icon :size="16">
                    <component :is="opt.icon" />
                  </el-icon>
                  <span>{{ opt.label }}</span>
                </span>
              </el-option>
            </el-select>
          </div>
          <div class="dialog-footer">
            <el-button size="large" @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" size="large" @click="confirmAdd">确认添加</el-button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Delete, Document, Picture, DocumentCopy,
  ChatDotRound, Edit, Upload, Download
} from '@element-plus/icons-vue'
import { isTranslationProject, translationTypeLabel } from '../../utils/translation.js'
import { useProjectsStore } from '../../stores/projects.js'

const projectsStore = useProjectsStore()
const router = useRouter()

const nameInputRef = ref(null)
const dialogVisible = ref(false)

const formData = reactive({
  name: '',
  type: 'pdf'
})

const typeOptions = [
  { value: 'pdf', label: 'PDF', icon: Document },
  { value: 'image', label: '图片', icon: Picture },
  { value: 'word', label: 'Word', icon: DocumentCopy },
  { value: 'translate-en', label: '英文翻译', icon: ChatDotRound },
  { value: 'translate-zh', label: '中文翻译', icon: Edit }
]

function typeLabel(type) {
  const map = { pdf: 'PDF', image: '图片', word: 'Word' }
  if (map[type]) return map[type]
  if (isTranslationProject(type)) return translationTypeLabel(type)
  return type
}

function openAddDialog() {
  formData.name = ''
  formData.type = 'pdf'
  dialogVisible.value = true
  nextTick(() => nameInputRef.value?.focus())
}

function confirmAdd() {
  if (!formData.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  if (!formData.type) {
    ElMessage.warning('请选择项目类型')
    return
  }

  const project = projectsStore.addProject({
    name: formData.name.trim(),
    type: formData.type,
    status: 'empty'
  })
  projectsStore.setActiveProject(project.id)
  router.push(`/books/${project.index}`)
  dialogVisible.value = false
  ElMessage.success(`项目「${formData.name.trim()}」已创建，请在右侧上传文件`)
}

function selectProject(id) {
  const project = projectsStore.projects.find(item => item.id === id)
  if (!project) return
  projectsStore.setActiveProject(project.id)
  router.push(`/books/${project.index}`)
}

function safeExportName(name) {
  return String(name || '书籍')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || '书籍'
}

function dataUrlToAsset(dataUrl, fallbackName = 'file') {
  const match = String(dataUrl || '').match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.*)$/)
  if (!match) return null
  return {
    filename: fallbackName,
    mime: match[1] || 'application/octet-stream',
    base64: match[2]
  }
}

function assetFetchPath(ref, project) {
  if (ref.startsWith('./images/')) return `/static/demo${project.index}/images/${encodeURIComponent(ref.slice('./images/'.length))}`
  if (ref.startsWith('images/')) return `/static/demo${project.index}/images/${encodeURIComponent(ref.slice('images/'.length))}`
  return ref
}

async function fetchPathAsAsset(ref, project, fallbackName = 'file') {
  const path = assetFetchPath(ref, project)
  const res = await fetch(path)
  if (!res.ok) throw new Error(`资源读取失败：${path}`)
  const blob = await res.blob()
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  return {
    filename: decodeURIComponent(path.split('/').pop() || fallbackName),
    mime: blob.type || 'application/octet-stream',
    base64
  }
}

async function collectProjectAssets(project) {
  const refs = new Map()
  const addRef = (ref, filename) => {
    if (typeof ref !== 'string' || !ref) return
    refs.set(ref, filename || decodeURIComponent(ref.split('/').pop() || 'file'))
  }

    ; (project.files || []).forEach(file => {
      addRef(file.path, file.name)
      addRef(file.dataUrl, file.name)
    })
    ; (project.parsedData?.pages || []).forEach((page, index) => {
      addRef(page.image, `page-${String(index + 1).padStart(3, '0')}.png`)
    })

  const assets = {}
  for (const [ref, filename] of refs.entries()) {
    if (ref.startsWith('data:')) {
      const asset = dataUrlToAsset(ref, filename)
      if (asset) assets[ref] = asset
    } else if (ref.startsWith('/static/') || ref.startsWith('./images/') || ref.startsWith('images/')) {
      assets[ref] = await fetchPathAsAsset(ref, project, filename)
    }
  }
  return assets
}

async function buildExportProject(project) {
  const exportProject = {
    name: project.name,
    type: project.type,
    source: project.source,
    pageCount: project.pageCount,
    files: project.files || [],
    parsedData: project.parsedData || null,
    status: project.status || 'empty'
  }

  if (project.type === 'default' && !exportProject.parsedData) {
    const res = await fetch(`/api/parse-result/${project.index}`)
    if (res.ok) {
      exportProject.parsedData = await res.json()
      exportProject.pageCount = exportProject.parsedData?.pages?.length || exportProject.pageCount
      exportProject.status = 'ready'
    }
  }

  return exportProject
}

async function exportProject(project) {
  try {
    const exportProject = await buildExportProject(project)
    const payload = {
      schema: 'bilingual-reader-project',
      version: 1,
      exportedAt: new Date().toISOString(),
      project: exportProject,
      assets: await collectProjectAssets({ ...project, ...exportProject })
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${safeExportName(project.name)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出「${project.name}」`)
  } catch (error) {
    ElMessage.error(`导出失败：${error.message || '请稍后重试'}`)
  }
}

function readImportFile(file) {
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

async function uploadImportedAsset(index, type, asset) {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      index,
      type,
      filename: asset.filename || 'file',
      fileData: asset.base64
    })
  })
  const result = await res.json()
  if (!result.success) throw new Error(result.error || '资源写入失败')
  return result
}

function replaceAssetRefs(value, pathMap) {
  if (typeof value === 'string') return pathMap.get(value) || value
  if (Array.isArray(value)) return value.map(item => replaceAssetRefs(item, pathMap))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceAssetRefs(item, pathMap)]))
  }
  return value
}

async function importProject() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json,.json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const payload = await readImportFile(file)
      if (payload.schema !== 'bilingual-reader-project' || !payload.project?.name) {
        throw new Error('不支持的导入文件')
      }

      const rawProject = payload.project
      const project = projectsStore.addProject({
        name: rawProject.name,
        type: rawProject.type || 'image',
        source: 'import',
        status: 'importing'
      })

      const pathMap = new Map()
      for (const [ref, asset] of Object.entries(payload.assets || {})) {
        if (!asset?.base64) continue
        const uploadType = rawProject.type === 'image' ? 'image' : rawProject.type
        const result = await uploadImportedAsset(project.index, uploadType, asset)
        pathMap.set(ref, result.path)
      }

      const files = replaceAssetRefs(rawProject.files || [], pathMap)
      const parsedData = replaceAssetRefs(rawProject.parsedData || null, pathMap)
      const pageCount = parsedData?.pages?.length || files.length || rawProject.pageCount || 0
      const updatedProject = projectsStore.updateProject(project.id, {
        name: rawProject.name,
        type: rawProject.type || 'image',
        files,
        parsedData,
        pageCount,
        status: pageCount ? 'ready' : (rawProject.status || 'empty')
      })

      projectsStore.setActiveProject(project.id)
      router.push(`/books/${updatedProject.index}`)
      ElMessage.success(`已导入「${updatedProject.name}」`)
    } catch (error) {
      ElMessage.error(`导入失败：${error.message || '请检查文件后重试'}`)
    }
  }
  input.click()
}

async function deleteProject(id) {
  try {
    await ElMessageBox.confirm('确定要删除这个项目吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const wasActive = projectsStore.activeProjectId === id
    projectsStore.removeProject(id)
    ElMessage.success('已删除')
    if (wasActive) {
      const active = projectsStore.getActiveProject()
      if (active?.index) router.push(`/books/${active.index}`)
    }
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.project-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
}

.project-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e3e9e6;
  flex-shrink: 0;
}

.project-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #16201f;
  min-width: 0;
  white-space: nowrap;
}

.project-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  flex-shrink: 0;
}

.project-header-actions :deep(.el-button) {
  margin-left: 0;
}

.project-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.project-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 4px;
}

.project-item:hover {
  background: #f0f4f3;
}

.project-item.active {
  background: #e8f2ef;
  border: 1px solid #126b62;
}

.project-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 24px;
  border-radius: 4px;
  background: #eef4f1;
  color: #126b62;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  flex-shrink: 0;
}

.project-item.active .project-index {
  background: #126b62;
  color: #fff;
}

.project-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.project-name {
  font-size: 13px;
  font-weight: 600;
  color: #16201f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #8c9996;
  margin-top: 2px;
  min-height: 22px;
}

.project-type-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.project-actions :deep(.el-button) {
  width: 20px;
  height: 20px;
  padding: 0;
}

.project-item:hover .project-actions {
  opacity: 1;
  pointer-events: auto;
}
</style>

<!-- 弹窗样式不使用 scoped，确保 Teleport 到 body 后生效 -->
<style>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.dialog-card {
  width: 460px;
  max-width: 92vw;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #16201f;
}

.dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #8c9996;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s;
}

.dialog-close:hover {
  background: #f0f4f3;
  color: #16201f;
}

.dialog-body {
  padding: 20px 24px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #40504c;
  margin-bottom: 8px;
}

.type-options {
  display: flex;
  gap: 12px;
}

.type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 2px solid #e3e9e6;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  color: #8c9996;
}

.type-option:hover {
  border-color: #b0c4be;
  color: #126b62;
  background: #f0f4f3;
}

.type-option.active {
  border-color: #126b62;
  color: #126b62;
  background: #e8f2ef;
}

.type-option span {
  font-size: 13px;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 24px 20px;
}

/* ============ el-select 下拉不被 dialog 遮罩 ============ */
/* 1) 防止 dialog 祖先裁剪（下拉不 teleport 时）*/
.dialog-overlay,
.dialog-card,
.dialog-body {
  overflow: visible !important;
}

/* 2) 非 teleported 下拉（在 dialog 内部）提高层级避免被内部裁剪 */
.add-project-select-dropdown {
  z-index: 3200 !important;
}

/* 3) 兜底：直接 teleport 到 body 的 Element Plus 下拉/popper，z-index 必须 > dialog-overlay 的 3000 */
body>.el-select-dropdown,
body>.el-popper.el-select-dropdown,
body>.el-overlay-popper,
body>.el-popper {
  z-index: 3200 !important;
}
</style>