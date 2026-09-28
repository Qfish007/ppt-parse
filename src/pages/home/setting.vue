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
          <el-form-item label="语速">
            <div class="rate-wrapper">
              <el-slider v-model="speechRate" :min="0.6" :max="1.2" :step="0.05" :show-tooltip="true"
                :format-tooltip="formatTooltip" show-input input-size="small" />
              <span class="rate-value">{{ speechRate.toFixed(2) }}</span>
            </div>
          </el-form-item>

          <el-form-item label="发音平台">
            <el-select v-model="voiceProvider" placeholder="请选择发音平台" style="width: 100%">
              <el-option label="有道" value="youdao" />
              <el-option label="百度" value="baidu" />
              <el-option label="浏览器" value="browser" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="hover" class="setting-card cache-card">
        <div class="cache-section">
          <h3 class="cache-title">数据管理</h3>
          <div class="cache-desc">将当前 SQLite 数据库导出到本地文件，可用于备份或迁移。</div>
          <el-button type="primary" :loading="exporting" @click="exportDatabase">导出数据库</el-button>
          <div class="cache-desc">从本地 .sqlite 文件导入数据库，将覆盖当前所有数据，此操作不可撤销。</div>
          <el-button type="warning" :loading="importing" @click="triggerImport">导入数据库</el-button>
          <input ref="fileInputRef" type="file" accept=".sqlite,.db,application/octet-stream" class="hidden-input" @change="handleFileSelect" />
          <div class="cache-desc">清除本地所有数据缓存，包括生词本、设置、翻译缓存等。此操作不可撤销。</div>
          <el-button type="danger" @click="clearCache">清除缓存</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSettingsStore } from '../../stores/settings.js'
import { db, DB_NAME } from '../../db/database.js'
import { ensureReady, rawDb, importDb, clearDb } from '../../db/sqlite.js'

const router = useRouter()
const settingsStore = useSettingsStore()

const speechRate = ref(0.9)
const voiceProvider = ref('youdao')
const exporting = ref(false)
const importing = ref(false)
const fileInputRef = ref(null)

onMounted(async () => {
  await settingsStore.load()
  speechRate.value = settingsStore.speechRate
  voiceProvider.value = settingsStore.voiceProvider
})

const formatTooltip = (val) => {
  return val.toFixed(2)
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/home')
  }
}

watch(speechRate, (newVal) => {
  settingsStore.saveRate(newVal)
})

watch(voiceProvider, (newVal) => {
  settingsStore.saveProvider(newVal)
})

async function clearCache() {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有本地数据缓存吗？此操作将删除生词本、设置、翻译缓存等所有数据，且不可撤销！',
      '清除缓存',
      {
        confirmButtonText: '确认清除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    )

    // 清除当前 SQLite + OPFS 数据（主存储）
    await clearDb()
    // 兼容性清除：旧的 Dexie/IndexedDB 残留数据
    try { await db.delete() } catch {}
    localStorage.clear()

    ElMessage.success('缓存已清除，页面将自动刷新')

    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch {
    // 用户取消
  }
}

async function exportDatabase() {
  if (exporting.value) return
  exporting.value = true
  try {
    await ensureReady()
    const sqliteDb = rawDb()
    if (!sqliteDb) {
      ElMessage.error('数据库未初始化')
      return
    }
    const data = sqliteDb.export()
    const blob = new Blob([data], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`
    a.download = `app-${stamp}.sqlite`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出数据库 (${data.length} bytes)`)
  } catch (err) {
    console.error('导出数据库失败:', err)
    ElMessage.error('导出数据库失败')
  } finally {
    exporting.value = false
  }
}

function triggerImport() {
  if (importing.value) return
  fileInputRef.value?.click()
}

async function handleFileSelect(e) {
  const input = e.target
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    await ElMessageBox.confirm(
      `确定要从文件「${file.name}」导入数据库吗？这将覆盖当前所有数据，且不可撤销！`,
      '导入数据库',
      {
        confirmButtonText: '确认导入',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    )
  } catch {
    return
  }

  importing.value = true
  try {
    const buffer = await file.arrayBuffer()
    await importDb(new Uint8Array(buffer))
    ElMessage.success('数据库已导入，页面将自动刷新')
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (err) {
    console.error('导入数据库失败:', err)
    ElMessage.error('导入数据库失败：' + (err?.message || '文件格式错误'))
  } finally {
    importing.value = false
  }
}
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

.cache-card {
  margin-top: 16px;
}

.cache-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cache-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.cache-desc {
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>