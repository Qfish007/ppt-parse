<template>
  <div class="project-sidebar">
    <div class="project-header">
      <h2 class="project-title">📚 我的书籍</h2>
      <el-button type="primary" size="small" :icon="Plus" @click="openAddDialog">添加</el-button>
    </div>

    <!-- 项目列表 -->
    <div class="project-list">
      <div
        v-for="project in projectsStore.projects"
        :key="project.id"
        class="project-item"
        :class="{ active: project.id === projectsStore.activeProjectId }"
        @click="selectProject(project.id)"
      >
        <div class="project-index">{{ project.index }}</div>
        <div class="project-icon">
          <el-icon v-if="project.type === 'default'" :size="18"><Reading /></el-icon>
          <el-icon v-else-if="project.type === 'pdf'" :size="18"><Document /></el-icon>
          <el-icon v-else-if="project.type === 'image'" :size="18"><Picture /></el-icon>
          <el-icon v-else-if="project.type === 'word'" :size="18"><DocumentCopy /></el-icon>
          <el-icon v-else :size="18"><Files /></el-icon>
        </div>
        <div class="project-info">
          <div class="project-name">{{ project.name }}</div>
          <div class="project-meta">
            <span v-if="project.type === 'default'">内置书籍</span>
            <template v-else>
              <span>{{ typeLabel(project.type) }}</span>
              <template v-if="project.pageCount"> · {{ project.pageCount }} 页</template>
            </template>
          </div>
        </div>
        <div class="project-actions" v-if="project.deletable !== false">
          <el-button
            text
            size="small"
            @click.stop="deleteProject(project.id)"
            :icon="Delete"
            title="删除"
          />
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
            <el-input
              v-model="formData.name"
              placeholder="请输入项目名称"
              size="large"
              @keyup.enter="confirmAdd"
              ref="nameInputRef"
            />
            <label class="form-label" style="margin-top: 20px">项目类型</label>
            <div class="type-options">
              <div
                v-for="opt in typeOptions"
                :key="opt.value"
                class="type-option"
                :class="{ active: formData.type === opt.value }"
                @click="formData.type = opt.value"
              >
                <el-icon :size="24"><component :is="opt.icon" /></el-icon>
                <span>{{ opt.label }}</span>
              </div>
            </div>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Delete, Document, Picture, DocumentCopy,
  Reading, Files
} from '@element-plus/icons-vue'
import { useProjectsStore } from '../stores/projects.js'
import { useBookStore } from '../stores/book.js'

const projectsStore = useProjectsStore()
const bookStore = useBookStore()

const nameInputRef = ref(null)
const dialogVisible = ref(false)

const formData = reactive({
  name: '',
  type: 'pdf'
})

const typeOptions = [
  { value: 'pdf', label: 'PDF', icon: Document },
  { value: 'image', label: '图片', icon: Picture },
  { value: 'word', label: 'Word', icon: DocumentCopy }
]

function typeLabel(type) {
  const map = { pdf: 'PDF', image: '图片', word: 'Word' }
  return map[type] || type
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

  projectsStore.addProject({
    name: formData.name.trim(),
    type: formData.type,
    status: 'empty'
  })
  projectsStore.setActiveProject(projectsStore.projects[projectsStore.projects.length - 1].id)
  dialogVisible.value = false
  ElMessage.success(`项目「${formData.name.trim()}」已创建，请在右侧上传文件`)
}

function selectProject(id) {
  projectsStore.setActiveProject(id)
  const project = projectsStore.getActiveProject()
  if (!project) return

  if (project.id === 'default-book') {
    bookStore.loadBook()
  } else if (project.parsedData) {
    // 已有解析数据，加载
    bookStore.book = bookStore.normalizeBook(project.parsedData)
    bookStore.currentIndex = 0
  } else {
    // 未解析的项目，清空 bookStore 避免显示旧数据
    bookStore.book = null
    bookStore.currentIndex = 0
  }
}

async function deleteProject(id) {
  try {
    await ElMessageBox.confirm('确定要删除这个项目吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    projectsStore.removeProject(id)
    ElMessage.success('已删除')
    const active = projectsStore.getActiveProject()
    if (active?.id === 'default-book') {
      bookStore.loadBook()
    } else if (active?.parsedData) {
      bookStore.book = bookStore.normalizeBook(active.parsedData)
      bookStore.currentIndex = 0
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
  padding: 12px 16px;
  border-bottom: 1px solid #e3e9e6;
  flex-shrink: 0;
}

.project-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #16201f;
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

.project-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #f6f9f8;
  color: #8c9996;
  flex-shrink: 0;
}

.project-item.active .project-icon {
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
  font-size: 11px;
  color: #8c9996;
  margin-top: 2px;
}

.project-actions {
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.project-item:hover .project-actions {
  opacity: 1;
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
  from { opacity: 0; }
  to { opacity: 1; }
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
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
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
</style>
