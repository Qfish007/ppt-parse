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
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { STORAGE_KEYS } from '../../types/index.js'

const router = useRouter()

const speechRate = ref(
  parseFloat(localStorage.getItem(STORAGE_KEYS.RATE)) || 0.9
)
const voiceProvider = ref(
  localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'youdao'
)

const formatTooltip = (val) => {
  return val.toFixed(2)
}

const goBack = () => {
  router.push('/home')
}

watch(speechRate, (newVal) => {
  localStorage.setItem(STORAGE_KEYS.RATE, newVal.toString())
})

watch(voiceProvider, (newVal) => {
  localStorage.setItem(STORAGE_KEYS.PROVIDER, newVal)
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