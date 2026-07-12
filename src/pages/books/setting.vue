<template>
  <div class="setting-page">
    <div class="setting-container">
      <div class="setting-header">
        <el-button type="primary" @click="goBack">
          <el-icon>
            <ArrowLeft />
          </el-icon>
          返回
        </el-button>
        <h2 class="setting-title">设置</h2>
      </div>

      <el-card shadow="hover" class="setting-card">
        <el-form label-width="120px" label-position="right">
          <el-form-item label="正文字号">
            <div class="rate-wrapper">
              <el-slider v-model="bodyFontSize" :min="14" :max="60" :step="1" :show-tooltip="true"
                :format-tooltip="formatFontTooltip" show-input input-size="small" />
              <span class="rate-value">{{ bodyFontSize }}px</span>
            </div>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useProjectsStore } from '../../stores/projects.js'
import { STORAGE_KEYS } from '../../types/index.js'

const router = useRouter()
const projectsStore = useProjectsStore()

const bodyFontSize = ref(
  normalizeBodyFontSize(localStorage.getItem(STORAGE_KEYS.BODY_FONT_SIZE))
)

const formatFontTooltip = (val) => {
  return `${val}px`
}

function normalizeBodyFontSize(size) {
  return Math.min(Math.max(Number(size) || 18, 14), 60)
}

const goBack = () => {
  const active = projectsStore.getActiveProject()
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push(`/books/${active?.index || '001'}`)
  }
}

watch(bodyFontSize, (newVal) => {
  const normalized = normalizeBodyFontSize(newVal)
  if (normalized !== newVal) {
    bodyFontSize.value = normalized
    return
  }
  localStorage.setItem(STORAGE_KEYS.BODY_FONT_SIZE, String(normalized))
})
</script>

<style scoped>
.setting-page {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 40px 20px;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.setting-container {
  width: 500px;
  max-width: 100%;
}

.setting-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.setting-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.setting-card {
  border-radius: 12px;
}

.setting-card :deep(.el-card__body) {
  padding: 30px 40px;
}

.rate-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
}

.rate-wrapper .el-slider {
  flex: 1;
}

.rate-value {
  min-width: 48px;
  text-align: center;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-button) {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>