<template>
    <div class="test-settings-page">
        <header class="settings-header">
            <div class="settings-title-wrap">
                <el-button type="primary" @click="goBack">
                    <el-icon>
                        <ArrowLeft />
                    </el-icon>
                    返回
                </el-button>
                <h2 class="settings-title">测试设置</h2>
            </div>
        </header>

        <section class="settings-card">
            <div class="card-header">
                <label class="field-label">功能开关</label>
            </div>
            <div class="card-body">
                <div class="setting-item">
                    <div class="setting-info">
                        <span class="setting-name">纠错功能</span>
                        <span class="setting-desc">在错误列表中显示纠错按钮，可将错误单词标记为正确</span>
                    </div>
                    <el-switch v-model="markCorrectEnabled" />
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <span class="setting-name">显示发音</span>
                        <span class="setting-desc">测试答题时是否显示发音按钮，支持听音答题</span>
                    </div>
                    <el-switch v-model="pronunciationEnabled" />
                </div>
            </div>
        </section>
    </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useSettingsStore } from '../../stores/settings.js'

const router = useRouter()
const settingsStore = useSettingsStore()

const markCorrectEnabled = ref(settingsStore.testEnableMarkCorrect)
const pronunciationEnabled = ref(settingsStore.testShowPronunciation)

let skipSave = false

watch(() => settingsStore.testEnableMarkCorrect, (v) => {
    skipSave = true
    markCorrectEnabled.value = v
    skipSave = false
})
watch(() => settingsStore.testShowPronunciation, (v) => {
    skipSave = true
    pronunciationEnabled.value = v
    skipSave = false
})

watch(markCorrectEnabled, async (v) => {
    if (skipSave) return
    await settingsStore.saveTestEnableMarkCorrect(v)
})

watch(pronunciationEnabled, async (v) => {
    if (skipSave) return
    await settingsStore.saveTestShowPronunciation(v)
})

function goBack() {
    if (window.history.length > 1) {
        router.back()
    } else {
        router.push('/vocabulary/test')
    }
}

onMounted(() => {
    settingsStore.ensureLoaded()
})
</script>

<style scoped>
.test-settings-page {
    min-height: 100vh;
    padding: 28px;
    background: linear-gradient(135deg, #eef4f1 0%, #f8f7f2 48%, #edf1f8 100%);
}

.settings-header {
    max-width: 1000px;
    margin: 0 auto 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.settings-title-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
}

.settings-title {
    margin: 0;
    color: #16201f;
    font-size: 22px;
    font-weight: 800;
}

.settings-card {
    max-width: 1000px;
    margin: 0 auto 14px;
    border: 1px solid #d7dfdc;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
}

.card-header {
    padding: 14px 20px;
    border-bottom: 1px solid #edf1ef;
}

.field-label {
    color: #16201f;
    font-size: 15px;
    font-weight: 800;
}

.card-body {
    padding: 8px 20px 12px;
}

.setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid #f0f4f2;
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.setting-name {
    color: #16201f;
    font-size: 15px;
    font-weight: 700;
}

.setting-desc {
    color: #8c9996;
    font-size: 13px;
}
</style>
